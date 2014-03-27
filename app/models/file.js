module.exports = Backbone.Model.extend({
    
	defaults: {
        time: new Date(),
        issuer: '',
        name: '',
        size: '',
        url: ''
    },

    initialize: function(){
    }

});