var db = require('./dbManager'),
	cnx = require('./connection');

module.exports = function(server, app) {

    console.log ("[SERVER-ROUTER]::Start");
    cnx.startWebSocketServer(server);


    /* REST API */

    app.post('/conference', function(req, res){
        console.log("[SERVER-ROUTER]:: Create a new room " +  req.param('title'));

        var conf = cnx.addNewConference(req.param('title'));

        res.send(conf, 201);
    });

    // FOR PINGME
    app.post('/conference/:code', function(req, res){
        console.log("[SERVER-ROUTER]:: Create or join new room for PINGME " +  req.param('code'));

        var conference = cnx.createOrJoinConference(req.param('title'), req.param('code'));

        res.send(conference, 200);
    });

	app.get('/conference/:code', function(req, res){

		var code = req.param('code');

        console.log("[SERVER-ROUTER]:: Get information on existing room " + code );
        
        var conference = cnx.getConferenceByRoom(code)

        if(conference) {
        	res.send(conference, 200);
        }
        else {
        	res.send("not-found", 404);
        }
    });

};
