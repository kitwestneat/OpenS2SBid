var utils = require('./ssb_utils');
var bid_url;

module.exports = {
	bid: function(breq, full_breq) {
		console.log('pulsepoint');
		var p = utils.http_post({ url: bid_url, json: true, body: breq });
		console.log(p);
		return [p];
	},
	process: function(body) {
		console.log("pulespoint resp", body);
		return JSON.parse(body);
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;
	},
}
