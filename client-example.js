var ssb_config = {
	bid_url: 'http://ssb.all-that-is-interesting.com/ssb/',
};

var ssb_client = function() {
	var bid_request_id = 100;
	var br_map = {};

	return {
		// [{ tagid: <placement>, sizes: [[<width>, <height>], [<width>, <height>], ...], placements: { <provider>: <placement_data> } }, ...]
		bid: function(ad_units) {
			var bid_request = {
				id: bid_request_id,
				imp: [],
			};
			var url = bid_url + "?callback=ssb_client.process&br=";

			br_map[bid_request_id] = {};

			var imp_id = 100;
			ad_units.forEach(function(unit) {
				var ext = {};
				for (var provider in unit.placements)
					ext[provider] = { tagid: unit.placements[provider] };

				unit.sizes.forEach(function(sizes) {
					if (!Array.isArray(sizes))
						sizes = [sizes];

					sizes.forEach(function(width, height) {
						bid_request.imp.push({
							id: imp_id,
							banner: { w: width, h: height },
							ext: ext,
							tagid: unit.tagid,
						});
						br_map[bid_request_id][imp_id] = unit.tagid;

						imp_id++;
					});
				});
			});
			bid_request_id++;

			var scr = document.createElement('script');
			scr.src = url + encodeURIComponent(JSON.stringify(bid_request));
			document.head.appendChild(scr);
		},
		process: function(bresp) {
			var imps = br_map[bresp.id];
			if (!imps) {
				console.log("bid id: " + bresp.id + " not found in bid map");
				return {};
			}

			var bid_retval = {};
			bresp.seatbid.forEach(function(bid) {
				var tagid;
				if (bid.ext.ssb_tagid)
					tagid = bid.ext.ssb_tagid;
				else 
					tagid = imps[bid.impid];

				bid_retval[tagid] = bid;
			});

			br_map[bresp.id] = null;
			return bid_retval;
		}
	};
}
