var View     = require('./view');

var timeoutID = -1;

module.exports = View.extend({

	className: "participant",

	template: require('./templates/local'),

    local: null,

	events: {
	},

	subscriptions: {

    },

    initialize: function(options) {
        local = options.participant;
	},

	afterRender: function(){
		$(this.el).attr('id', this.options.participant.id);

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
            id: this.options.participant.id,
            title: this.options.participant.title
        };
    },

    displayMessage: function(message) {
    	var that = this;

    	this.$('.participant-nickname').fadeOut(function() {
  			$(this).text(message).fadeIn();
		});

    	//this.$('.me-nickname').text(message);
    	this.$('.participant-nickname').attr('title', message);

    	clearTimeout(timeoutID);

    	timeoutID = setTimeout(function() {
			that.$('.participant-nickname').text(that.options.participant.title);
    		that.$('.participant-nickname').attr('title', that.options.participant.title);    		
    	}, 10000);
    },

    getLocal: function() {
        return this.local;
    }



});	
