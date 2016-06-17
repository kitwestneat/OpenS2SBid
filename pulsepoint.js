var Promise = require("bluebird");
var utils = require('./ssb_utils');
var bid_url;
var hostname;
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
	//console.log("req_cnt", req_count, "qps", qps_limit, req_start);
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

		breq.tmax = 500;

		// pulsepoint doesn't use tag IDs for s2s
		var all_imps = breq.imp;
		var promises = [];
		var start = utils.ts();
		all_imps.forEach(function(i) {
			delete i.tagid;

			breq.id++;
			breq.imp = [i];
			//console.log(breq.id, "sent at", start);
			var opts = { url: bid_url, json: true, body: breq };
			if (hostname)
				opts['headers'] = { 'Host': hostname };

			//console.log("impid", i.id);
			var p = utils.http_post(opts);
			//p.then(function(id) { console.log(id, "received in", utils.ts() - start )}.bind(this, breq.id));
			promises.push(p.timeout(800).catch(Promise.TimeoutError, function(e) {
					console.log("timeout!");
				}));
		});

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

		if (typeof bid_url != 'string' && bid_url.hostname) {
			hostname = bid_url.hostname;
			bid_url = bid_url.url;
		}

		qps_limit = config.qps_limit;
	},
}
