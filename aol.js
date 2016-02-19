var bid_url = 'https://adserver.adtechus.com/pubapi/3.0/';

module.exports = {
	bid: function(breq, full_breq, bid_state) {
		var urls = [];
		bid_state.url_to_impid = {};
		for (var i = 0; i < breq.imp.length; i++) {
			// aol doesn't use any client provided IDs in their response so we need to map the request URL with the imp ID
			var url = bid_url + breq.imp[i].tagid + '/;noperf=1;alias=;cmd=bid;cors=yes;';
			urls.push(url);
			bid_state.url_to_impid[url] = breq.imp[i].id;
		}

		return urls;
	},
	process: function(body, bid_state) {
		var bresp = JSON.parse(body);

		if (!bresp || !bresp.seatbid || !bresp.seatbid[0] || !bresp.seatbid[0].bid || !bresp.seatbid[0].bid[0])
			return false;

		var bid = bresp.seatbid[0].bid[0];
		bid.id = bid.impid;
		bid.impid = bid_state.url_to_impid[bid_state._url];

		return bresp;
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;
	},
}