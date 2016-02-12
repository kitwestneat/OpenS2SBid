var http = require('http');
var url = require('url');
var bm = require('./bid_manager');

var config = require('./config');

// testreq
// http://localhost:8888/?callback=pbh_sovrn_process_bid&br=%7B%22id%22%3A100%2C%22imp%22%3A%5B%7B%22id%22%3A101%2C%22banner%22%3A%7B%22w%22%3A%22320%22%2C%22h%22%3A%2250%22%7D%2C%22tagid%22%3A316627%7D%2C%7B%22id%22%3A102%2C%22banner%22%3A%7B%22w%22%3A%22300%22%2C%22h%22%3A%22250%22%7D%2C%22tagid%22%3A316060%7D%2C%7B%22id%22%3A103%2C%22banner%22%3A%7B%22w%22%3A%22320%22%2C%22h%22%3A%2250%22%7D%2C%22tagid%22%3A316626%7D%2C%7B%22id%22%3A104%2C%22banner%22%3A%7B%22w%22%3A%22300%22%2C%22h%22%3A%22250%22%7D%2C%22tagid%22%3A316053%7D%5D%2C%22site%22%3A%7B%22domain%22%3A%22runt-of-the-web.com%22%2C%22page%22%3A%22%2F%22%7D%7D
function handle_req(request, response) { try {
	var html = '<html><head><style>body {background-color: black; color: white }</style><body>Got request:<br><pre>';

	var parsed = url.parse(request.url, true);
	var bid_request = JSON.parse(parsed.query.br);
	var callback = parsed.query.callback || 'callback';

	html += "callback: " + callback + "\n";
	html += "bid request: \n";
	html += JSON.stringify(bid_request, null, 4);


	// have each adapter do bid request
	// 	- pass whole bid request to adapter
	// 	- adapter can read ext objects for their placement data
	// track bid requests
	// return winner to client

	bm.bid(bid_request)
	.timeout(config.http_timeout)
	.then(function(bid_response) {
		html += "\nbid response: \n";
		html += JSON.stringify(bid_response, null, 4);
		html += '</pre></body></html>';
		response.end(html);
	});

} catch(e) { console.log('bad request url: ' + request.url + ' e: ' + e); response.statusCode = 500; response.end(); } }

var server = http.createServer(handle_req);
server.listen(config.port, function(){
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
			"tagid": "leaderboard ATF",
            "ext": { "sovrn": { "tagid": 316627 } }
        },
        {
            "id": 102,
            "banner": {
                "w": "300",
                "h": "250"
            },
			"tagid": "leaderboard ATF",
            "ext": { "sovrn": { "tagid": 316060 } }
        },
        {
            "id": 103,
            "banner": {
                "w": "320",
                "h": "50"
            },
			"tagid": "leaderboard BTF",
            "ext": { "sovrn": { "tagid": 316626 } }
        },
        {
            "id": 104,
            "banner": {
                "w": "300",
                "h": "250"
            },
			"tagid": "leaderboard BTF",
            "ext": { "sovrn": { "tagid": 316053 } }
        }
    ],
    "site": {
        "domain": "runt-of-the-web.com",
        "page": "/"
    }
}
{"id":100,"imp":[{"id":101,"banner":{"w":"320","h":"50"},"tagid":"leaderboard ATF","ext":{"sovrn":{"tagid":316627}}},{"id":102,"banner":{"w":"300","h":"250"},"tagid":"leaderboard ATF","ext":{"sovrn":{"tagid":316060}}},{"id":103,"banner":{"w":"320","h":"50"},"tagid":"leaderboard BTF","ext":{"sovrn":{"tagid":316626}}},{"id":104,"banner":{"w":"300","h":"250"},"tagid":"leaderboard BTF","ext":{"sovrn":{"tagid":316053}}}],"site":{"domain":"runt-of-the-web.com","page":"/"}}


*/
