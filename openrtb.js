var bid_url;

// re to convert jsonp to straight json
var re = /^callback\(([\s\S]*)\)$/;

module.exports = {
	bid: function(breq, full_breq) {
		var full_url = bid_url + '?br=' + JSON.stringify(breq);
		console.log(full_url);

		return full_url;
	},
	process: function(body) {
		var json_str = body.replace(re, '$1');
		var bresp = JSON.parse(json_str);

		return bresp;
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;
	},
}
