var bid_url='http://ib.adnxs.com/jpt';
var psa = 0;

// re to convert jsonp to straight json
var re = /^callback\(([\s\S]*)\)$/;
/*
 * 5797696
 * AppNexus logo creative, $4 bid
 * 5797697
 * AppNexus logo creative, $11 bid
 * 5797698
 * AppNexus logo creative, $1 bid
 *
 */
module.exports = {
	bid: function(sbreq, full_breq, size_to_impid) {
		var full_url = bid_url + '?psa=' + psa + '&callback=callback';
        
        size_to_impid["id"] = sbreq.id;

        for (var i = 0; i < full_breq.imp.length; i++) {
            var local_id = full_breq.imp[i].tagid;
            var remote_id = sbreq.imp[i].tagid;
            var placement_id = local_id + '-' + remote_id;

            if (!size_to_impid[placement_id])
                size_to_impid[placement_id] = {sizes: {}, remote_id: remote_id };

            var banner = sbreq.imp[i].banner;
            size_to_impid[placement_id].sizes[banner.w + 'x' + banner.h] = sbreq.imp[i].id;
        }

        var urls = [];
        for (placement_id in size_to_impid) {
            if (placement_id == "id")
                continue;

            var sizes = Object.keys(size_to_impid[placement_id].sizes);
            
            var size_str = '&size='+sizes.shift();
            if (sizes.length > 0)
                size_str += '&promo_sizes=' + sizes.join(',');

            urls.push(full_url + '&callback_uid=' + placement_id +
                      '&id=' + size_to_impid[placement_id].remote_id +
                      size_str);
        }
		console.log(full_url);

		return full_url;
	},
	process: function(body, size_to_impid) {
		var json_str = body.replace(re, '$1');
		var an_resp = JSON.parse(json_str);

        if (!an_resp.result)
            return { error: an_resp };

        var placement_id = an_resp.callback_uid;
        var imp_id = size_to_impid[placement_id].sizes[an_resp.result.width + 'x' + an_resp.result.height];

		return {
            id: size_to_impid['id'],
            seatbid: [{ bid: [{
                id: imp_id,
                impid: imp_id,
                price: an_resp.result.cpm / 100,
                nurl: an_resp.result.ad,
            }] }]
        };
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;
		psa = config.psa || psa;
	},
}
