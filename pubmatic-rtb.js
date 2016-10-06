var utils = require('./ssb_utils');
var extend = require('util')._extend;

var bid_url;
var hostname;

var pub_id;
var site_id;

module.exports = {
	bid: function(in_breq, full_breq) {
        var breq = extend({}, in_breq);

        // pubmatic requires first price auction
        breq.at = 1;

        breq.site = extend({ id: site_id, publisher: { id: pub_id } }, breq.site || {});

        var url = bid_url + '&siteId=' + site_id + '&IntegrationType=openrtb';
        //console.log('url', url);
		//console.log(JSON.stringify(breq, null, 4));

		return [utils.http_post({
			url: url,
			json: true,
			body: breq,
			hostname: hostname,
		})];
	},
	process: function(body) {
		if (!body)
			return;

        if (typeof body == 'string')
            body = JSON.parse(body);

        body.seatbid[0].bid.forEach(function(bid) {
            bid.adm = bid.adm.replace(/{PUBMATIC_SECOND_PRICE}/g, ''+bid.price);
        });

		//console.log('body', JSON.stringify(body, null, 4));
		return body;
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;

		if (typeof bid_url != 'string' && bid_url.hostname) {
			hostname = bid_url.hostname;
			bid_url = bid_url.url;
		}

        pub_id = ""+config.pub_id;
        site_id = ""+config.site_id;
	},
}
