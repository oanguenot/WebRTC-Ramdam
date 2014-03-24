var View     = require('./view'),
  	template = require('./templates/home'),
    me = require('../lib/me');

var isNicknameReady = false,
    nickname = '';

var isConferenceNameReady = false,
    conferenceTitle = '';

var isConferenceCodeReady = false,
    conferenceCode = '';

var selectedCapability = "full";

module.exports = View.extend({

    id: 'home-view',
    template: template,

    events: {
        'keyup #inputNickname'      : 'onNicknameChanged',
        'keyup #inputCode'          : 'onCodeChanged',
        'keyup #inputTitle'         : 'onTitleChanged',

        'click .capabilitySelector' : 'onCapabilityChange',
        'click .filterCapability'   : 'onCapabilityClick',

        'click #joinExistingButton' : 'onJoinExistingConference',
        'click #joinNewButton'      : 'onJoinNewConference'
    },

/*
    subscriptions: {
        'media:localStreamStarted': 'onLocalMediaStarted'
    },
*/

    initialize: function() {
        this.listenTo(me.getConference(), 'change:id', this.onConferenceIDChange);
    },

    afterRender: function(){
    	//media.acquireCamera();
    },

/*
    onLocalMediaStarted: function(stream) {
    	media.renderStream(this.$('#local-video')[0]);
        isMediaReady = true;
        this.updateJoinButton();
    },
*/

    onJoinRequest: function(e) {
        e.preventDefault();
        
        
    },

    onNicknameChanged: function() {
        nickname = this.$('#inputNickname').val();

        if(nickname.length > 0) {
            isNicknameReady = true;
        }
        else {
            isNicknameReady = false;
        }
        this.updateJoinButton();
    },

    onCodeChanged: function() {
        conferenceCode = this.$('#inputCode').val();

         if(conferenceCode.length > 0) {
            isConferenceCodeReady = true;
        }
        else {
            isConferenceCodeReady = false;
        }
        this.updateJoinButton();
    },

    onTitleChanged: function() {
        conferenceTitle= this.$('#inputTitle').val();

         if(conferenceTitle.length > 0) {
            isConferenceNameReady = true;
        }
        else {
            isConferenceNameReady = false;
        }
        this.updateJoinButton();
    },

    updateJoinButton: function() {
        if(isNicknameReady && isConferenceNameReady) {
            this.$('#joinNewButton').removeAttr("disabled");
        }
        else {
            this.$('#joinNewButton').attr("disabled", "disabled");
        }

        if(isNicknameReady && isConferenceCodeReady) {
            this.$('#joinExistingButton').removeAttr("disabled");
        }
        else {
            this.$('#joinExistingButton').attr("disabled", "disabled");
        }

    },

    onCapabilityChange: function(e) {

        e.preventDefault();

        this.$('.l-' + selectedCapability).removeClass('selected');

        selectedCapability = e.currentTarget.getAttribute('data-capabilities');
        this.$('.l-' + selectedCapability).addClass('selected');
        var text = this.$('.' + selectedCapability).attr('data-text');

        this.$('.selectedCapability').text(text);
        this.$('.selectedCapability').attr('data-capabilities', selectedCapability);
    },

    onCapabilityClick: function(e) {
        e.preventDefault();
    },

    onJoinExistingConference: function(e) {
        e.preventDefault();
        this.goToConference(true);
        
    },

    onJoinNewConference: function(e) {
        e.preventDefault();
        this.goToConference(false);
    },

    goToConference: function(existingConference) {
        var hasAudio = (selectedCapability === 'full' || selectedCapability === 'audio');
        var hasVideo = (selectedCapability === 'full' || selectedCapability === 'video');

        var conferenceInfo = {
            isNewConference: !existingConference,
            conferenceCode: existingConference ? conferenceCode : '',
            conferenceTitle: existingConference ? '' : conferenceTitle
        };

        me.setInfo(nickname, hasAudio, hasVideo);
        me.setConference(conferenceInfo);

        if(existingConference) {
            me.joinExistingConference(me.getConferenceCode());
        }
        else {
            me.createNewConference(me.getConferenceTitle());
        }

    },

    onConferenceIDChange: function() {
        Backbone.Mediator.publish('goto', 'mainPage');
    }
});
