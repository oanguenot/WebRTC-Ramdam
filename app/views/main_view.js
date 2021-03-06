var View     = require('./view'),
	media	 = require('../lib/media'),
    me       = require('../lib/me'),
    Participant = require('./participant'),
    Stage = require('./stage'),
    Local = require('./local'),
    IM = require('../models/im'),
    Files = require('../models/files'),
    Message = require('../models/message'),
    File = require('../models/file'),
    MessageUI = require('./message'),
    FileUI = require('./file');

var listOfParticipants = {};

var participantsCaps = {};

var participantOnStageID = null;
var participantOnStage = null;
var participantLocal = null;

var test_id = null;

var im = new IM();

var files = new Files();

var full = false;

var isFullScreen = false;

module.exports = View.extend({
	id: 'main-view',
	template: require('./templates/main'),

	events: {
		'keyup #chatEditor': 'OnChat',
        'submit': "onSubmit",
        'change #fileselect' : 'onFileChange',
        'click .desktopSharingButton': 'onSwitchFeature',
        'click .sendButton': 'OnSendMessage',
        'click .imButton': 'onIMButton',
        'click .fileButton': 'onFileButton',
        'click #shareButton': 'onShareScreen',
        'click .inviteButton': 'onInvite',
        'click #fullButton': 'onFullScreen',
        'click #exitFullScreen': 'onFullScreen'
	},

	subscriptions: {
        'media:participantConnected': 'onParticipantConnected',
        'media:participantAlreadyConnected': 'onParticipantAlreadyConnected',
        'media:participantDisconnected': 'onRemoteVideoEnded',
        'media:participantMessage': 'onParticipantMessage',
        'media:onCallOffered': 'onCallOffered',
        'media:onCallEnded': 'onCallEnded',
        'media:remoteVideoON': 'onRemoteVideoReceived',
        'media:remoteScreenON': 'onRemoteScreenReceived',
        'media:remoteScreenOFF': 'onRemoteScreenEnded',
        //'media:remoteVideoOFF': 'onRemoteVideoEnded',
        'media:onFileReceived': 'onPeerFileReceived',
        'media:localStreamStarted': 'onLocalMediaStarted',
        'media:localScreenStreamStarted': 'onLocalScreenStarted',
        'participant:switch': 'onParticipantSwitch',
        'media:onTransportError': 'onTransportError',
        'media:localScreenStreamError': 'onLocalScreenStreamError'
    },

	initialize: function() {
        this.listenTo(me.getConference(), 'change:title', this.onConferenceTitleChange);

        this.listenTo(im, 'add', this.onAddMessage);

        this.listenTo(files, 'add', this.onAddFile);

        $(window).on("resize", this.onResize);
	},

	afterRender: function(){

        $('body').css({'background-color': '#fff'});

        media.acquireCamera(me.hasAudio(), me.hasVideo());
        this.updateConferenceTitle();

        var maxHeight = window.innerHeight - 75;
        //var maxHeightEmpty = window.innerHeight - 169;
        var maxHeightEmpty = window.innerHeight - 75;

        if(me.getMode() === 'pingme') {
            //this.$('#ramdam-actions').addClass('hidden');   
            //this.$('.middle').addClass('middlePingme');
            //this.$('.right').addClass('rightPingme');
            //this.$('.no-participant').addClass('no-participantPingme'); 
        }
        else {
            //this.$('.appName').text('Ramdam');
        }

        this.$('#data').height(maxHeight);
        this.$('#stage').height(maxHeight);
        this.$('#wrapmiddle').height(maxHeight);
        this.$('#stage').css({'max-height': maxHeight + 'px'});
        this.$('.stage-video').css({'max-height': maxHeight + 'px'});
        this.$('#no-participant').height(maxHeightEmpty);
        this.$('#no-participant').css({'max-height': maxHeightEmpty + 'px'});
        this.$('#no-participant').css({'line-height': maxHeightEmpty + 'px'});
        
        this.$('#fullButton').tooltip();
	},

	getRenderData: function(){
    },

    onFullScreen: function() {

        var maxHeight = window.innerHeight - 75;
        var maxHeightEmpty = window.innerHeight - 75; 

        isFullScreen = !isFullScreen;

        if(isFullScreen) {
            maxHeight = window.innerHeight - 20;
            maxHeightEmpty = window.innerHeight - 20; 
        }

        this.$('.left').toggle('slide');
        this.$('.right').toggle('slide');
        this.$('#header').toggle('slide');

        this.$('#no-participant').height(maxHeightEmpty);
        this.$('#no-participant').css({'max-height': maxHeightEmpty + 'px'});

        this.$('#stage').height(maxHeight);
        this.$('#stage').css({'max-height': maxHeight + 'px'});
        this.$('.stage-video').css({'max-height': maxHeight + 'px'});

        
        if(isFullScreen) {
            this.$("#no-participant").addClass( "no-participant-full", 1000, "easeOutBounce" );
            this.$("#stage").addClass( "middle-full", 1000, "easeOutBounce" );
            this.$('#exitFullScreen').removeClass('hidden', 1000, "easeOutBounce");
        }
        else {
            this.$("#no-participant").removeClass( "no-participant-full", 1000, "easeOutBounce" );
            this.$("#stage").removeClass( "middle-full", 1000, "easeOutBounce" );
            this.$('#exitFullScreen').addClass('hidden', 1000, "easeOutBounce");
        }

        if(this.$('.stage-video') && this.$('.stage-video')[0]) {
            var height = this.$('.stage-video')[0].offsetHeight - 25;
            var width = this.$('.stage-video')[0].offsetWidth - 14;

            this.$('.stage-title').css({'top': height + 'px'});
            this.$('.stage-title').css({'width': width + 'px'});    
        }
        
    },

    onTransportError: function() {
        alert('Oups! There is an error contacting the server. The application will not work!');
    },

    onLocalScreenStreamError: function() {
        if (window.location.protocol != "https:") {
            alert('Oups! HTTPS protocol should be used in order to share your screen');
        }
        else {
            alert('Oups! GetUserMedia flag should be set to activated in chrome://flags');    
        }
    },

    onInvite: function() {

        var name = "Ramdam";
        if(me.getMode() === 'pingme') {
            name = 'OpenTouch Lite';
        }

        var title = "[" + name + "] Invite to join the conference '" + me.getConferenceTitle() + "'";

        var anonymous = 'Anonymous' + Math.floor(Math.random()*100000);

        var body = "Hi, \n\nYou are invited to join the conference '" + me.getConferenceTitle() + "'\n\n";
        
        if(me.getMode() === 'pingme') {
            body += "To join the conference automatically:"
            + "\n- Click on the link below"
            + "\n\n" + document.location.origin +"#ping?un=" + anonymous + "&rn="+ me.getConferenceCode() + "&cn=" + me.getConferenceTitle()
        }
        else {
            body += "To join the conference manually:"
            + "\n- Click on the link below"
            + "\n- Enter a nickname"
            + "\n- Enter your access code:" + me.getConferenceCode()
            + "\n\n" + document.location.origin    
        }
        
        body += "\n\nHave fun"
        + "\n" + name + ","
        + "\nALE International - 2015";

        var mailto_link = 'mailto:' + '?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);

        //window.location.href=mailto_link;
        var win = window.open(mailto_link);
        if(win) {
            setTimeout(function() {
                win.close();
            }, 100);
        }
    },

    onAddFile: function(model) {
        var ui = new FileUI({model: model }).render();

        this.$('#dataList').prepend(ui.el);
    },

    onPeerFileReceived: function(msg) {

        navigator.webkitPersistentStorage.requestQuota(10*1024*1024, function(grantedBytes){

            window.webkitRequestFileSystem(window.TEMPORARY, grantedBytes, function(fs) {
    
                fs.root.getFile(msg.data.info.fileName, {create: true}, function(fileEntry) {
                    // Create a FileWriter object for our FileEntry (log.txt).
                    fileEntry.createWriter(function(fileWriter) {

                        fileWriter.seek(fileWriter.length); // Start write position at EOF.

                        fileWriter.write(msg.data.content);

                        //var link = document.createElement('a');
                        //link.href = fileEntry.toURL();
                        //link.target = '_blank';
                        //link.download = msg.data.info.fileName;
                        //link.innerHTML = msg.data.info.fileName;
                        //document.body.appendChild(link);


                        var nickname = me.nickname();

                        var id = msg.caller.substring(1);

                        if(!media.isMe(id)) {
                            if(id in participantsCaps) {
                                nickname = participantsCaps[id].nickname;
                            }
                        }

                        var file = new File({
                            time: new Date(),
                            issuer: nickname,
                            name: msg.data.info.fileName,
                            size: msg.data.info.size,
                            url: fileEntry.toURL()
                        });

                        files.add(file);

                    }, function(e) {
                        console.log("DEMO :: Error1", e);
                    });

                }, function(ee) {
                    console.log("DEMO :: Error2", ee);
                });

            }, function(eee){
              console.log("DEMO :: Error3", eee);
            });   
        }, function(eeee) {
            console.log("DEMO :: Error4", eeee)
        });
    },

    onShareScreen: function() {
        console.log("aquire");
        media.acquireScreen();
    },

    onLocalScreenStarted: function() {
        for (var prop in participantsCaps) {
            media.screenParticipant(prop);    
        }
    },

    onRemoteScreenReceived: function(msg) {

        var id = 'screen' + msg.id;

        if (participantOnStageID !== id && listOfParticipants[id] === undefined ) {
            console.log(" stream not existing");

        var associatedParticipantCaps = participantsCaps[msg.id];

        var caps = {
            nickname: associatedParticipantCaps.nickname + " (screen)"
        };

        this._addNewParticipantElement(id, caps.nickname);

        msg.id = id;

        this.onRemoteVideoReceived(msg);

        }
        else {
            console.log("stream already exists");
        }
    },

    onRemoteScreenEnded: function(msg) {

        msg.id = 'screen' + msg.id;

        this.onRemoteVideoEnded(msg);
    },

    onResize: function() {

        var maxHeight = window.innerHeight - 75;
        // var maxHeightEmpty = window.innerHeight - 169; 
        var maxHeightEmpty = window.innerHeight - 75; 

        if(isFullScreen) {
            maxHeight = window.innerHeight - 20;
            maxHeightEmpty = window.innerHeight - 20;
        }

        this.$('#data').height(maxHeight);
        this.$('#stage').height(maxHeight);
        this.$('#stage').css({'max-height': maxHeight + 'px'});
        this.$('#wrapmiddle').height(maxHeight);
        this.$('.stage-video').css({'max-height': maxHeight + 'px'});
        this.$('#no-participant').height(maxHeightEmpty);
        this.$('#no-participant').css({'max-height': maxHeightEmpty + 'px'});

        if(this.$('.stage-video') && this.$('.stage-video')[0]) {
            var height = this.$('.stage-video')[0].offsetHeight - 25;
            var width = this.$('.stage-video')[0].offsetWidth - 14;

            this.$('.stage-title').css({'top': height + 'px'});
            this.$('.stage-title').css({'width': width + 'px'});    
        }
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
    	media.callParticipant(id);

        // Create a data Channel
        media.dataParticipant(id);
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

            //this.$('.stage-video').width(window.innerWidth - 600);

            participantOnStageID = id;

            var maxHeight = window.innerHeight - 75;
            this.$('#stage').css({'max-height': maxHeight + 'px'});
            this.$('.stage-video').css({'max-height': maxHeight + 'px'});
        }
        else {

            listOfParticipants[id] = new Participant({ participant: participant, media: media}).render();

            this.$('#participants').append(listOfParticipants[id].el);
        }
    },

    onCallOffered: function(id) {
    	media.answerParticipant(id);
    },

    onCallEnded: function(msg) {

        if(msg.media === 'screen') {
            this.onRemoteScreenEnded(msg);
        }

    },

    onRemoteVideoReceived: function(msg) {
        if(participantOnStageID === msg.id) {
    	    participantOnStage.displayVideo(msg);
        }
        else {
            listOfParticipants[msg.id].displayVideo(msg);
        }
    },

    onRemoteVideoEnded: function(msg) {

        // Remove participant from the array of caps
        participantsCaps[msg.id] = null;
        delete participantsCaps[msg.id];

        // first check if there is a participant on stage
        if(participantOnStageID === msg.id) {
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
            listOfParticipants[msg.id].dispose();
            listOfParticipants[msg.id] = null;
            delete listOfParticipants[msg.id];
        }
    },

    onLocalMediaStarted: function(stream, id) {

        var participant = {
            id: id,
            title: me.nickname()
        };


        participantLocal = new Local({participant: participant, el: this.$('#me')}).render();

        media.renderLocalStream(this.$('#' + id + '-video')[0]);

        this.$('#' + id + '-video').prop('muted', true); 

        var caps = {
            nickname: me.nickname(),
            audio: me.hasAudio(),
            video: me.hasVideo()
        };

        media.connectToServer(caps, me.getConferenceCode());
    },

    onConferenceTitleChange: function() {

        this.$('.title').text(me.getConferenceTitle());

        if(me.getMode() !== "pingme") {
            this.$('.appName').text("Ramdam > " + me.getConferenceCode());
        }
    },

    updateConferenceTitle: function() {

        this.$('.title').text(me.getConferenceTitle());

        if(me.getMode() !== "pingme") {
            this.$('.appName').text("Ramdam > " + me.getConferenceCode());
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

        for (var prop in participantsCaps) {
            media.sendFile(file, prop);
        }

        navigator.webkitPersistentStorage.requestQuota(10*1024*1024, function(grantedBytes){

            window.webkitRequestFileSystem(window.TEMPORARY, grantedBytes, function(fs) {
    
                fs.root.getFile(file.name, {create: true}, function(fileEntry) {
                    // Create a FileWriter object for our FileEntry (log.txt).
                    fileEntry.createWriter(function(fileWriter) {

                        fileWriter.seek(fileWriter.length); // Start write position at EOF.

                        fileWriter.write(file);

                        var f = new File({
                            time: new Date(),
                            issuer: me.nickname(),
                            name: file.name,
                            size: file.size,
                            url: fileEntry.toURL()
                        });

                        files.add(f);

                    });
                });
            }, function(err) {
                console.log("ERR", err);
            });
        }, function(err) {
            console.log("ERR2", err);
        });
    },

    onSwitchFeature: function() {
    
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
        }
    },

    onScreenSharing: function(id) {

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