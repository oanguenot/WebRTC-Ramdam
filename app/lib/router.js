var application = require('application'),
    me = require('./me');


function getQueryParams(qs) {
    qs = qs.split("+").join(" ");

    var params = {}, tokens = true, re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens) {
        tokens = re.exec(qs);
        if (tokens) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }
    }

    return params;
};

Backbone.Mediator.subscribe('goto', function(route) {
    application.route(route);
});

module.exports = Backbone.Router.extend({
    routes: {
        '': 'home',
        'ping?:querystring': 'onPing',
        'mainPage': 'mainPage'
    },
    
    home: function() {
        $('body').html(application.homeView.render().el)
    },

    mainPage: function() {
    	$('body').html(application.mainView.render().el);
    },

    onPing: function() {

        // #ping?un=Olivier&rn=123456&cn=New%20Conference
        var url = window.location.hash.substr(5);

        params = getQueryParams(url);

        me.setMode("pingme");

        me.setInfo(params.un, true, true);
        me.setConference(
            { 
                conferenceCode: '',
                conferenceTitle: params.cn
            }
        );

        me.createOrJoinConferenceByID(params.rn, params.cn);
        
    }
});
