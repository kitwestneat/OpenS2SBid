var Promise = require("bluebird");
var request_get = Promise.promisify(require('request').get, { multiArgs: true });

var config = require('./config');

var ssb_utils = {
	log: function(msg) {
		// might log to server eventually
		console.log(msg);
	},
	http_get: function(url) {
		return request_get(url)
		.timeout(config.http_timeout)
		.then(function(arr) {
			var response = arr[0], body = arr[1];
			return body;
		}).catch(Promise.TimeoutError, function(e) {
			ssb_utils.log("timeout after " + config.http_timeout + " ms, fetching " + url);
		});
	}
};
module.exports = ssb_utils;
