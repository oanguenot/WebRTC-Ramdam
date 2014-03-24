
console.log ("[CONNECTION::Start");

//var io = require('socket.io'); 
var sockets = null;
var connections = [];

var connected = [];

var conferences = {};

var _getConferenceByRoom = function _getConferenceByRoom(code) {
	
	if(code in conferences){
		return {
			title : conferences[code].title,
			id: conferences[code].id,
			room: conferences[code].room
		};
	}
	else {
		return null;
	}
}

var _addNewConference = function _addNewConference(title) {

	var conference = {
		title : title,
		id: new Date().getTime(),
		room: Math.floor(Math.random() * 1000) + '-' + Math.floor(Math.random() * 1000)
	}

	console.log("[CONNECTION::Add new room:" + conference.room + " | " + conference.title);

	conferences[conference.room] = {
		connections : [],
		title: conference.title,
		id: conference.id,
		room: conference.room
	};

	return conference;
};

var _createOrJoinConference = function _createOrJoinConference(title, roomID) {

	if( roomID in conferences) {
		
		return {
			title : conferences[roomID].title,
			id: conferences[roomID].id,
			room: conferences[roomID].room
		};
	}
	else {

		var conference = {
			title : title,
			id: new Date().getTime(),
			room: roomID
		};

		conferences[conference.room] = {
			connections : [],
			title: conference.title,
			id: conference.id,
			room: conference.room
		};

		return conference;
	}
}

var _startServer = function _startServer(wsServer) {

	wsServer.on('request', function(request) {
		var connection = request.accept(null, request.origin);

		//connections.push({id: '', socket: connection});

    	//console.log("New peer connected");

    	// This is the most important callback for us, we'll handle
    	// all messages from users here.
    	connection.on('message', function(evt) {
        	
        	if (evt.type === 'utf8') {
		
        		var msg = JSON.parse(evt.utf8Data);
            
            	var caller = msg.caller;
            	var room = msg.room;
            	var currentRoom = conferences[room];

            	//console.log("RECEIVED from <" + caller + ">:" + evt.utf8Data);

	            if(msg.data.type === "join") {

	            	// Assign the socket to the correct room
	            	// Todo remove the connection from this temp array
	            	//for (var i=0;i<connections.length;i++) {
	            		//if(connections[i].socket === connection) {
	            			conferences[room].connections.push({id: caller, socket: connection, caps: msg.data.caps});
	            			console.log("<"+ caller + "> has entered room <"+ room + ">");
	            			//connections[i] = null;
	            			//delete connections[i];
	            			console.log("store in connected:" + room);
	            			connected.push({socket: connection, room: room, id: caller});
	            			//break;
	            		//}
	            	//}

	            	// Alert others peers
	                for (var i=0;i<currentRoom.connections.length;i++) {
	                    // Associate Socket <-> ID
	                    if(currentRoom.connections[i].socket === connection) {
	                        /*
	                        //console.log("old id:" + connections[i].id);
	                        connections[i].id = caller;
	                        //store capabilities
	                        connections[i].caps = msg.data.caps;
	                        console.log("<"+ caller + "> has been associated to a socket");
	                        */
	                    }
	                    // Send information about other peer connected
	                    else {
	                        console.log("Inform <" + currentRoom.connections[i].id + "> about new peer <" + caller + ">");
	                        currentRoom.connections[i].socket.send(evt.utf8Data);

	                        console.log("Inform <" + caller + "> about connected <" + currentRoom.connections[i].id + ">");

	                        // Send to this peer all others connections
	                        var msg = {
	                            data: {
	                                type: 'already_joined',
	                                caps: currentRoom.connections[i].caps
	                            },
	                            callee: caller,
	                            caller: currentRoom.connections[i].id
	                        };

	                        connection.send(JSON.stringify(msg));
	                    }
	                }

	            } else {
	            	// Send a message to only one peer
	            	if(msg.callee !== "all") {
	                    for (var i = 0;i < currentRoom.connections.length; i++) {
	                        //console.log("Connections:" + connections[i].id);
	                        if(currentRoom.connections[i].id === msg.callee) {
	                            console.log("Send message <" + msg.data.type + "> to <" + currentRoom.connections[i].id + "> in room <" + room + ">");
	                            currentRoom.connections[i].socket.send(evt.utf8Data);
	                        }
	                     }
	                }
	                // Send a message to all peer
	                else {
	                    for (var i = 0;i < currentRoom.connections.length; i++) {
	                        // Except me
	                        if(currentRoom.connections[i].socket !== connection) {
	                            console.log("Send message <" + msg.data.type + "> to <" + currentRoom.connections[i].id + "> in room <" + room + ">");
	                            currentRoom.connections[i].socket.send(evt.utf8Data);
	                        }
	                        else {
	                        	if(msg.data.type === "chat") {
	                        		console.log("Send message <" + msg.data.type + "> back to <" + currentRoom.connections[i].id + "> (me) in room <" + room + ">");
	                        		currentRoom.connections[i].socket.send(evt.utf8Data);
	                        	}
	                        }
	                    }
	                }
            	}
            }
        	else {
          		//console.log("RECEIVED OTHER:" + evt.binaryData);
        	}	
		});

		// TODO: A adapter pour supprimer la connection dans la bonne room!!!!!
		connection.on('close', function() {
			console.log("bye bye peer");

			var index = -1;
			var room = '';

	        for (var i = 0;i < connected.length; i++) {
	            if(connected[i].socket === connection) {
	                index = i;
	               room = connected[i].room;
	            }
	        }

	        if(index > -1) {
	            console.log("remove item:" + index);
	            var old = connected.splice(index, 1);

	            var conference = conferences[room];

	            var index = -1;

	            //Inform others peers that are in the same conference about the disconnection
	            for (var i = 0; i < conference.connections.length; i++) {
	                if(conference.connections[i].socket !== connection) {

	                    var toSend = {
	                        data: {
	                            type:'release'
	                        },
	                        callee: 'all',
	                        caller:old[0].id
	                    };
	                    conference.connections[i].socket.send(JSON.stringify(toSend));
	                }
	                else {
	                	index = i;
	                }
	            }

	            // Remove from the room
	            conference.connections.splice(index, 1);
	        }
		});

	});

	wsServer.on('close', function(request) {


	});
	

};

exports.startWebSocketServer = function(server) {
	_startServer(server);
};

exports.addNewConference = function(title) {
	return (_addNewConference(title));
};

exports.getConferenceByRoom = function(code) {
	return (_getConferenceByRoom(code));
};

exports.createOrJoinConference = function(title, code) {
	return (_createOrJoinConference(title, code));
}

