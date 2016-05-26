var utils = require('./ssb_utils');
var bid_url;

module.exports = {
	bid: function(breq, full_breq) {
		breq.imp.forEach(function(i) {
			delete i.tagid;
		});
		console.log("breq", breq);
		var p = utils.http_post({ url: bid_url, json: true, body: breq });
		return [p];
	},
	process: function(body) {
		console.log('pulsepoint body', JSON.stringify(body, null, 4));
		if (!body)
			return {};

		return body;
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;
	},
}
