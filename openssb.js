var http = require('http');
var url = require('url');
var bm = require('./bid_manager');

var config = require('./local/config');

var req_count = 0;
var req_start = Date.now();
var REPORT_AT = 1000;

// testreq
// http://localhost:8888/?callback=pbh_sovrn_process_bid&br=%7B%22id%22%3A100%2C%22imp%22%3A%5B%7B%22id%22%3A101%2C%22banner%22%3A%7B%22w%22%3A%22320%22%2C%22h%22%3A%2250%22%7D%2C%22tagid%22%3A316627%7D%2C%7B%22id%22%3A102%2C%22banner%22%3A%7B%22w%22%3A%22300%22%2C%22h%22%3A%22250%22%7D%2C%22tagid%22%3A316060%7D%2C%7B%22id%22%3A103%2C%22banner%22%3A%7B%22w%22%3A%22320%22%2C%22h%22%3A%2250%22%7D%2C%22tagid%22%3A316626%7D%2C%7B%22id%22%3A104%2C%22banner%22%3A%7B%22w%22%3A%22300%22%2C%22h%22%3A%22250%22%7D%2C%22tagid%22%3A316053%7D%5D%2C%22site%22%3A%7B%22domain%22%3A%22runt-of-the-web.com%22%2C%22page%22%3A%22%2F%22%7D%7D
function handle_req(request, response) {
	try {
		var parsed = url.parse(request.url, true);
		var bid_request = JSON.parse(parsed.query.br);
		var callback = parsed.query.callback || 'callback';
		var debug = parsed.query.debug;

		req_count++;
		if (req_count == REPORT_AT) {
			console.log("recieved ", req_count, "requests in ", Date.now - req_start);
			req_start = Date.now();
			req_count = 0;
		}

		if (!bid_request.device)
			bid_request.device = {};

		bid_request.device.ua = request.headers['user-agent'];
		bid_request.device.ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

		response.setHeader('Cache-Control', 'no-cache');
		if (debug)
			debug_req(response, request.headers, bid_request, callback);
		else
			jsonp_req(response, request.headers, bid_request, callback);

	} catch (e) {
		var msg = 'bad request url: ' + request.url + ' e: ' + e + "\n";
		msg += e.stack + "\n";
		console.log(msg);
		response.statusCode = 500;
		response.end(msg);
	}
}

function jsonp_req(response, bid_headers, bid_request, callback) {
	var jsonp = callback + "(";

	bm.bid(bid_request, bid_headers)
		.timeout(config.http_timeout)
		.then(function(bid_response) {
			jsonp += JSON.stringify(bid_response, null, 4);
			jsonp += ')';
			response.end(jsonp);
		});
}

function debug_req(response, headers, bid_request, callback) {
	var black_on_white = "<style>body {background-color: black; color: white }</style>";
	var html = '<html><head></head><body>Got request:<br><pre>';


	html += "headers: " + JSON.stringify(headers, null, 4) + "\n";
	html += "callback: " + callback + "\n";
	html += "bid request: \n";
	html += JSON.stringify(bid_request, null, 4);


	// have each adapter do bid request
	// 	- pass whole bid request to adapter
	// 	- adapter can read ext objects for their placement data
	// track bid requests
	// return winner to client

	bm.bid(bid_request, headers)
		.timeout(config.http_timeout)
		.then(function(bid_response) {
			html += "\nbid response: \n";
			html += JSON.stringify(bid_response, null, 4)
				.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
			html += '</pre></body></html>';
			response.end(html);
		});

}

var server = http.createServer(handle_req);
server.listen(config.port, function() {
	console.log("Server listening on: http://localhost:%s", config.port);
});


/*
 *						
{
    "id": 100,
    "imp": [
        {
            "id": 101,
            "banner": {
                "w": "320",
                "h": "50"
            },
			"tagid": "div-gpt-ad-1374154100505-4",
            "ext": {
				"sovrn": { "tagid": 316627 },
				"aol": { "tagid": '9599.1/3611252/0/225' },
				}
        },
        {
            "id": 102,
            "banner": {
                "w": "300",
                "h": "250"
            },
			"tagid": "div-gpt-ad-1374154100505-4",
            "ext": {
				"sovrn": { "tagid": 316060 },
				"aol": { "tagid": '9599.1/3611253/0/170' },
				"appnexus": { "tagid": 5797696 },
			}
        },
        {
            "id": 103,
            "banner": {
                "w": "320",
                "h": "50"
            },
			"tagid": "div-gpt-ad-1374154100505-5",
            "ext": {
				"sovrn": { "tagid": 316626 },
				"aol": { "tagid": '9599.1/3617677/0/170' },
				}
        },
        {
            "id": 104,
            "banner": {
                "w": "300",
                "h": "250"
            },
			"tagid": "div-gpt-ad-1374154100505-5",
            "ext": {
				"sovrn": { "tagid": 316053 },
				"aol": { "tagid": '9599.1/3617719/0/225' },
			}
        }
    ],
    "site": {
        "domain": "runt-of-the-web.com",
        "page": "/"
    }
}


{"id":100,"imp":[{"id":101,"banner":{"w":"320","h":"50"},"tagid":"div-gpt-ad-1374154100505-4","ext":{"sovrn":{"tagid":316627},"aol":{"tagid":"9599.1/3611252/0/225"}}},{"id":102,"banner":{"w":"300","h":"250"},"tagid":"div-gpt-ad-1374154100505-4","ext":{"sovrn":{"tagid":316060},"aol":{"tagid":"9599.1/3611253/0/170"},"appnexus":{"tagid":5797696}}},{"id":103,"banner":{"w":"320","h":"50"},"tagid":"div-gpt-ad-1374154100505-5","ext":{"sovrn":{"tagid":316626},"aol":{"tagid":"9599.1/3617677/0/170"}}},{"id":104,"banner":{"w":"300","h":"250"},"tagid":"div-gpt-ad-1374154100505-5","ext":{"sovrn":{"tagid":316053},"aol":{"tagid":"9599.1/3617719/0/225"}}}],"site":{"domain":"runt-of-the-web.com","page":"/"}}
*/
