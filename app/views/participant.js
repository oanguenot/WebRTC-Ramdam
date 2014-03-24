var View     = require('./view');

var timeoutID = -1;

module.exports = View.extend({

	tagName: "li",

    participant: null,

    media: null,

    className: "participant",

	template: require('./templates/participant'),

	events: {
		'dblclick .participant-video': 'onVideoSwitch'
	},

	subscriptions: {

    },

    initialize: function(options) {
		this.media = options.media;
        this.participant = options.participant;
	},

	afterRender: function(){
	},

	getRenderData: function(){
        return {
            id: this.participant.id,
            title: this.participant.title
        };
    },

/*
    displayMessage: function(message) {
    	var that = this;

    	this.$('.participant-nickname').fadeOut(function() {
  			$(this).text(message).fadeIn();
		});

    	//this.$('.me-nickname').text(message);
    	this.$('.participant-nickname').attr('title', message);

    	clearTimeout(timeoutID);

    	timeoutID = setTimeout(function() {
			that.$('.participant-nickname').text(that.options.participant.nickname);
    		that.$('.participant-nickname').attr('title', that.options.participant.nickname);    		
    	}, 10000);
    },

    onVideoClick: function() {
    },
*/

    displayVideo: function() {
        this.media.displayParticipantVideo(this.$('.participant-video')[0], this.participant.id);
    },

    onVideoSwitch: function() {
        Backbone.Mediator.publish('participant:switch', this.participant.id);
    },

    getParticipant: function() {
        return this.participant;
    },

     switchParticipant: function(participant) {
        this.participant = participant;
        this.updateTitle();
        this.displayVideo();
    },

    updateTitle: function() {
        this.$('.participant-nickname').text(this.participant.title);
    },


});	
