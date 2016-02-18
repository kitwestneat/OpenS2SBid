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
	sanitize_bid: function(breq, provider, impid_to_bid) {
		var bid = {
			id: breq.id,
			imp: [],
			site: {
				domain: (breq.site && breq.site.domain) || '',
				page: (breq.site && breq.site.page) || '',
			}
		};

		var get_ext = function(obj, field) {
			return obj && obj.ext && obj.ext[provider] && obj.ext[provider][field];
		};

		for (var i = 0; i < breq.imp.length; i++) {
			var imp = breq.imp[i];
			var remote_tagid = get_ext(imp, 'tagid');

			if (!remote_tagid)
				continue;

			// imp.tagid is local (pub) placement id, imp.ext.provider.tagid is remote placement id
			console.log("impid: " + imp.id + " tagid: " + imp.tagid);

			var bid_imp = {
				id: imp.id,
				banner: {
					w: imp.banner.w,
					h: imp.banner.h,
				},
				tagid: remote_tagid,
				bidfloor: get_ext(imp, 'bidfloor') || imp.bidfloor,
				ext: { local_tagid: imp.tagid }
			};
			impid_to_bid[imp.id] = bid_imp;
			bid.imp.push(bid_imp);
		}

		if (bid.imp.length == 0)
			return false;

		return bid;
	},
	cpm_round: function(cpm) {
		return cpm; // by default don't round CPM
	},
	bid: function(breq) {
		var adapter_promises = [];

		// the max bid for each placement (tagid)
		var max_bids = {};

		var _ = this;
		var impid_to_bid = {};
		Object.keys(adapters).forEach(function (adapter_alias) {
			var start_time = Date.now();
			var sbid = _.sanitize_bid(breq, adapter_alias, impid_to_bid);

			if (!sbid) {
				// no placements defined for this adapter in the client request
				return;
			}

			// any state that the adapters might need
			var bid_state = {};
			var promises = adapters[adapter_alias].bid(sbid, breq, bid_state);

			var cpm_round_fn = config.adapters[adapter_alias].cpm_round ||
					config.cpm_round || _.cpm_round;

			// XXX fake sovrn bids since they are just shooting blanks at the moment
			var http_get = ssb_utils.real_http_get;
			switch (adapter_alias) {
				case "sovrn": http_get = ssb_utils.fake_sovrn_http_get; break;
				case "appnexus": http_get = ssb_utils.fake_appnexus_http_get; break;
			}

			// promisify bare urls
			if (typeof promises == "string") {
				promises = [ http_get(promises) ];
			} else if (Array.isArray(promises) && typeof promises[0] == "string") {
				promises = promises.map(http_get);
			}

			// Promise.all normally shortcircuits on a fail, reflect waits for all promises to settle
			adapter_promises.push(Promise.all(promises.map(function(p) { return p.reflect(); }))
			.timeout(bid_timeout)
			.then(function( resp) {
				// we got an array of response bodies from http_get
				var time_taken = Date.now() - start_time;
				ssb_utils.log(adapter_alias + ": bid completed in " +
						 time_taken + " ms");

				// go thru response bodies, convert to openrtb and then find the max one
				resp.forEach(function(p) {
					if (!p.isFulfilled())
						return false;

					var p_val = p.value();
					bid_state._url = p_val.url;
					var bresp = adapters[adapter_alias].process(p_val.body, bid_state);

					if (bresp && bresp.error) {
						ssb_utils.log(adapter_alias + ": error: " +
								JSON.stringify(bresp.error));
						return false;
					}

					if (!bresp) {
						ssb_utils.log(adapter_alias +
							": error: no response found");
						return false;
					}

					if (!bresp.seatbid || !bresp.seatbid.length ||
							!bresp.seatbid[0].bid)
						return false;

					// find the highest imp bid for each placement
					for (seat in bresp.seatbid) {
						for (bid_idx in bresp.seatbid[seat].bid) {
							var bid = bresp.seatbid[seat].bid[bid_idx];
							var req_bid = impid_to_bid[bid.impid];
							var tagid = req_bid.ext.local_tagid;

							bid.price = cpm_round_fn(bid.price);

							if (!max_bids[tagid] || bid.price > max_bids[tagid].price) {
								bid.id = adapter_alias + ":" + bid.id;
								if (!bid.ext) 
									bid.ext = {};
								bid.ext["ssb_tagid"] = tagid;
								bid.w = bid.w || req_bid.banner.w;
								bid.h = bid.h || req_bid.banner.h;
								
								max_bids[tagid] = bid;
							}
						}
					}
				});
			}).catch(Promise.TimeoutError, function(e) {
				var time_taken = Date.now() - start_time;
				ssb_utils.log(adapter_alias + ": bid timeout after " + time_taken + " ms");
			}));
		});

		// caller only wants the max bid for each placement
		return Promise.all(adapter_promises).then(function() {
			var seatbids = [];

			for (tag in max_bids)
				seatbids.push(max_bids[tag]);

			return {
				id: breq.id,
				seatbid: seatbids,
			};
		});
	},
}
