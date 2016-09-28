var utils = require('./ssb_utils');

var bid_url;
var hostname;

module.exports = {
	bid: function(breq, full_breq) {
        // pubmatic requires first price auction
        breq.at = 1;

		console.log(JSON.stringify(breq, null, 4));

		return [utils.http_post({
			url: bid_url,
			json: true,
			body: breq,
			hostname: hostname,
		})];
	},
	process: function(body) {
		if (!body)
			return;

		console.log('body', body);
        if (typeof body == 'string')
            body = JSON.parse(body);

		return body;
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;

		if (typeof bid_url != 'string' && bid_url.hostname) {
			hostname = bid_url.hostname;
			bid_url = bid_url.url;
		}
	},
}
