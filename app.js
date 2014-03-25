
/*
var http = require('http'),
	express = require('express'),
    app = express(),
    server = http.createServer(app);
*/

var express = require('express'), 
	WebSocketServer = require('websocket').server, 
	fs = require('fs'),
	http = require('http'),
	https = require('https'), 
	app = express();

var options = {
  key: fs.readFileSync('privatekey.pem'),
  cert: fs.readFileSync('certificate.pem')
};

var env = 'local';
var port = 8881;

var server = null,
	serverHttps = null;


if(process.env.PORT) {
	port = process.env.PORT;
	env = 'remote';
}

// Create http server and pass the express app as the handler. 
server = http.createServer(app);

if(env === "local") {
	serverHTTPS = https.createServer(options, app);
}

// Create the websocket server passing the same server instance. 
var wsServer = new WebSocketServer({ 
	httpServer: server 
});

exports.startServer = function() {
};

app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(app.router);

console.log('Modulus demo app started on port ' + port);

var router = require('./app/server/router')(wsServer, app);

server.listen(port);

if(env === 'local') {
	serverHTTPS.listen(8882);	
}
