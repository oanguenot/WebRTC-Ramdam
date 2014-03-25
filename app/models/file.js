module.exports = Backbone.Model.extend({
    
	defaults: {
        time: new Date(),
        issuer: '',
        name: '',
        size: ''
    },

    initialize: function(){
    }

});