
var https 			= require('https'),				// HTTPS module
    http            = require('http'),              // HTTP module
    fs              = require('fs'),                // File System
	WebSocketServer = require('websocket').server,	// Websocket module
	express         = require('express'),			// Static Web content handler
    app             = express();					// Start express



var options = {
  key: fs.readFileSync('privatekey.pem'),
  cert: fs.readFileSync('certificate.pem'),
};

app.use(express.static(__dirname + '/public'));

var env = 'local';
var port = 8881;

var server = null,
	serverHttps = null;

if(process.env.PORT) {
	console.log("Launched in Cloud mode");
	port = process.env.PORT;
	env = 'remote';
}
else {
	console.log("Launched in Local mode");
}

// Create http server and pass the express app as the handler. 

if(env === "local") {
	serverHTTPS = https.createServer(options, app);
	serverHTTPS.listen(8882, function() {
    	console.log((new Date()) + ' secure server listening on port ' + '8882');
	});
}
else {
	server = http.createServer(app);
	server.listen(port);
}

var wsServer = null;

if(env === "local") {
	console.log("Create WSS for local mode");
	wsServer = new WebSocketServer({ 
		httpServer: serverHTTPS
	});
}
else {
	console.log("Create WSS for cloud mode");
	wsServer = new WebSocketServer({ 
		httpServer: server
	});	
}

app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(app.router);

exports.startServer = function() {
};


var router = null;

router = require('./app/server/router')(wsServer, app);	

