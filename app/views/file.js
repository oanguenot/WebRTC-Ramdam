var View = require('./view');

module.exports = View.extend({

	tagName: "li",

    className: "file",

	template: require('./templates/file'),

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
            name: this.model.get('name'),
            size: this.getFileSize(this.model.get('size')),
            url: this.model.get('url')
        };
    },

    getFileSize: function(size) {
        return (Math.floor(parseInt(size) / 1000) + ' Ko'); 
    }
});