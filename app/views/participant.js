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

        var that = this;

        this.$('.participant-video')[0].addEventListener('loadedmetadata', function(data) {
            var height = data.target.offsetHeight - 18;
            var width = data.target.offsetWidth - 14;

            that.$('.participant-nickname').css({'top': height + 'px'});
            that.$('.participant-nickname').css({'width': width + 'px'});

        });
	},

	getRenderData: function(){
        return {
            id: this.participant.id,
            title: this.participant.title
        };
    },

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
