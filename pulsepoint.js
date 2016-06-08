var Promise = require("bluebird");
var utils = require('./ssb_utils');
var bid_url;
var qps_limit;

var req_count;
var req_start;

var req_reset = function() {
	req_count = 0;
	req_start = utils.ts();
};
req_reset();

var req_limiter = function(imp_cnt) {
	req_count += imp_cnt;
	if (req_count < qps_limit)
		return;

	if (utils.ts() != req_start) {
		req_reset();
		return;
	}

	return [Promise.resolve(false)];
}

module.exports = {
	bid: function(breq, full_breq) {
		if (qps_limit) {
			var p = req_limiter(breq.imp.length);

			if (p)
				return p;
		}

		// pulsepoint doesn't use tag IDs for s2s
		var tag_imps = {};
		breq.imp.forEach(function(i) {
			delete i.tagid;
			var tagid = i.ext.local_tagid;
			if (!tag_imps[tagid])
				tag_imps[tagid] = [];

			tag_imps[tagid].push(i);
		});

		var promises = [];
		for (tag in tag_imps) {
			breq.id++;
			breq.imp = tag_imps[tag];
			var p = utils.http_post({ url: bid_url, json: true, body: breq });
			promises.push(p);
		}

		return promises;
	},
	process: function(body) {
		if (!body)
			return {};

		try {
		console.log("seatbid count", body.seatbid.length, "bid lengths", body.seatbid.map(function(s) { return s.bid.length; }));
		} catch(e) {
		}
		return body;
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;
		qps_limit = config.qps_limit;
	},
}
