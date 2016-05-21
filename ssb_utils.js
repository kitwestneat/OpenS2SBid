var Promise = require("bluebird");
var request = require('request');
var request_get = Promise.promisify(request.get, {
	multiArgs: true
});

var request_post = Promise.promisify(request.post, {
	multiArgs: true
});

var config = require('./config');

var ssb_utils = {
	log: function(msg) {
		// might log to server eventually
		console.log(msg);
	},
	http_post: request_post,
	real_http_get: function(url, headers) {
		return request_get({url: url, headers: headers})
			.timeout(config.http_timeout)
			.then(function(arr) {
				var response = arr[0],
					body = arr[1];
				return {
					body: body,
					url: url
				};
			}).catch(Promise.TimeoutError, function(e) {
				ssb_utils.log("timeout after " + config.http_timeout + " ms, fetching " + url);
			});
	},
	fake_appnexus_http_get: function(url) {
		return Promise.resolve({
			body: 'callback({"result":{"cpm":44400,"width":300,"height":250,"creative_id":40950577,"media_type_id":1,"media_subtype_id":1,"ad":"http://nym1.ib.adnxs.com/ab?e=wqT_3QKuBPBCJQIAAAIA1gAFCLfbk7YFEPX7t_mHvazkFxjdqcqxsr-gqgEgASotCcP1KFyPwhFAEcP1KFyPwhFAGQAAAAAAAPA_IRESACkRCagwwO7hAji-B0C-B0gCULG2wxNYlukvYABonZ8CeJLDA4ABAYoBA1VTRJIBAQbwUpgBrAKgAfoBqAEBsAEAuAEBwAEDyAEA0AEA2AEA4AEA8AEAigI6dWYoJ2EnLCA1OTE2ODMsIDE0NTU3NDY0ODcpO3VmKCdyJywgNDA5NTA1NzcsMh4A8JySAr0BITVDdEFld2pDOEtFRkVMRzJ3eE1ZQUNDVzZTOHdBRGdBUUFSSXZnZFF3TzdoQWxnQVlLMEVhQUJ3QUhnQWdBR1NDNGdCenB3UmtBRUJtQUVCb0FFQnFBRURzQUVBdVFIRDlTaGNqOElSUU1FQndfVW9YSV9DRVVESkFSZndhck9BaU5JXzJRRUFBQUFBQUFEd1AtQUJBUFVCBQ9ASmdDaW9iWThnV2dBZ0MxQWcBFgRDOQkIKEEumgIlIW53bkNiOsAAHGx1a3ZJQVFvCTzwY1Uu2ALoB-ACx9MBgAMAiAMBkAMAmAMFoAMBqgMAsAMAuAMAwAOsAsgDANgDAOADAOgDAPgDAIAEAJIEBC9qcHSYBACiBA0xMDAuMzcuOTIuMjAzqASgugqyBAYIABAAGAC4BAA.&s=59b48d7025f677013cb27eac473d1bdbbb51a4ee"},"callback_uid":"leaderboard-atf-5797696"});',
			url: url
		});
	},
	fake_sovrn_http_get: function(url) {
		var strVar = "callback(";
		strVar += "{";
		strVar += "  \"id\" : \"100\",";
		strVar += "  \"seatbid\" : [ {";
		strVar += "    \"bid\" : [ {";
		strVar += "      \"id\" : \"a_316067_3610a7f8c2d74956b9483381cf8ff918\",";
		strVar += "      \"impid\" : \"101\",";
		strVar += "      \"price\" : 0.0178756,";
		strVar += "      \"nurl\" : \"http:\/\/vap6sna1.lijit.com\/www\/delivery\/lg.php?bannerid=40088&campaignid=1673&rtb_tid=b856ca87-8a20-4e76-b3e9-ec5d63db4c6b&rpid=23&seatid=597658&zoneid=316067&cb=00041056&tid=a_316067_3610a7f8c2d74956b9483381cf8ff918\",";
		strVar += "      \"adm\" : \"%3CSCRIPT%20language%3D%22JavaScript1.1%22%20SRC%3D%22http%3A%2F%2Fbid.g.doubleclick.net%2Fxbbe%2Fcreative%2Fadj%3Fd%3DAPEucNVToWHQLg1JMtTD4rmnDVcWkdo90fm7BoQlf5bLIOBvg7AatdTyQD5DbdlTa_n3FCj9rXC08zwzzfvAECrZSW134yXSziW10VbT4fRC8HGT-vA7ENpfS2Ag-4Q0XizmBtYnwlExmye5wZq6h2LLr61RXO9nvngH-R5N9h26rTWxar1I9QQA23VUPaVAIXBw_MOVi5LVIsa9EI5eZ8ppeJsS2dW-gWb3nXQwUezj0TvA_IhIAClksYU2LuIM1ky2xad-reXRs0QW2-EjqnWf-5HCFVQUoHQZ_4lSaFDbaj91fAtudysg_MLd9FAyizyzz9MswK23S0-y5oAtMP84BoE3ziovasykPbnnCwTjkfpKzXlxmUZ07Qq2wJUq4C2tS6aPyqRKws5RpHHLhDI2gfBDYwc6NA%26pr%3D0.054108%22%3E%3C%2FSCRIPT%3E%3CNOSCRIPT%3E%3CA%20HREF%3D%22http%3A%2F%2Fbid.g.doubleclick.net%2Fxbbe%2Fcreative%2Fjump%3Fd%3DAPEucNVToWHQLg1JMtTD4rmnDVcWkdo90fm7BoQlf5bLIOBvg7AatdTyQD5DbdlTa_n3FCj9rXC08zwzzfvAECrZSW134yXSziW10VbT4fRC8HGT-vA7ENpfS2Ag-4Q0XizmBtYnwlExmye5wZq6h2LLr61RXO9nvngH-R5N9h26rTWxar1I9QQA23VUPaVAIXBw_MOVi5LVIsa9EI5eZ8ppeJsS2dW-gWb3nXQwUezj0TvA_IhIAClksYU2LuIM1ky2xad-reXRs0QW2-EjqnWf-5HCFVQUoHQZ_4lSaFDbaj91fAtudysg_MLd9FAyizyzz9MswK23S0-y5oAtMP84BoE3ziovasykPbnnCwTjkfpKzXlxmUZ07Qq2wJUq4C2tS6aPyqRKws5RpHHLhDI2gfBDYwc6NA%22%3E%3CIMG%20SRC%3D%22http%3A%2F%2Fbid.g.doubleclick.net%2Fxbbe%2Fcreative%2Fad%3Fd%3DAPEucNVToWHQLg1JMtTD4rmnDVcWkdo90fm7BoQlf5bLIOBvg7AatdTyQD5DbdlTa_n3FCj9rXC08zwzzfvAECrZSW134yXSziW10VbT4fRC8HGT-vA7ENpfS2Ag-4Q0XizmBtYnwlExmye5wZq6h2LLr61RXO9nvngH-R5N9h26rTWxar1I9QQA23VUPaVAIXBw_MOVi5LVIsa9EI5eZ8ppeJsS2dW-gWb3nXQwUezj0TvA_IhIAClksYU2LuIM1ky2xad-reXRs0QW2-EjqnWf-5HCFVQUoHQZ_4lSaFDbaj91fAtudysg_MLd9FAyizyzz9MswK23S0-y5oAtMP84BoE3ziovasykPbnnCwTjkfpKzXlxmUZ07Qq2wJUq4C2tS6aPyqRKws5RpHHLhDI2gfBDYwc6NA%26pr%3D0.054108%22%20BORDER%3D0%20WIDTH%3D160%20HEIGHT%3D600%20ALT%3D%22Advertisement%22%3E%3C%2FA%3E%3C%2FNOSCRIPT%3E%3Ciframe%20src%3D%22http%3A%2F%2Fgoogleads.g.doubleclick.net%2Fxbbe%2Fpixel%3Fd%3DCJq9JBCxoicY7rfMBA%26v%3DAPEucNWFUSZXZLwWrpxL2UmhyMSpvumwDSAfxQo3U116LCh4g6uF_z1aciDIeU-ETvQkXIqy9-jmHPfGWej8yDln4UybWiG3-vegxbgJFclth498i6ktUuQ%22%20style%3D%22display%3Anone%22%3E%3C%2Fiframe%3E%3CDIV%20STYLE%3D%22position%3A%20absolute%3B%20left%3A%200px%3B%20top%3A%200px%3B%20visibility%3A%20hidden%3B%22%3E%3CIMG%20SRC%3D%22http%3A%2F%2Fbid.g.doubleclick.net%2Fxbbe%2Fbeacon%3Fdata%3DAPEucNVf3r7hY5CppRX9Qopj5A6xLQegV_a14bRM1mKZ51B648xVwJo5Xvp7JE9HVaDs_90X0V-9O98febWMlK4i0Q9IvWJTOQ%22%20BORDER%3D0%20WIDTH%3D1%20HEIGHT%3D1%20ALT%3D%22%22%20STYLE%3D%22display%3Anone%22%3E%3C%2FDIV%3E\",";
		strVar += "      \"ext\" : { }";
		strVar += "    }, {";
		strVar += "      \"id\" : \"a_316066_49473dff816c4d1cb4abe6a73890480d\",";
		strVar += "      \"impid\" : \"103\",";
		strVar += "      \"price\" : 0.0178756,";
		strVar += "      \"nurl\" : \"http:\/\/vap6sna1.lijit.com\/www\/delivery\/lg.php?bannerid=93578&campaignid=1673&rtb_tid=8f986601-169f-4aca-ad3c-4cc578a37dd9&rpid=23&seatid=597658&zoneid=316066&cb=16517291&tid=a_316066_49473dff816c4d1cb4abe6a73890480d\",";
		strVar += "      \"adm\" : \"%3CSCRIPT%20language%3D%22JavaScript1.1%22%20SRC%3D%22http%3A%2F%2Fbid.g.doubleclick.net%2Fxbbe%2Fcreative%2Fadj%3Fd%3DAPEucNVVPDzgNqvRBpTF3iOMP7CWvVGhN3ijY-rqwQfx1NzPVMRWHrW_jAQjr6k09GOiW0FD6DkhGCEwDj24CpPpw38Ft8IlKAbsFGJok5YoA_acTzQPiooqQ62jO3H1hKTvFH5eJCGnpksghGCSjG9B0W7wSc1WQ4nOXg6CkDqGWlnrEnScmaC4lEANr_MYfKoaX78JkliEBpkRYIn62sI9O469SZMd5t08KgPpqVUVw6E17lcavrTigqsLD2xDwWsg-Js4uTrbr2MTrXnyNj1q6zZQiVBFBb--bVAlVo8iMyBmhqQ6cMqAp7QmiIYuuVLEzJYNMWV74yD486jnuY0jaXmqBNWjX_y0lB06XoN7gvXvk8DzOlwnaCcOpyhuIUkjRdV-NENtPyuz3QVi3OyUydt0xhCXuA%26pr%3D0.054108%22%3E%3C%2FSCRIPT%3E%3CNOSCRIPT%3E%3CA%20HREF%3D%22http%3A%2F%2Fbid.g.doubleclick.net%2Fxbbe%2Fcreative%2Fjump%3Fd%3DAPEucNVVPDzgNqvRBpTF3iOMP7CWvVGhN3ijY-rqwQfx1NzPVMRWHrW_jAQjr6k09GOiW0FD6DkhGCEwDj24CpPpw38Ft8IlKAbsFGJok5YoA_acTzQPiooqQ62jO3H1hKTvFH5eJCGnpksghGCSjG9B0W7wSc1WQ4nOXg6CkDqGWlnrEnScmaC4lEANr_MYfKoaX78JkliEBpkRYIn62sI9O469SZMd5t08KgPpqVUVw6E17lcavrTigqsLD2xDwWsg-Js4uTrbr2MTrXnyNj1q6zZQiVBFBb--bVAlVo8iMyBmhqQ6cMqAp7QmiIYuuVLEzJYNMWV74yD486jnuY0jaXmqBNWjX_y0lB06XoN7gvXvk8DzOlwnaCcOpyhuIUkjRdV-NENtPyuz3QVi3OyUydt0xhCXuA%22%3E%3CIMG%20SRC%3D%22http%3A%2F%2Fbid.g.doubleclick.net%2Fxbbe%2Fcreative%2Fad%3Fd%3DAPEucNVVPDzgNqvRBpTF3iOMP7CWvVGhN3ijY-rqwQfx1NzPVMRWHrW_jAQjr6k09GOiW0FD6DkhGCEwDj24CpPpw38Ft8IlKAbsFGJok5YoA_acTzQPiooqQ62jO3H1hKTvFH5eJCGnpksghGCSjG9B0W7wSc1WQ4nOXg6CkDqGWlnrEnScmaC4lEANr_MYfKoaX78JkliEBpkRYIn62sI9O469SZMd5t08KgPpqVUVw6E17lcavrTigqsLD2xDwWsg-Js4uTrbr2MTrXnyNj1q6zZQiVBFBb--bVAlVo8iMyBmhqQ6cMqAp7QmiIYuuVLEzJYNMWV74yD486jnuY0jaXmqBNWjX_y0lB06XoN7gvXvk8DzOlwnaCcOpyhuIUkjRdV-NENtPyuz3QVi3OyUydt0xhCXuA%26pr%3D0.054108%22%20BORDER%3D0%20WIDTH%3D300%20HEIGHT%3D250%20ALT%3D%22Advertisement%22%3E%3C%2FA%3E%3C%2FNOSCRIPT%3E%3Ciframe%20src%3D%22http%3A%2F%2Fgoogleads.g.doubleclick.net%2Fxbbe%2Fpixel%3Fd%3DCJq9JBCxoicY8bfMBA%26v%3DAPEucNVbj7iiqJBj5VCg_TLuQZM3flmXRdCNxx-ULML9fDfv3S9Zl6f4gwjCAGFvit-SKKtRdb1xGYrS-q4w7PBtAuVTpdBCKrOdOFDqtnuC66HSs2G3m7M%22%20style%3D%22display%3Anone%22%3E%3C%2Fiframe%3E%3CDIV%20STYLE%3D%22position%3A%20absolute%3B%20left%3A%200px%3B%20top%3A%200px%3B%20visibility%3A%20hidden%3B%22%3E%3CIMG%20SRC%3D%22http%3A%2F%2Fbid.g.doubleclick.net%2Fxbbe%2Fbeacon%3Fdata%3DAPEucNX4LJUEdANPhoqhszXAW33691tPiCOV8YaK0dhSdIEON6YAonbR86vmYf8tl9YNJ4n_67njtBLNcDInT7HhDPDa_wtRhQ%22%20BORDER%3D0%20WIDTH%3D1%20HEIGHT%3D1%20ALT%3D%22%22%20STYLE%3D%22display%3Anone%22%3E%3C%2FDIV%3E\",";
		strVar += "      \"ext\" : { }";
		strVar += "    } ]";
		strVar += "  } ]";
		strVar += "})";

		return Promise.resolve({
			body: strVar,
			url: url
		});

	},
};
module.exports = ssb_utils;
