var Participant = require('../models/participant'),
	Conference = require('../models/conference');

var me = new Participant(),
	conference = new Conference();

var _mode = "connivence";

me.on('change', function(model) {
	Backbone.Mediator.publish('me:changed', model);
});

module.exports = {
	
	setInfo: function(nickname, hasAudio, hasVideo) {
		me.set({hasAudio: hasAudio, hasVideo: hasVideo, nickname: nickname});
	},

	setConference: function(info) {
		conference.set({title: info.conferenceTitle, room: info.conferenceCode});
	},

	getConference: function() {
		return conference;
	},

	getConferenceTitle: function() {
		return conference.get('title');
	},

	getConferenceCode: function() {
		return conference.get('room');
	},

	setId: function(id) {
		me.set({id: id});
	},

	nickname: function() {
		return me.get('nickname');
	},

	hasAudio: function() {
		return me.get('hasAudio');
	},

	hasVideo: function() {
		return me.get('hasVideo');
	},

	shouldCreateNewConference: function() {
		return (conference.get('room').length === 0 ? true : false);
	},

	setMode: function(mode) {
		_mode = mode;
	},

	getMode: function() {
		return _mode;
	},

	createNewConference: function() {
		$.ajax({
			url: "/conference",
			type: "POST",
			data: {
				title: conference.get('title')
			}
		}).done(function ( data ) {
			conference.set(data);
		}).fail(function ( data ) {
			console.log("ERROR:", data);
		});
	},

	joinExistingConference: function(code) {
		$.ajax({
			url: "/conference/" + code,
			type: "GET",
		}).done(function ( data ) {
			conference.set({'id': data.id, 'title': data.title});
		}).fail(function ( data ) {
			console.log("ERROR:", data);
		});
	},

	createOrJoinConferenceByID: function(roomID, conferenceName) {
		$.ajax({
			url: "/conference/" + roomID,
			type: "POST",
			data: {
				title: conferenceName
			}
		}).done(function ( data ) {
			conference.set(data);
		}).fail(function ( data ) {
			console.log("ERROR:", data);
		});
	}

};

