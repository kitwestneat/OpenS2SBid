var Promise = require("bluebird");
var ssb_utils = require("./ssb_utils");

var config = require('./local/config');

var debug = false;

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
		};

		if (breq.site) {
			bid.site = {
				domain: breq.site.domain,
				page: breq.site.page,
				ref: breq.site.ref,
			}
		}

		if (breq.device) {
			bid.device = {
				ua: breq.device.ua,
				ip: breq.device.ip,
			}
		}

		if (breq.user)
			bid.user = { id: breq.user.id };

		var get_ext = function(obj, field) {
			return obj && obj.ext && obj.ext[provider] && obj.ext[provider][field];
		};

		for (var i = 0; i < breq.imp.length; i++) {
			var imp = breq.imp[i];
			var remote_tagid = get_ext(imp, 'tagid');

			if (!remote_tagid)
				continue;

			//console.log("impid: " + imp.id + " tagid: " + imp.tagid);

			// imp.tagid is local (pub) placement id, imp.ext.provider.tagid is remote placement id
			var bid_imp = {
				id: imp.id,
				banner: {
					w: imp.banner.w,
					h: imp.banner.h,
				},
				tagid: remote_tagid,
				ext: {
					local_tagid: imp.tagid
				}
			};

			var floor = get_ext(imp, 'bidfloor') || imp.bidfloor;
			if (floor)
				bid_imp.bidfloor = floor;

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
	bid: function(breq, bid_headers) {
		var adapter_promises = [];

		// the max bid for each placement (tagid)
		var max_bids = {};

		var cookies = {};
		if (bid_headers.cookie)
			bid_headers.cookie.split(";").forEach(function(c) {
				var k_v = c.split("=");
				if (k_v.length > 1)
					cookies[k_v[0].trim()] = k_v[1].trim();
			});
		//console.log("cookies", cookies);

		var _ = this;
		var impid_to_bid = {};
		Object.keys(adapters).forEach(function(adapter_alias) {
			var start_time = Date.now();

			if (cookies['p_' + adapter_alias]) {
				if (!breq.user)
					breq.user = {};
				breq.user.id = cookies['p_' + adapter_alias];
			}

			var sbid = _.sanitize_bid(breq, adapter_alias, impid_to_bid);

			if (!sbid) {
				// no placements defined for this adapter in the client request
				if (debug)
					console.log("no sbid: " + adapter_alias);
				return;
			}

			// any state that the adapters might need
			var bid_state = {};
			try {
				var promises = adapters[adapter_alias].bid(sbid, breq, bid_state);
			} catch (e) {
				console.log("adapter " + adapter_alias + " error:" );
				console.log(e);
				return;
			}

			var cpm_round_fn = config.adapters[adapter_alias].cpm_round ||
				config.cpm_round || _.cpm_round;

			// XXX fake sovrn bids since they are just shooting blanks at the moment
			var http_get_fn = ssb_utils.real_http_get;
			switch (adapter_alias) {
				case "sovrn":
					http_get_fn = ssb_utils.fake_sovrn_http_get;
					break;
				case "appnexus":
					http_get_fn = ssb_utils.fake_appnexus_http_get;
					break;
			}
			var http_get;

/*
			try {
			debug = sbid.site.domain.indexOf('pbh2.com') != -1;
			} catch(e) {
				console.log(e);
			}
			*/

			if (sbid.device.ua)
				http_get = function(url) { return http_get_fn(url, { 'User-Agent' : sbid.device.ua }); };
			else
				http_get = http_get_fn;

			// promisify bare urls
			if (typeof promises == "string") {
				promises = [http_get(promises)];
			} else if (Array.isArray(promises) && typeof promises[0] == "string") {
				promises = promises.map(http_get);
			}

			// Promise.all normally shortcircuits on a fail, reflect waits for all promises to settle
			adapter_promises.push(Promise.all(promises.map(function(p) {
					try {
						/* reflect makes promise successful even if it timesout  */
						return p
							   .timeout(bid_timeout)
							   .catch(Promise.TimeoutError, function(e) {
									var time_taken = Date.now() - start_time;
									ssb_utils.log(adapter_alias + ": bid timeout after " + time_taken + " ms");
							   })
							   .reflect();
					} catch(e) {
						console.log("error with ", adapter_alias, e);
					}
				}))
				.then(function(resp) {
					// we got an array of response bodies from http_get
					var time_taken = Date.now() - start_time;
					/*
					ssb_utils.log(adapter_alias + ": bid completed in " +
						time_taken + " ms");
					*/

					// go thru response bodies, convert to openrtb and then find the max one
					resp.forEach(function(p) {
						if (!p.isFulfilled())
							return;

						var p_val = p.value();
						if (debug && adapter_alias == 'pulsepoint')
							console.log('pp resp', p_val);

						if (Array.isArray(p_val))
							p_val = p_val[0];

						if (!p_val)
							return;

						bid_state._url = p_val.url;
						try {
							var bresp = adapters[adapter_alias].process(p_val.body, bid_state);
						} catch(e) {
							console.log(e);
							bresp = { error: e.toString() };
						}

						if (bresp && bresp.error) {
							ssb_utils.log(adapter_alias + ": error: " +
								JSON.stringify(bresp.error));
							return;
						}

						if (!bresp) {
							ssb_utils.log(adapter_alias +
								": error: no response found");
							return;
						}

						if (!bresp.seatbid || !bresp.seatbid.length ||
							!bresp.seatbid[0].bid)
							return;

						// find the highest imp bid for each placement
						for (seat_idx in bresp.seatbid) {
							for (bid_idx in bresp.seatbid[seat_idx].bid) {
								var bid = bresp.seatbid[seat_idx].bid[bid_idx];
								var req_bid = impid_to_bid[bid.impid];
								var tagid = req_bid.ext.local_tagid;

								bid.price = cpm_round_fn(bid.price);

								if (!max_bids[tagid] || bid.price > max_bids[tagid].price) {
									bid.id = adapter_alias + ":" + bid.id;
									if (!bid.ext)
										bid.ext = {};

									// save bidid and seatid for macro expansion
									bid.ext["bidid"] = bresp.bidid;
									bid.ext["seatid"] = bresp.seatbid[seat_idx].seat;

									bid.ext["ssb_tagid"] = tagid;
									bid.ext["ssb_provider"] = adapter_alias;

									bid.w = bid.w || req_bid.banner.w;
									bid.h = bid.h || req_bid.banner.h;

									max_bids[tagid] = bid;
								}
							}
						}
					});
				}));
		});

		// we send the max bid for each placement
		return Promise.all(adapter_promises).then(function() {
			var bids = [];

			for (tag in max_bids) {
				var cur_bid = max_bids[tag];
				if (!cur_bid)
					continue;

				["nurl", "adm"].forEach(function(str_idx) {
					if (!cur_bid[str_idx])
						return;

					cur_bid[str_idx] = cur_bid[str_idx]
						.replace('${AUCTION_ID}', breq.id)
						.replace('${AUCTION_BID_ID}', cur_bid.ext.bidid || '')
						.replace('${AUCTION_IMP_ID}', cur_bid.impid)
						.replace('${AUCTION_SEAT_ID}', cur_bid.ext.seatid || '')
						.replace('${AUCTION_AD_ID}', cur_bid.adid || '')
						.replace('${AUCTION_PRICE}', cur_bid.price)
						.replace('${AUCTION_CURRENCY}', "USD");
					//console.log(cur_bid[str_idx]);

					delete cur_bid.ext.bidid;
					delete cur_bid.ext.seatid;
				});

				bids.push(cur_bid);
			}

			return {
				id: breq.id,
				seatbid: [{bid: bids }],
			};
		});
	},
}
