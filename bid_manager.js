var Promise = require("bluebird");
var ssb_utils  = require("./ssb_utils");

var config = require('./config');

var adapters = {};
var bid_timeout;

/*
 * adapter api:
 * bid(sanitized_bid, full_bid)
 * set_config(config_data)
 * process(response_body)
 */
(function() {
	var adapters_dir = config.adapters_dir || '.';
	bid_timeout = config.bid_timeout;

	for (var adapter_alias in config.adapters) {
		var adapter_name = config.adapters[adapter_alias].adapter || adapter_alias;

		adapters[adapter_alias] = require(adapters_dir + '/' + adapter_name);
		adapters[adapter_alias].set_config(config.adapters[adapter_alias]);
	}
})();

module.exports = {
	sanitize_bid: function(breq, provider, impid_to_tagid) {
		var bid = {
			id: breq.id,
			imp: [],
			site: {
				domain: breq.site.domain,
				page: breq.site.page,
			}
		};

		var get_ext = function(obj, field) {
			return obj && obj.ext && obj.ext[provider] && obj.ext[provider][field];
		};

		for (var i = 0; i < breq.imp.length; i++) {
			var imp = breq.imp[i];

			// imp.tagid is local placement, imp.ext.provider.tagid is remote placement
			impid_to_tagid[imp.id] = imp.tagid;

			bid.imp.push({
				id: imp.id,
				banner: {
					w: imp.banner.w,
					h: imp.banner.h,
				},
				tagid: get_ext(imp, 'tagid'),
				bidfloor: get_ext(imp, 'bidfloor') || imp.bidfloor,
			});
		}

		return bid;
	},
	bid: function(breq, callback) {
		var adapter_promises = [];

		// the max bid for each placement (tagid)
		var max_bids = {};

		for (var adapter_alias in adapters) {
			var start_time = Date.now();
			var impid_to_tagid = {};
			var sbid = this.sanitize_bid(breq, adapter_alias, impid_to_tagid);
			var promises = adapters[adapter_alias].bid(sbid, breq);

			// promisify bare urls
			if (typeof promises == "string") {
				promises = [ ssb_utils.http_get(promises) ];
			} else if (Array.isArray(promises) && typeof promises[0] == "string") {
				promises = promises.map(ssb_utils.http_get);
			}

			// all normally shortcircuits on a fail, reflect waits for all promises to settle
			adapter_promises.push(Promise.all(promises.map(function(p) { return p.reflect(); }))
			.timeout(bid_timeout)
			.then(function(resp) {
				// we got an array of response bodies from http_get
				var time_taken = Date.now() - start_time;
				ssb_utils.log(adapter_alias + ": bid completed in " + time_taken + " ms");

				console.log(JSON.stringify(resp, null, 4));

				// go through the response bodies, convert to openrtb and then find the max one
				resp.forEach(function(p) {
					if (!p.isFulfilled())
						return false;

					var bresp = adapters[adapter_alias].process(p.value());

					if (bresp && bresp.error) {
						ssb_utils.log(adapter_alias + ": error: " + JSON.stringify(bresp.error));
						return false;
					}

					if (!bresp) {
						ssb_utils.log(adapter_alias + ": error: no response found");
						return false;
					}
						
					if (!bresp.seatbid || !bresp.seatbid.length || !bresp.seatbid[0].bid)
						return false;

					// find the highest imp bid for each placement
					for (seat in bresp.seatbid) {
						for (bid_idx in bresp.seatbid[seat]) {
							var bid = bresp.seatbid[seat][bid_idx];
							var tagid = impid_to_tagid[bid.impd];

							if (!max_bids[tagid] || bid.price > max_bids[tagid].price)
								max_bids[tagid] = bid;
						}
					}
				});
			}).catch(Promise.TimeoutError, function(e) {
				ssb_utils.log(adapter_alias + ": bid timeout after " + time_taken + " ms");
			}));
		}

		// caller only wants the max bid for each placement
		return Promise.all(adapter_promises).then(function() {
			return max_bids;
		});
	},
}
