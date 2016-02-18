var bid_url='http://ib.adnxs.com/jpt';
var psa = 0;

// re to convert jsonp to straight json
var re = /^callback\(([\s\S]*)\);*$/;
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

		for (var i = 0; i < sbreq.imp.length; i++) {
            var imp = sbreq.imp[i];
			var local_id = imp.ext.local_tagid;
			var remote_id = imp.tagid;
			var placement_id = local_id + '-' + remote_id;

			if (!size_to_impid[placement_id])
				size_to_impid[placement_id] = {sizes: {}, remote_id: remote_id };

			var banner = imp.banner;
			size_to_impid[placement_id].sizes[banner.w + 'x' + banner.h] = imp.id;
		}

		var urls = [];
		for (placement_id in size_to_impid) {
            console.log('lacement:' + placement_id);
			if (placement_id == "id")
				continue;

			var sizes = Object.keys(size_to_impid[placement_id].sizes);

			var size_str = '&size='+sizes.shift();
			if (sizes.length > 0)
				size_str += '&promo_sizes=' + sizes.join(',');

			urls.push(full_url + '&callback_uid=' + encodeURIComponent(placement_id) +
					  '&id=' + size_to_impid[placement_id].remote_id +
					  size_str);
		}
		console.log(urls);

		return urls;
	},
	process: function(body, size_to_impid) {
        console.log(body);
        try {
            var json_str = body.replace(re, '$1');
            var an_resp = JSON.parse(json_str);
        } catch(e) {
			return { error: 'error: ' + e + ' stack: ' + e.stack };
        }

		if (!an_resp.result)
			return { error: an_resp };

		var placement_id = decodeURIComponent(an_resp.callback_uid);
        console.log(placement_id);
        console.log(size_to_impid);

        if (!size_to_impid[placement_id] || !size_to_impid[placement_id].sizes)
            return { error: an_resp };

		var imp_id = size_to_impid[placement_id].sizes[an_resp.result.width + 'x' + an_resp.result.height];
        var iframe_html="<body><scr" + "ipt>";
        iframe_html += "var ifrm = document.createElement('iframe');";
        iframe_html += "ifrm.marginHeight = 0;";
        iframe_html += "ifrm.marginWidth = 0;";
        iframe_html += "ifrm.frameBorder = 0;";
        iframe_html += "ifrm.sandbox = \"allow-scripts allow-same-origin allow-popups-to-escape-sandbox allow-popups allow-forms\";";
        iframe_html += "ifrm.width = " + an_resp.result.width + ";";
        iframe_html += "ifrm.height = " + an_resp.result.height + ";";
        iframe_html += "ifrm.scrolling = \"no\";";
        iframe_html += "ifrm.style.overflow = \"hidden\";";
        iframe_html += "ifrm.src = '" + an_resp.result.ad + "';";
        iframe_html += "document.body.appendChild(ifrm);</scr" + "ipt></body>";

		return {
			id: size_to_impid['id'],
			seatbid: [{ bid: [{
				id: imp_id,
				impid: imp_id,
				price: an_resp.result.cpm / (100*100),
				adm: iframe_html,
			}] }]
		};
	},
	set_config: function(config) {
		bid_url = config.bid_url || bid_url;
		psa = config.psa || psa;
	},
}
