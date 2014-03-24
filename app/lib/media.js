Sonotone.debug = true;
Sonotone.enableSTUN = true;

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

var sono = new Sonotone.IO(new Date().getTime());

sono.localMedia().on('onLocalVideoStreamStarted', function onLocalStreamStarted(stream) {
	Backbone.Mediator.publish('media:localStreamStarted', stream, Sonotone.ID);
}, this);

sono.localMedia().on('onLocalVideoStreamEnded', function onLocalStreamEnded() {

}, this);

sono.localMedia().on('onLocalVideoStreamError', function onLocalStreamError() {

}, this);

sono.remoteMedia().on('onRemoteStreamStarted', function onRemoteStreamStarted(id) {
	Backbone.Mediator.publish('media:remoteVideoON', id);
}, this);

sono.remoteMedia().on('onRemoteStreamEnded', function onRemoteStreamEnded(id) {
	Backbone.Mediator.publish('media:remoteVideoOFF', id);
}, this);

sono.on('onPeerConnected', function onPeerConnected(data) {
	Backbone.Mediator.publish('media:participantConnected', data.id, data.caps);
}, this);

sono.on('onPeerDisconnected', function onPeerDisconnected(id) {
	Backbone.Mediator.publish('media:participantDisconnected', id);
}, this);

sono.on('onPeerChat', function onPeerChat(data) {
	Backbone.Mediator.publish('media:participantMessage', data.id, data.content);
}, this);

sono.on('onPeerAlreadyConnected', function onPeerAlreadyConnected(data){
	Backbone.Mediator.publish('media:participantAlreadyConnected', data.id, data.caps);
}, this);

sono.on('onCallOffered', function onCallOffered(id){
	Backbone.Mediator.publish('media:onCallOffered', id);
}, this);

sono.on('onCallAnswered', function onCallAnswered(id){
	Backbone.Mediator.publish('media:onCallAnswered', id);
}, this);

sono.on('onFileReceived', function onFileReceived(data) {
	console.log("media");
	Backbone.Mediator.publish('media:onFileReceived', data.id, data.content);
}, this);

module.exports = {

	acquireCamera: function(withAudio, withVideo) {
		var constraints = {
            audio: withAudio,
            video: withVideo,
            format: 'qvga'
        };

        sono.localMedia().acquire(constraints);
	},

	acquireScreen: function() {
		sono.localMedia().acquireScreen();
	},

	renderLocalStream: function(HTMLElement) {
		sono.localMedia().renderVideoStream(HTMLElement);
	},

	connectToServer: function(caps, room) {

		sono.transport('websocket', {host: window.location.hostname, port: null});

		sono.transport().on('onReady', function onReady() {

		}, this);

		sono.transport().on('onClose', function onClose() {

		}, this);

		sono.transport().on('onError', function onError() {

		}, this)

		sono.transport().connect(caps, room);
	},

	callParticipant: function(id, hasRemoteDataChannel) {
		sono.call(id, hasRemoteDataChannel);
	},

	answerParticipant: function(id, hasRemoteDataChannel) {
		sono.answer(id, hasRemoteDataChannel);
	},

	displayParticipantVideo: function(HTMLElement, id) {
		sono.remoteMedia().renderStream(HTMLElement, id);
	},

	sendMessage: function(message) {
		sono.sendChatMessage(message);
	},

	sendData: function(msg, callee) {
		sono.sendMessageUsingChannel(msg, callee);
	},

	sendFile: function(file, callee) {
		sono.sendFile(file, callee);
	},

	getCapabilities: function() {
		return sono.capabilities();
	},

	isMe: function(id) {
		return (id === sono.ID ? true: false);
	}

};