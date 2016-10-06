var utils = require('./ssb_utils');

var bid_url;
var hostname;

var pub_id;
var site_id;

function imp_to_pubmatic_param_obj(imp, page_url, client_time, device) {
    var res = '-1x-1';
    if (device.w && device.h)
        res = device.w + 'x' + device.h;

    var vis = 0;
    if (imp.pos == 1) // ATF
        vis = 1;
    else if (imp.pos == 3) //BTF
        vis = 2;

    return {
        operId: 102,
        pubId: pub_id,
        siteId: site_id,
        adId: imp.tagid,
        adType: 9,
        kadheight: imp.banner.h,
        kadwidth: imp.banner.w,
        pageURL: page_url,
        kltstamp: client_time.stamp,
        timezone: client_time.zone,
        screenResolution: res,
        adPosition: '-1x-1',
        inIframe: 1,
        adVisibility: vis,
    };
}

function get_tz() {
    var offset = new Date().getTimezoneOffset();
    var offset_h = offset / -60;
    var offset_m = offset % 60;

    return encodeURIComponent('' + offset_h + '.' + offset_m);
}

function make_url(param_obj) {
    var new_url = bid_url + '?';
    var amp = '';

    for (key in param_obj) {
        new_url += amp + key + '=' + param_obj[key];
        amp = '&';
    }

    return new_url;
}

module.exports = {
	bid: function(breq, full_breq, urls_to_imp_id) {
        if (!pub_id || !site_id || !bid_url)
            return;

        var url_list = [];
        var client_time = full_breq.ext.client_time ||
            { stamp: Date.now(), zone: get_tz() };

		for (var i = 0; i < breq.imp.length; i++) {
            if (!breq.imp[i].tagid)
                continue;
            var param_obj = imp_to_pubmatic_param_obj(breq.imp[i], breq.site.page,
                    client_time, breq.device);
            var url = make_url(param_obj);
            if (urls_to_imp_id[url])
                continue;

            urls_to_imp_id[url] = breq.imp[i].id;
            url_list.push(url);
        }

        //console.log("bid_url", bid_url);
        var headers = {
            'User-Agent': breq.device.ua,
            'Accept-Language': breq.device.language,
            'RLNClientIpAddr': breq.device.ip,
        };
        if (breq.user)
            headers['KADUSERCOOKIE'] = breq.user.id;

		return url_list.map(function(url) {
            var start = Date.now();
            return utils.real_http_get({
                url: url,
                hostname: hostname,
            }, headers).then(function(resp) {
                var end = Date.now();
                //console.log(url);
                return resp;
            });
        });
	},
	process: function(body, urls_to_imp_id) {
		if (!body)
			return;

        var imp_id = urls_to_imp_id[urls_to_imp_id._url];

        if (typeof body == 'string')
            body = JSON.parse(body);

        if (!body["PubMatic_Bid"])
            return {};

        var bid = body["PubMatic_Bid"];

        ///XXX
        if (false && bid.ecpm > 0)
            console.log(bid);

		return {
            id: bid.oid,
            seatbid: [{ bid: [{
                id: bid.oid,
                impid: imp_id,
                price: bid.ecpm,
                adm: bid.creative_tag,
                nurl: bid.tracking_url,
            }] }],
        };
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;

		if (typeof bid_url != 'string' && bid_url.hostname) {
			hostname = bid_url.hostname;
			bid_url = bid_url.url;
		}
        pub_id = config.pub_id;
        site_id = config.site_id;
	},
}
