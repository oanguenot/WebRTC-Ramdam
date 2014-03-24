// Application bootstrapper.
Application = {
    initialize: function() {
        
        var HomeView = require('views/home_view'),
        	MainView = require('views/main_view'),
        	Router   = require('lib/router');

        this.homeView = new HomeView();
        this.mainView = new MainView();
        this.router   = new Router();
        
        if (typeof Object.freeze === 'function') Object.freeze(this)
        
    },

	route: function(route) {
	    this.router.navigate(route, {trigger:true});
	}
}

module.exports = Application;
