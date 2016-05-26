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

var req_limiter = function() {
	req_count++;
	if (req_count < qps_limit)
		return;

	if (utils.ts() != req_start) {
		if (req_count > qps_limit)
			console.log("pulsepoint adapter max qps limit", req_count, qps_limit);
		req_reset();
		return;
	}

	if (req_count == qps_limit)
		console.log("pulsepoint adapter hit qps limit", req_count, qps_limit);

	return Promise.resolve(null);
}

module.exports = {
	bid: function(breq, full_breq) {
		if (qps_limit) {
			var p = req_limiter();

			if (p)
				return p;
		}

		// pulsepoint doesn't use tag IDs for s2s
		breq.imp.forEach(function(i) {
			delete i.tagid;
		});

		var p = utils.http_post({ url: bid_url, json: true, body: breq });
		return [p];
	},
	process: function(body) {
		if (!body)
			return {};

		return body;
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;
		qps_limit = config.qps_limit;
	},
}
