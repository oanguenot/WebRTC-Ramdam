Sonotone.debug = true;
Sonotone.enableSTUN = true;

var chromeExtension = false;

/*
Sonotone.STUN = {
    iceServers: [
		{
    		url: "stun:stun.l.google.com:19302"
    	}, 
    	{
            url: "turn:numb.viagenie.ca", credential: "oanguenot", username: "oanguenot%40gmail.com"
        }
    ]
};
*/

var io = null;

var turn = {"iceServers": [{"url": "stun:52.17.218.155:80"}, {"url": "turn:52.17.218.155:80?transport=tcp", credentials:'youdontknowjs', username: 'alice'}]};

var sono = new Sonotone.IO(new Date().getTime().toString(), turn );

//var editorExtensionId = "meccllpfhfmamingegojnnbpglmehhdf";
var editorExtensionId = 'oogjpemgamiahbhfflabaejkcajfnaak';

var port = null;

if(chrome.runtime) {
	console.log("Try to connect to the Chrome Extension...");
	port = chrome.runtime.connect(editorExtensionId);

	if (port) {
		console.log("Port created successfully...")
		port.onMessage.addListener(function(msg) {
	        console.log("answered", msg);

	        switch (msg.type) {
	        	case 'loginResponse':
	        		chromeExtension = true;
	        		console.log("Chrome Extension found and ready!");
	        		Backbone.Mediator.publish('extension:found');
	        		break;
	        	case 'startsharingResponse':
	        		if(msg.code === 0 && msg.streamID) {
	        			sono.localMedia().acquireScreen(null, msg.streamID);
	        		}
	        		//else {
	        		//	sono.localMedia().acquireScreen();	
	        		//}
	        		break;
	        	case 'endsharingResponse':
	        		break;
	        }
	  	});

	  	port.postMessage({type: 'login', data: null});
	};	
}

sono.localMedia().on('onLocalVideoStreamStarted', function onLocalStreamStarted(stream) {
	Backbone.Mediator.publish('media:localStreamStarted', stream, Sonotone.ID);
}, this);

sono.localMedia().on('onLocalScreenStreamStarted', function onLocalStreamStarted(stream) {
	Backbone.Mediator.publish('media:localScreenStreamStarted', stream, Sonotone.ID);
}, this);

sono.localMedia().on('onLocalVideoStreamEnded', function onLocalStreamEnded() {

}, this);

sono.localMedia().on('onLocalVideoStreamError', function onLocalStreamError() {

}, this);

sono.localMedia().on('onLocalScreenStreamError', function onLocalStreamError() {
	Backbone.Mediator.publish('media:localScreenStreamError');
}, this);

sono.remoteMedia().on('onRemoteVideoStreamStarted', function onRemoteStreamStarted(msg) {
	Backbone.Mediator.publish('media:remoteVideoON', msg);
}, this);

sono.remoteMedia().on('onRemoteScreenStreamStarted', function onRemoteStreamStarted(msg) {
	Backbone.Mediator.publish('media:remoteScreenON', msg);
}, this);

sono.remoteMedia().on('onRemoteVideoStreamEnded', function onRemoteStreamEnded(msg) {
	Backbone.Mediator.publish('media:remoteVideoOFF', msg);
}, this);

sono.remoteMedia().on('onRemoteScreenStreamEnded', function onRemoteStreamEnded(msg) {
	Backbone.Mediator.publish('media:remoteScreenOFF', msg);
}, this);

sono.on('onPeerConnected', function onPeerConnected(data) {
	console.log("Connivence :: New User:" + data.id, data);
	Backbone.Mediator.publish('media:participantConnected', data.id, data.caps);
}, this);

sono.on('onPeerAlreadyConnected', function onPeerAlreadyConnected(data){
	console.log("Connivence :: New User:" + data.id, data);
	Backbone.Mediator.publish('media:participantAlreadyConnected', data.id, data.caps);
}, this);

sono.on('onPeerDisconnected', function onPeerDisconnected(id) {
	Backbone.Mediator.publish('media:participantDisconnected', id);
}, this);

sono.on('onPeerIMMessage', function onPeerChat(data) {
	Backbone.Mediator.publish('media:participantMessage', data.id, data.content);
}, this);

sono.on('onCallOffered', function onCallOffered(msg){
	Backbone.Mediator.publish('media:onCallOffered', msg.id);
}, this);

sono.on('onCallAnswered', function onCallAnswered(id){
	Backbone.Mediator.publish('media:onCallAnswered', id);
}, this);

sono.on('onCallEnded', function onCallEnded(msg) {
	Backbone.Mediator.publish('media:onCallEnded', msg);
}, this);

sono.on('onPeerFileReceived', function onFileReceived(msg) {
	Backbone.Mediator.publish('media:onFileReceived', msg);
}, this);

module.exports = {

	acquireCamera: function(withAudio, withVideo) {
		var constraints = {
            audio: withAudio,
            video: withVideo,
            format: 'vga'
        };

        sono.localMedia().acquire(constraints);
	},

	acquireScreen: function() {
		if(chromeExtension) {
			port.postMessage({type: 'startsharing'});
		}
		else {
			sono.localMedia().acquireScreen();
		}
	},

	renderLocalStream: function(HTMLElement) {
		sono.localMedia().renderVideoStream(HTMLElement);
	},

	connectToServer: function(caps, room) {

		sono.transport('websocket', {host: window.location.hostname, port: null});
		//sono.transport('websocket', {host: '192.168.0.126', port: '8882'});
		//sono.transport('websocket', {host: '172.26.134.23', port: '8881'});            
		//sono.transport('websocket', {host: '172.26.165.198', port: '8881'});            
		//sono.transport('websocket', {host: '10.0.6.169', port: '8881'});            

		sono.transport().on('onReady', function onReady() {

		}, this);

		sono.transport().on('onClose', function onClose() {

		}, this);

		sono.transport().on('onError', function onError() {
			Backbone.Mediator.publish('media:onTransportError');
		}, this)

		sono.transport().connect(caps, room);
	},

	callParticipant: function(id) {
		sono.call(id, 'video', false);  
	},

	screenParticipant: function(id) {
		sono.call(id, 'screen', false);
	},

	dataParticipant: function(id) {
		sono.call(id, 'data', false);
	},

	answerParticipant: function(id) {
		sono.answer(id, false);  
	},

	displayParticipantVideo: function(HTMLElement, id) {
		
		if(id.indexOf('screen') > -1) {
			id = id.substring(6);
			sono.remoteMedia().renderStream(HTMLElement, id, 'screen');		
		}
		else {
			sono.remoteMedia().renderStream(HTMLElement, id, 'video');	
		}
	},

	sendMessage: function(message) {
		sono.sendIMMessage(message);
	},

	sendData: function(msg, callee) {
		sono.sendMessageUsingChannel(msg, callee);
	},

	sendFile: function(file, callee) {
		sono.sendFile(file, callee);
	},

	getCapabilities: function() {
		return sono.caps();
	},

	isMe: function(id) {
		return (id === sono.ID ? true: false);
	}

};