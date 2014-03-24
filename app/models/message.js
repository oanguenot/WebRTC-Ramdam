module.exports = Backbone.Model.extend({
    
	defaults: {
        time: new Date(),
        issuer: '',
        content: ''
    },

    initialize: function(){
    }

});