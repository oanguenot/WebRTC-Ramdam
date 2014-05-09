var View     = require('./view');

var media = null;

module.exports = View.extend({

    tagName: 'div',

	template: require('./templates/stage'),

    className: 'stage-sub',

    stage: null,

	events: {
	},

	subscriptions: {

    },

    initialize: function(options) {
		media = options.media;
        this.stage = options.stage;
	},

	afterRender: function(){
        var that = this;

        this.$('.stage-video')[0].addEventListener('loadedmetadata', function(data) {
            var height = data.target.offsetHeight - 25;
            var width = data.target.offsetWidth - 14;

            that.$('.stage-title').css({'top': height + 'px'});
            that.$('.stage-title').css({'width': width + 'px'});
        });

        

	},

	getRenderData: function(){
        return {
            id: this.options.stage.id,
            title: this.options.stage.title
        };
    },

    displayVideo: function(msg) {
    	media.displayParticipantVideo(this.$('.stage-video')[0], this.stage.id);
    },

    stopVideo: function() {
    	this.$('.stage-video')[0].src = '';
    },

    switchParticipant: function(participant) {
        this.stage = participant;
        this.updateTitle();
        this.displayVideo();
    },

    updateTitle: function() {
    	this.$('.stage-title').text(this.stage.title);
    },

    getStage: function() {
        return this.stage;
    }

});	
