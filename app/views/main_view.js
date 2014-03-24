var View     = require('./view'),
	media	 = require('../lib/media'),
    me       = require('../lib/me'),
    Participant = require('./participant'),
    Stage = require('./stage'),
    Local = require('./local'),
    IM = require('../models/im'),
    Message = require('../models/message'),
    MessageUI = require('./message');

var listOfParticipants = {};

var participantsCaps = {};

var participantOnStageID = null;
var participantOnStage = null;
var participantLocal = null;

var test_id = null;

var im = new IM();

var full = false;

module.exports = View.extend({
	id: 'main-view',
	template: require('./templates/main'),

	events: {
		'keyup #chatEditor': 'OnChat',
        'submit': "onSubmit",
        'change #fileselect' : 'onFileChange',
        'click .desktopSharingButton': 'onStartDesktopSharing',
        'click .sendButton': 'OnSendMessage',
        'click .imButton': 'onIMButton',
        'click .fileButton': 'onFileButton'
	},

	subscriptions: {
        'media:participantConnected': 'onParticipantConnected',
        'media:participantAlreadyConnected': 'onParticipantAlreadyConnected',
        'media:participantDisconnected': 'onRemoteVideoEnded',
        'media:participantMessage': 'onParticipantMessage',
        'media:onCallOffered': 'onCallOffered',
        'media:remoteVideoON': 'onRemoteVideoReceived',
        'media:localStreamStarted': 'onLocalMediaStarted',
        'participant:switch': 'onParticipantSwitch'
    },

	initialize: function() {
        this.listenTo(me.getConference(), 'change:title', this.onConferenceTitleChange);

        this.listenTo(im, 'add', this.onAddMessage);

        $(window).on("resize", this.onResize);
	},

	afterRender: function(){
        media.acquireCamera(me.hasAudio(), me.hasVideo());
        this.updateConferenceTitle();

        this.$('#data').height(window.innerHeight - 120);
        this.$('#stage').height(window.innerHeight - 100);
        this.$('#no-participant').height(window.innerHeight - 213);
	},

	getRenderData: function(){
    },

    onResize: function() {
        this.$('#data').height(window.innerHeight - 120);
        this.$('#stage').height(window.innerHeight - 100);
        this.$('#no-participant').height(window.innerHeight - 213);
    },

    onParticipantConnected: function(id, caps) {

        //Store participants capabilities
        participantsCaps[id] = caps;

        // Display this participant
        this._addNewParticipantElement(id, caps.nickname);
    },

    onParticipantAlreadyConnected: function (id, caps) {
        // Store participants capabilities
        participantsCaps[id] = caps;

        // Display this participant
    	this._addNewParticipantElement(id, caps.nickname);

    	// Call this participant
    	media.callParticipant(id, caps.mediaCaps.canShareData || false);
    },

    onParticipantDisconnected: function(id) {

    },

    _addExistingParticipantOnList: function(participant) {

        listOfParticipants[participant.id] = new Participant({ participant: participant, media: media}).render();

        this.$('#participants').append(listOfParticipants[participant.id].el);

        listOfParticipants[participant.id].displayVideo();
    },

    _addNewParticipantElement: function(id, nickname) {

        test_id = id;

        var participant = {
            id: id,
            title: nickname
        };

        if(!participantOnStage) {

            this.$('#no-participant').css('display', 'none');

            participantOnStage = new Stage({ stage: participant, media: media}).render();

            this.$('#stage').append(participantOnStage.el);

            participantOnStageID = id;
        }
        else {

            listOfParticipants[id] = new Participant({ participant: participant, media: media}).render();

            this.$('#participants').append(listOfParticipants[id].el);
        }
    },

    onCallOffered: function(id) {
    	media.answerParticipant(id, participantsCaps[id].mediaCaps.canShareData || false);
    },

    onRemoteVideoReceived: function(id) {
        if(participantOnStageID === id) {
    	    participantOnStage.displayVideo();
        }
        else {
            listOfParticipants[id].displayVideo();
        }
    },

    onRemoteVideoEnded: function(id) {

        // Remove participant from the array of caps
        participantsCaps[id] = null;
        delete participantsCaps[id];

        // first check if there is a participant on stage
        if(participantOnStageID === id) {
            participantOnStage.stopVideo();

            if(_.size(listOfParticipants) > 0) {
                // Switch from participant to stage 
                for (var participantID in listOfParticipants) {

                    participant = listOfParticipants[participantID].getParticipant();

                    participantOnStage.switchParticipant(participant);
                    participantOnStageID = participantID;

                    listOfParticipants[participantID].dispose();
                    listOfParticipants[participantID] = null;
                    delete listOfParticipants[participantID];
                    break;
                }
            }
            else {
                participantOnStage.dispose();
                participantOnStage = null;
                participantOnStageID = '';

                this.$('#no-participant').css('display', 'block');
            }
        }
        else {
            listOfParticipants[id].dispose();
            listOfParticipants[id] = null;
            delete listOfParticipants[id];
        }
    },

    onLocalMediaStarted: function(stream, id) {

        var participant = {
            id: id,
            title: me.nickname()
        };

        participantLocal = new Local({participant: participant, el: this.$('#me')}).render();

        media.renderLocalStream(this.$('#' + id + '-video')[0]);

        var caps = {
            nickname: me.nickname(),
            audio: me.hasAudio(),
            video: me.hasVideo(),
            mediaCaps: media.getCapabilities()
        };

        media.connectToServer(caps, me.getConferenceCode());
    },

    onConferenceTitleChange: function(data) {
        if(me.getMode() === "connivence") {
            this.$('.title').text(me.getConferenceTitle() + ' (' + me.getConferenceCode() + ')');
        }
        else {
            this.$('.title').text(me.getConferenceTitle());   
        }
    },

    updateConferenceTitle: function() {
        if(me.getMode() === "connivence") {
            this.$('.title').text(me.getConferenceTitle() + ' (' + me.getConferenceCode() + ')');
        }
        else {
            this.$('.title').text(me.getConferenceTitle());   
        }
    },

    OnChat: function(e) {
        e.stopPropagation();
        if (e.keyCode == 13) {
            e.preventDefault();
            var message = this.$('.chatInput').val();

            if(message.length > 0) {
                media.sendMessage(message);    
            }

            this.$('.chatInput').val('');
        }
    },

    OnSendMessage: function() {
         var message = this.$('.chatInput').val();

        if(message.length > 0) {
            media.sendMessage(message);    
        }

        this.$('.chatInput').val('');
    },

    onSubmit: function(e) {
        e.preventDefault();
    },

    onParticipantMessage: function(id, message) {

        var nickname = me.nickname();

        if(!media.isMe(id)) {
            if(id in participantsCaps) {
                nickname = participantsCaps[id].nickname;
            }
        }

        var msg = new Message({
            time: new Date(),
            issuer: nickname,
            content: message
        });

        im.add(msg);
    },

    onFileChange: function(evt) {

        var file = evt.target.files[0];

        console.log("Send file", file);

/*
        var reader = new FileReader();

        var that = this;

        reader.onload = function(file) {

            if(reader.readyState == FileReader.DONE) {
                 that.sendBlob(new Blob([file.target.result]));
            }
        };

        reader.readAsArrayBuffer(file);
*/
        media.sendFile(file, test_id);

    },

   

    onStartDesktopSharing: function() {
    
        if(!full) {
            this.$('#data').addClass('effect');
            this.$('#stage').css('margin-right','10px');
            this.$('.desktopSharingButton').text('<');
            //$('.stage-video').css('height','100%');
        }
        else {
            this.$('#data').removeClass('effect');
            this.$('#stage').css('margin-right','400px');
            this.$('.desktopSharingButton').text('>');
            //$('.stage-video').css('height','auto');
        }

        full = !full;

    //media.acquireScreen();
       


    },

    onParticipantSwitch: function(id) {
        var stage = null,
            participant = null;

        // If stage video exists, switch it to participant
        if(participantOnStageID) {
            stage = participantOnStage.getStage();
            participant = listOfParticipants[id].getParticipant();
            view = listOfParticipants[id];
            
            // Update stage
            participantOnStage.switchParticipant(participant);
            participantOnStageID = participant.id;

            //update participant
            listOfParticipants[id] = null;
            delete listOfParticipants[id];

            listOfParticipants[stage.id] = view;
            view.switchParticipant(stage);
 c        }
    },

    onAddMessage: function(model) {

        var ui = new MessageUI({model: model }).render();

        this.$('#dataList').prepend(ui.el);
    },

    onIMButton: function() {
        this.$('#fileList').addClass('hiddenList');
        this.$('#dataList').removeClass('hiddenList');

        this.$('#imButton').removeClass('unselectedTab').addClass('selectedTab');
        this.$('#fileButton').removeClass('selectedTab').addClass('unselectedTab');

        this.$('.chatForm').removeClass('hiddenList');
        this.$('.fileUploadButton').addClass('hiddenList');
    },

    onFileButton: function() {
        this.$('#dataList').addClass('hiddenList');
        this.$('#fileList').removeClass('hiddenList');

        this.$('#fileButton').removeClass('unselectedTab').addClass('selectedTab');
        this.$('#imButton').removeClass('selectedTab').addClass('unselectedTab');

        this.$('.chatForm').addClass('hiddenList');
        this.$('.fileUploadButton').removeClass('hiddenList');
    }	
});	