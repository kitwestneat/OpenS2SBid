var http = require('http');
var url = require('url');

var config = require('./config');

function handleRequest(request, response) { try {
	var html = '<html><body>Got request:<br><pre>';

	var parsed = url.parse(request.url, true);
	var bid_request = JSON.parse(parsed.query.br);
	var callback = parsed.query.callback;

	html += "callback: " + callback + "\n";
	html += "bid request: ";
	html += JSON.stringify(bid_request, null, 4);



	html += '</pre></body></html>';

	response.end(html);

} catch(e) { response.statusCode = 500; response.end() } }

var server = http.createServer(handleRequest);
server.listen(config.port, function(){
	console.log("Server listening on: http://localhost:%s", config.port);
});
