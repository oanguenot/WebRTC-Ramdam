var View     = require('./view');

module.exports = View.extend({

	tagName: "li",

    className: "message",

	template: require('./templates/message'),

	events: {
	},

	subscriptions: {

    },

    initialize: function(options) {
	},

	afterRender: function(){
	},

	getRenderData: function(){
        return {
            time: moment(this.model.get('time')).format("HH:mm"),
            issuer: this.model.get('issuer'),
            content: this.model.get('content')
        };
    }


});	