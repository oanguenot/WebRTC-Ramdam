module.exports = Backbone.Model.extend({
    
	defaults: {
        id: '',
        hasAudio: false,
        hasvideo: false,
        nickname: '',
        size:'participant',
        date: new Date(),
    },

    initialize: function(){
    }

});