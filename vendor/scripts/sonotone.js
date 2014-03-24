/* 

sonotone.js - v0.4.3
WebRTC library for building WebRTC application
Build date 2013-11-21
Copyright (c) 2013, Olivier Anguenot

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/

(function(){var root = this;

 /**
 * Sonotone namespace.
 *
 * @namespace
 */

var Sonotone;

//Export module
if (typeof exports !== 'undefined') {
    Sonotone = exports;
} else {
    Sonotone = root.Sonotone = {};
}

/**
 * Version
 * 
 * @api public
 */

Sonotone.VERSION = '0.4.3';

/**
 * ID
 *
 * @api public
 */

Sonotone.ID = new Date().getTime();

/**
 * Debug
 * True to display debug logs
 *
 * @api public
 */

Sonotone.debug = false;

/**
 * Activate or not STUN
 * enableSTUN = false when using in an internal LAN
 * enableSTUN = true otherwise
 */

Sonotone.enableSTUN = true;

/**
 * Is the browser audio/video compliant with WebRTC
 *
 * @api public
 */

Sonotone.isAudioVideoCompliant = false;

/**
 * Is the browser sharing compliant with WebRTC
 *
 * @api public
 */

Sonotone.isSharingCompliant = false;

/**
 * Is the browser able to view a desktop shared using WebRTC
 *
 * @api public
 */

Sonotone.isSharingViewerCompliant = false;

/**
 * Is the browser compliant with the DataChannel
 *
 * @api public
 */

Sonotone.isDataChannelCompliant = false;

/**
 * Browser detected: chrome, firefox or unknown
 *
 * @api public
 */

Sonotone.browser = "Unknown";

/**
 * Version of the browser detected: XX or Unkown
 *
 * @api public
 */

Sonotone.browserVersion = "Unknown";

/**
 * Is the protocol HTTPS used ?
 *
 * @api public
 */

Sonotone.isHTTPS = false;

/**
 * Logger
 *
 * @api private
 */

Sonotone.log = function(cat, msg, arg) {

    if(Sonotone.debug) {

        var color = {
            "SONOTONE.IO": "orange",
            "LOCALMEDIA": "blue",
            "TRANSPORT": 'green',
            "PEERCONNECTION": 'Maroon',
            "REMOTEMEDIA": "MediumPurple",
            "TODO": "cyan",
            "DATACHANNEL": "Crimson"
        };

        var time = new Date();

        if(arg !== undefined) {
            console.log("%c|'O~O'| " + time.toLocaleTimeString() + ":" + time.getMilliseconds() + " [" + cat + "] - " + msg + " | %O", "color:" + color[cat], arg);
        }
        else {
         console.log("%c|'O~O'| " + time.toLocaleTimeString() + ":" + time.getMilliseconds() + " [" + cat + "] - " + msg, "color:" + color[cat]);   
        }
    }
};

/**
 * Adapter function for Mozilla and Chrome
 *
 * Chrome 28+
 * Firefox 22+
 */

Sonotone.adapter = function() {

    // Detect if HTTPS protocol is used
    Sonotone.isHTTPS = window.location.protocol === "http:" ? false : true;

    if(navigator.mozGetUserMedia && window.mozRTCPeerConnection) {
        // Firefox: Can make call but not sharing
        Sonotone.isAudioVideoCompliant = true;
        Sonotone.isSharingCompliant = false;
        Sonotone.isSharingViewerCompliant = true;
        Sonotone.isDataChannelCompliant = false;

        Sonotone.browser = "Firefox";

        Sonotone.browserVersion = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);

        Sonotone.getUserMedia = navigator.mozGetUserMedia.bind(navigator); 

        Sonotone.RTCPeerConnection = window.mozRTCPeerConnection; 

        Sonotone.RTCSessionDescription = window.mozRTCSessionDescription;
        Sonotone.RTCIceCandidate = window.mozRTCIceCandidate;

        Sonotone.constraints = {optional: [{RtpDataChannels: true}]};

        Sonotone.attachToMedia = function(element, stream) {
            element.mozSrcObject = stream;
            element.play();
        };

        Sonotone.STUN = {"iceServers": [{"url": "stun:stun.services.mozilla.com"}]};

    }
    else if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection) {
        // Chrome: can make call or Sharing
        Sonotone.isAudioVideoCompliant = true;
       
        Sonotone.isSharingViewerCompliant = true;

        Sonotone.isSharingCompliant = true;

        Sonotone.browser = "Chrome";

        Sonotone.browserVersion = parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);
        
        Sonotone.isDataChannelCompliant = false;

        if(Sonotone.browserVersion >= 31) {
            Sonotone.isDataChannelCompliant = true;
        }

        Sonotone.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);

        Sonotone.RTCSessionDescription = window.RTCSessionDescription;
        Sonotone.RTCIceCandidate = window.RTCIceCandidate;

        Sonotone.RTCPeerConnection = window.webkitRTCPeerConnection;

        Sonotone.constraints = {optional: [{DtlsSrtpKeyAgreement: true}]};

        // {RtpDataChannels: true }

        Sonotone.attachToMedia = function(element, stream) {
            if (typeof element.srcObject !== 'undefined') {
                element.srcObject = stream;
            } else if (typeof element.mozSrcObject !== 'undefined') {
                element.mozSrcObject = stream;
            } else if (typeof element.src !== 'undefined') {
                element.src = window.URL.createObjectURL(stream);
            } else {
                Sonotone.log("SONOTONE.IO", "Error attaching stream to HTML Element");
            }
        };

        Sonotone.STUN = {
            iceServers: [
                {
                    url: "stun:stun.l.google.com:19302"
                }
            ]
        };
    } else {
        // Others browsers: can do nothing
        Sonotone.isAudioVideoCompliant = false;
        Sonotone.isSharingCompliant = false;
        Sonotone.isSharingViewerCompliant = false;
        Sonotone.isDataChannelCompliant = false;
        Sonotone.log("SONOTONE.IO", "Started on a not compliant browser. Sorry you can't use sonotone.IO");
    }
};

/**
* Merge media constraints
*
* @api private
*/

Sonotone.mergeConstraints = function(cons1, cons2) {
    var merged = cons1;
    for (var name in cons2.mandatory) {
      merged.mandatory[name] = cons2.mandatory[name];
    }
    merged.optional.concat(cons2.optional);
    return merged;
};

// Call the adapter
Sonotone.adapter();/**
 * IO namespace.
 * @param {String} id The ID of the user
 *
 * @namespace
 */

var IO = Sonotone.IO = function(id) {

    // Display Sonotone.IO version in logs
    Sonotone.log("SONOTONE.IO", "Running v" + Sonotone.VERSION);

    // Display Browser version
    Sonotone.log("SONOTONE.IO", "Started on " + Sonotone.browser  + " v" + Sonotone.browserVersion);

    /**
     * Sonotone ID
     *
     * @api public
     */

    Sonotone.ID = id;

    /**
     * Transport to use
     *
     * @api private
     */

    this._transport = null;

    /**
     * Local stream
     *
     * @api private
     */

    this._localMedia = new Sonotone.IO.LocalMedia();

    /**
     * Remote stream
     *
     * @api private
     */

    this._remoteMedia = new Sonotone.IO.RemoteMedia();

    /**
     * List of created Peerconnections
     *
     * @api private
     */

    this._peerConnections = {};

     /**
     * Store the temp offer (in case of answering the call)
     *
     * @api private
     */
    
    this._tmpOffer = null;

    /**
     * Store the temp ICE Candidate in case of Answer not created yet
     *
     * @api private
     */

    this._tmpCandidate = [];

    /**
     * Events
     *
     * @api private
     */

    this._callbacks = new Sonotone.IO.Events();

    //Initialization event
    this._subscribeToLocalStreamEvent();
    this._subscribeToRemoteStreamEvent();

};

/**
 * IO interface.
 *
 */

IO.prototype = {

    /**
     * Get or set the transport
     * @param {String} name The transport name
     * @param {Object} config The JSON Configuration of the transport
     * @return {Object} the Sonotone.IO.<xxx>Transport Object
     *
     * @api public
     */

    transport: function(name, config) {

        if(name !== undefined && config !== undefined) {

            switch (name) {
                case "websocket":
                    this._transport = new Sonotone.IO.WebSocketTransport(config);
                    break;
                case "socketio":
                    this._transport = new Sonotone.IO.SocketIOTransport(config);
                    break;
                case "sip":
                     this._transport = new Sonotone.IO.SIPTransport(config);
                    break;
                case "remote":
                    this._transport = new Sonotone.IO.RemoteTransport(config);
                    break;
            }

            this._subscribeToTransportEvent();
        }

        return this._transport;
    },

    /**
     * Get/Create the localstream
     * @return {Object} The Sonotone.IO.LocalMedia object
     *
     * @api public
     */

    localMedia: function() {
        if(!this._localMedia) {
            this._localMedia = new Sonotone.IO.LocalMedia();
            this._subscribeToLocalStreamEvent();
        }

        return this._localMedia;
    },

    /**
     * Get/Create the remoteMedia
     * @return {Object} The Sonotone.IO.RemoteMedia object
     *
     * @api public
     */

    remoteMedia: function() {
        if(!this._remoteMedia) {
            this._remoteMedia = new Sonotone.IO.RemoteMedia();
            this._subscribeToRemoteStreamEvent();
        }

        return this._remoteMedia;
    },

    /**
     * Manage the PeerConnections
     * Get/Create a PeerConnection
     * @param {String} id The ID of the PeerConnection (= the ID or the recipient)
     * @param {Object} caps The remote peer capabilities
     *
     * @api public
     */

    peerConnections: function(id, caps) {
        if(this._peerConnections[id] === undefined) {
            this._peerConnections[id] = new Sonotone.IO.PeerConnection(id, caps);
            this._subscribeToPeerConnectionEvent(this._peerConnections[id]);
        }

        return this._peerConnections[id];
    },

    /**
     * Send a message thu the transport
     * @param {String} msg The content to send
     *
     * @api public
     */

    sendChatMessage: function(msg) {
        if(this._transport) {

            var message = {
                data: {
                    type: 'chat',
                    content: msg
                },
                caller: Sonotone.ID,
                callee: 'all'
            };

            this._transport.send(message);
        }
    },

    /**
     * Send a message thu the transport
     * @param {JSON} msg The content to send
     * @param {String} to The recipient or null for all participants
     *
     * @api public
     */

    sendMessage: function(msg, to) {
        if(this._transport) {

            var message = {
                data: {
                    type: 'data',
                    content: msg
                },
                caller: Sonotone.ID,
                callee: to || 'all'
            };
            
            this._transport.send(message);
        }
    },

    /**
     * Send a file to a remote peer using dataChannel
     * @param {Object} file The file to send
     * @param {String} to The recipient or null for all participants
     *
     * @api public
     */

    sendFile: function(file, callee) {
        var peer = null;

        if(callee) {
            peer = this.peerConnections(callee);
            peer.sendFile(file);
        }
        else {

        }
    },

    /**
     * Try to call an other peer
     * @param {String} callee The recipient ID
     * @param {Boolean} hasRemoteDataChannel True if the remote peer can use Data-Channel
     *
     * @api public
     */

    call: function(callee, hasRemoteDataChannel) {
        var peer = this.peerConnections(callee, hasRemoteDataChannel);
        peer.attach(this.localMedia().streamVideo());
        peer.createOffer(this.localMedia().isScreenCaptured());
    },

    /**
     * Try to answer a call from an other peer
     * @param {String} caller The caller ID
     * @param {Boolean} hasRemoteDataChannel True if the remote peer can use Data-Channel
     *
     * @api public
     */

     answer: function(caller, hasRemoteDataChannel) {
        var peer = this.peerConnections(caller, hasRemoteDataChannel);
        peer.attach(this.localMedia().streamVideo());
        peer.setRemoteDescription(new Sonotone.RTCSessionDescription(this._tmpOffer));
        peer.createAnswer();
     },


    /**
     * Try to broadcast a call to all peers in order to diffuse
     * the video stream to all other
     * @param {Array} recipients The list of peers to broacast
     *
     * @api public
     */

    broadcastCall: function(callees) {
        for (var i=0;i<callees.length;i++) {
            var peer = this.peerConnections(callees[i]);
            peer.attach(this.localMedia().streamVideo());
            peer.createOffer(this.localMedia().isScreenCaptured());
        }
    },

    /**
     * Release the call
     * 
     * @api public
     */

    releaseCall: function() {
        this.localMedia().release();
    },

    /**
     * Subscribe to IO events
     * @param {String} eventName The event to subscribe
     * @param {Function} callbackFunction The function to call
     * @param {Object} context The context to use when calling the callback function
     *
     * @api public
     */

    on: function(eventName, callbackFunction, context) {
        this._callbacks.on(eventName, callbackFunction, context);
    },

    setSTUNServer: function(stun) {
        Sonotone.STUN = {"iceServers": [{"url": stun}]};
    },

    capabilities: function() {
        return {
            canViewVideo: Sonotone.isAudioVideoCompliant,
            canShareVideo: Sonotone.isAudioVideoCompliant,
            canViewScreen: Sonotone.isSharingViewerCompliant,
            canShareScreen: Sonotone.isSharingCompliant && Sonotone.isHTTPS,
            canShareData: Sonotone.isDataChannelCompliant
        };
    },

    /**
     * Subscribe to transport event
     *
     * @api private
     */

    _subscribeToTransportEvent: function() {
        if(this._transport) {

            this._transport.on('onReady', function() {
                Sonotone.log("SONOTONE.IO", "Transport successfully connected");
            }, this);

            this._transport.on('onMessage', function(msg) {
                Sonotone.log("SONOTONE.IO", "Received from Transport: " + msg.data.type);

                switch (msg.data.type) {
                    case 'join':
                        this._callbacks.trigger('onPeerConnected', {id: msg.caller, caps: msg.data.caps});
                        break;
                     case 'already_joined':
                        this._callbacks.trigger('onPeerAlreadyConnected', {id: msg.caller, caps: msg.data.caps});
                        break;
                    case 'release':
                        this._callbacks.trigger('onPeerDisconnected', msg.caller);
                        //this._removePeer(msg.caller);
                        break;
                    case 'offer':
                        this._tmpOffer = msg.data;
                        this._callbacks.trigger('onCallOffered', msg.caller);
                        break;
                    case 'answer':
                        this._callbacks.trigger('onCallAnswered', msg.caller);
                        this.peerConnections(msg.caller).setRemoteDescription(new Sonotone.RTCSessionDescription(msg.data));
                        break;
                    case 'candidate':
                        if(this.peerConnections(msg.caller).answerCreated || this.peerConnections(msg.caller).isCaller) {
                            if(!this.peerConnections(msg.caller).isConnected) {
                                this.peerConnections(msg.caller).addIceCandidate(msg.data);
                            }
                            else {
                                Sonotone.log("SONOTONE.IO", "Don't add this Candidate because PEERCONNECTION <" + msg.caller + "> is already connected");
                            }
                        }
                        else {
                            Sonotone.log("SONOTONE.IO", "ANSWER not yet created. Store Candidate for future usage");
                            this._tmpCandidate.push(msg.data);
                        }
                        break;
                    case 'chat':
                         this._callbacks.trigger('onPeerChat', {id: msg.caller, content: msg.data.content});
                        break;
                    case 'bye':
                        this._callbacks.trigger('onCallEnded', msg.caller);
                        break;
                }

            }, this);

            this._transport.on('onClose', function() {
                Sonotone.log("SONOTONE.IO", "Transport connection closed");
            }, this);  

            this._transport.on('onError', function(msg) {
                Sonotone.log("SONOTONE.IO", "Transport error:" + JSON.stringify(msg));
            }, this);

        }
        else {
            Sonotone.log("SONOTONE.IO", "No Transport!!!");
        }
    },

    /**
     * Subscribe to LocalStream event
     *
     * @api private
     */

    _subscribeToLocalStreamEvent: function() {

        if(this._localMedia) {

            var that = this;

            this._localMedia.on('onLocalStreamStarted', function() {
                Sonotone.log("SONOTONE.IO", "Local Media successfully initialized");

            }, this);

            this._localMedia.on('onLocalStreamEnded', function() {
                Sonotone.log("SONOTONE.IO", "Local Media stopped");

                for(var peerID in this._peerConnections) {
                    that.peerConnections(peerID).detach(that.localMedia().stream());

                    //Inform other (SIG) about stopping call
                    that.sendMessage(
                        {
                            data: {
                                type: 'bye',
                            },
                            caller: Sonotone.ID,
                            callee: that.peerConnections(peerID).ID()
                        }
                    );

                }

            }, this);

            this._localMedia.on('onLocalStreamError', function(err) {
                Sonotone.log("SONOTONE.IO", "Error on Local Media: " + err);
            }, this);
        }
        else {
            Sonotone.log("SONOTONE.IO", "No LocalStream!!!");
        }
    },

    /**
     * Subscribe to RemoteStream event
     *
     * @api private
     */

    _subscribeToRemoteStreamEvent: function() {
        if(this._remoteMedia) {

        }
        else {
            Sonotone.log("SONOTONE.IO", "No RemoteStream!!!");
        }
    },

    /**
     * Subscribe to PeerConnection event
     * @param {Object} peer The PeerConnection to subscribe
     */

    _subscribeToPeerConnectionEvent: function(peer) {

        // Listen to candidates
        peer.on('onICECandiateReceived', function(event) {
            Sonotone.log("SONOTONE.IO", "Send ICE Candidate received by Peer Connection <" + peer.ID() + ">");

            if(!peer.isConnected) {

                var message = {
                    data: {
                        type: 'candidate',
                        label: event.candidate.sdpMLineIndex,
                        id: event.candidate.sdpMid,
                        candidate: event.candidate.candidate
                    },
                    caller: Sonotone.ID,
                    callee: peer.ID()
                };

                this._transport.send(message);
            }
            else {
                Sonotone.log("SONOTONE.IO", "Do not send ICE Candidate because Peer Connection <" + peer.ID() + "> is already connected");
            }

        }, this);

        // Listen to end of candidate
        peer.on('onICECandidateEnd', function() {
            if(this._tmpCandidate !== null && this._tmpCandidate.length > 0) {

                Sonotone.log("SONOTONE.IO", "Add previously stored Candidate to PeerConnection <" + peer.ID() + ">");

                for(var i=0;i<this._tmpCandidate.length;i++) {
                    this.peerConnections(peer.ID()).addIceCandidate(this._tmpCandidate[i]);
                }
                this._tmpCandidate = [];
            }
            else {
                Sonotone.log("SONOTONE.IO", "All Candidates have been added to PeerConnection <" + peer.ID() + ">");
            }
        }, this);

        // Listen to new remote stream
        peer.on('onRemoteStreamReceived', function(event) {

            Sonotone.log("SONOTONE.IO", "Create the Remote Media with this remote stream received");

            this._remoteMedia.stream(event.stream, peer.ID());

        }, this);

        // Listen to end of remote stream
        peer.on('onRemoteStreamEnded', function() {
            Sonotone.log("SONOTONE.IO", "Remote Stream ended");
        }, this);

        // Listen to Offer to send 
        peer.on('onSDPOfferToSend', function(event) {

            // Send this message to the remote peer
            this._transport.send(event);

        }, this);

        // Listen to Answer to send
        peer.on('onSDPAnswerToSend', function(event) {

            // Send this message to the remote peer
            this._transport.send(event);

        }, this);

        // Listen to ICE Connection state change
        peer.on('onIceConnectionStateChanged', function(state) {

            switch(state) {

                //Checking
                case "checking":
                    break;

                // Connection OK
                case "connected":
                    this.peerConnections(peer.ID()).isConnected = true;
                    this._callbacks.trigger('onCallStarted', peer.ID());

                    var pc = this.peerConnections(peer.ID()).peer();
                    var streams = null;

                    if (typeof pc.getRemoteStreams === 'function') {
                        streams = pc.getRemoteStreams();
                    }
                    else {
                        streams = pc.remoteStreams;
                    }

                    if(streams.length > 0) {
                        // Store this new remote media associated to this peer Connection
                        this._remoteMedia.stream(streams[0], peer.ID());
                    }
                    break;

                // Disconnected by the other peer
                case "disconnected":
                    this.peerConnections(peer.ID()).isConnected = false;
                    this.peerConnections(peer.ID()).close();
                    break;

                // PeerConnection closed
                case "closed":
                    this._removePeer(peer.ID());
                    break;
            }

        }, this);

         // Listen to Answer to send
        peer.on('onFileReceived', function(event) {

            console.log("io");

            var msg = {
                issuer: peer.ID(),
                data: event
            };

            this._callbacks.trigger('onFileReceived', msg);

        }, this);
    
    },

    /**
     * Remove a PeerConnection from the list of existing PeerConnections
     * @param {String} id The ID of the PeerConnection to remove
     *
     * @api private
     */

    _removePeer: function(id) {
        this._peerConnections[id] = null;
        delete this._peerConnections[id];
    }

};/**
 * LocalMedia namespace.
 *
 * @namespace
 */

var LocalMedia = Sonotone.IO.LocalMedia = function() {
    Sonotone.log("LOCALMEDIA", "LocalMedia initialized");

    this._requestUserMediaPending = false;
    this._callbacks = new Sonotone.IO.Events();

    this._streamVideo = null;
    this._streamScreen = null;

    this._mediaReady = false;

    this._isScreenCaptured = false;
    this._isCameraCaptured = false;

};

/**
 * LocalMedia interface.
 *
 */

LocalMedia.prototype = {

    /**
     * Get the media constraints
     *
     * @api private
     */

    _getMediaConstraints: function(constraints) {
        
        var mediaConstraints = {
            audio: false
        };

        if ('audio' in constraints) {
            mediaConstraints.audio = constraints.audio;
        }

        if ('video' in constraints) {

            // Add th video constraints if needed
            mediaConstraints.video = {
                mandatory: {
                    maxWidth: 320,
                    maxHeight: 180
                }, 
                optional: []
            };

            if ('format' in constraints) {

                switch (constraints.format) {
                    case 'qvga':
                        mediaConstraints.video.mandatory = {
                            maxWidth: 320,
                            maxHeight: 240
                        };
                        break;
                    case 'qvga_16:9':
                        mediaConstraints.video.mandatory = {
                            maxWidth: 320,
                            maxHeight: 180
                        };
                        break;
                    case 'vga':
                        mediaConstraints.video.mandatory = {
                            maxWidth: 640,
                            maxHeight: 480
                        };
                        break;
                    case 'vga_16:9':
                        mediaConstraints.video.mandatory = {
                            maxWidth: 640,
                            maxHeight: 360
                        };
                        break;
                    case 'cam':
                        mediaConstraints.video.mandatory = {
                            maxWidth: 960,
                            maxHeight: 720
                        };
                        break;
                    case 'hd':
                        mediaConstraints.video.mandatory = {
                            maxWidth: 1280,
                            maxHeight: 720
                        };
                        break;
                    case 'cam':
                        mediaConstraints.video.mandatory = {
                            maxWidth: 960,
                            maxHeight: 720
                        };
                        break;
                }
            }
        }

        return mediaConstraints;
    },

    /**
     * Start accessing to the local Media
     * @param {Object} constraints The audio/Video constraints
     *
     * @api public
     */

    acquire: function(constraints) {
        if(!this._requestUserMediaPending && Sonotone.isAudioVideoCompliant) {

            var that = this;

            var mediaConstraints = this._getMediaConstraints(constraints);

            Sonotone.log("LOCALMEDIA", "Requested access to local media - Camera....", constraints);

            if(constraints.audio && constraints.video) {
                Sonotone.log("LOCALMEDIA", "Ask for audio and video media", mediaConstraints);
            }
            else if(constraints.audio) {
                Sonotone.log("LOCALMEDIA", "Ask for audio only", mediaConstraints);
                if(Sonotone.browser === "firefox") {
                    //mediaConstraints.video = false;
                }
            }
            else if(constraints.video) {
                Sonotone.log("LOCALMEDIA", "Ask for video only", mediaConstraints);
                if(Sonotone.browser === "firefox") {
                    //mediaConstraints.audio = false;
                }
            }
            else {
                Sonotone.log("LOCALMEDIA", "Ask for no media", mediaConstraints);
                 if(Sonotone.browser === "firefox") {
                    //mediaConstraints.audio = false;
                    //mediaConstraints.video = false;
                }
            }

            this._requestUserMediaPending = true;

            Sonotone.getUserMedia(mediaConstraints, function(_stream) {
                Sonotone.log("LOCALMEDIA", "User has granted access to local media - Camera");              
                that._streamVideo = _stream;
                that._requestUserMediaPending = false;
                that._mediaReady = true;
                that._subscribeToStreamEvent(that._streamVideo);
                that._isCameraCaptured = true;
                that._callbacks.trigger('onLocalVideoStreamStarted', that._streamVideo);
            }, function(_error) {
                Sonotone.log("LOCALMEDIA", "Failed to get access to local media", _error);   
                that._requestUserMediaPending = false;
                that._isCameraCaptured = false;
                that._mediaReady = false;
                that._callbacks.trigger('onLocalVideoStreamError', {code: 1, message:"", name: "PERMISSION_DENIED"});
            });
        }  
        else {
            if(!Sonotone.isAudioVideoCompliant) {
                Sonotone.log("LOCALMEDIA", "Browser not compliant for Audio/Video Communication");  
                this._callbacks.trigger('onLocalVideoStreamError', {code: 2, message:"", name: "BROWSER_NOT_COMPLIANT"});
            }
        } 
    },

    /**
     * Release the Local Media (both 2 streams)
     *
     * @api public
     */

    release: function() {
        // Release the Screen capture if exists
        this.releaseScreen();

        // Release the video capture if exists
        this.releaseVideo();
    },

    /**
     * Release Screen stream on local Media
     *
     * @api public
     */

    releaseScreen: function() {
         if(this._mediaReady && this._isScreenCaptured) {
            Sonotone.log("LOCALMEDIA", "Stop local media - Screen stream...");
            this._streamScreen.stop();
            this._callbacks.trigger('onLocalScreenStreamEnded', this._streamScreen);
        }
    },

    /**
     * Release Screen stream on local Media
     *
     * @api public
     */

    releaseVideo: function() {
         if(this._mediaReady && this._isVideoCaptured) {
            Sonotone.log("LOCALMEDIA", "Stop local media - Video stream...");
            this._streamVideo.stop();
            this._callbacks.trigger('onLocalVideoStreamEnded', this._streamScreen);
        }
    },

    /**
     * Share the screen to an other peer
     *
     * @api public
     */

    acquireScreen: function(constraints) {

        // Screen sharing seems to work only using HTTPS
        if(Sonotone.isSharingCompliant && Sonotone.isHTTPS) {
            var that = this;

            var maxWidth = screen.width;
            var maxHeight = screen.height;

            if(constraints) {
                if('width' in constraints) {
                    maxWidth = constraints.width;
                }
                if('height' in constraints) {
                    maxHeight = constraints.height;
                }
            }

            var video_constraints = {
                mandatory: { 
                    chromeMediaSource: 'screen',
                    maxWidth: maxWidth,
                    maxHeight: maxHeight
                },
                optional: []
            };

            Sonotone.getUserMedia({
                video: video_constraints
            }, function(_stream) {
                Sonotone.log("LOCALMEDIA", "User has granted access to local media - Screen");              
                that._streamScreen = _stream;
                that._requestUserMediaPending = false;
                that._mediaReady = true;
                that._isScreenCaptured = true;
                that._subscribeToStreamEvent(that._streamScreen);
                that._callbacks.trigger('onLocalScreenStreamStarted', that._streamScreen);
            }, function(_erroronstreaming) {
                that._isScreenCaptured = false;
                Sonotone.log("LOCALMEDIA", "Failed to get access to local media - Screen", _erroronstreaming);   
                that._requestUserMediaPending = false;
                that._mediaReady = false;
                that._callbacks.trigger('onLocalScreenStreamError', {code: 1, message:"", name: "PERMISSION_DENIED"});
            });
        }
        else {
            if(!Sonotone.isSharingCompliant) {
                Sonotone.log("LOCALMEDIA", "Browser not compliant for Desktop/Application sharing");  
                this._callbacks.trigger('onLocalScreenStreamError', {code: 2, message:"", name: "BROWSER_NOT_COMPLIANT"});
            }
            else if (!Sonotone.isHTTPS) {
                Sonotone.log("LOCALMEDIA", "Protocol should be HTTPS");  
                this._callbacks.trigger('onLocalScreenStreamError', {code: 3, message:"", name: "PROTOCOL_ERROR"});
            }
        }
    },

    /**
     * Subscribe to Local Media events
     * @param {String} eventName The event to subscribe
     * @param {Function} callbackFunction The function to call
     * @param {Object} context The context to use when calling the callback function
     *
     * @api public
     */

    on: function(eventName, callbackFunction, context) {
       this._callbacks.on(eventName, callbackFunction, context);
    },

    /**
     * Attach the Local video stream to a <video> or <canvas> element
     *
     * @api public
     */

    renderVideoStream: function(HTMLMediaElement) {
        Sonotone.log("LOCALMEDIA", "Render the local stream - Video"); 
        Sonotone.attachToMedia(HTMLMediaElement, this._streamVideo);
    },

     /**
     * Attach the Local screen stream to a <video> or <canvas> element
     *
     * @api public
     */

    renderScreenStream: function(HTMLMediaElement) {
        Sonotone.log("LOCALMEDIA", "Render the local stream - Screen"); 
        Sonotone.attachToMedia(HTMLMediaElement, this._streamScreen);
    },

    /**
     * Is the Local Media ready (= captured from the camera)
     *
     * @api public
     */

    ready: function() {
        return this._mediaReady;
    },

    /**
     * Get the Local Video Stream
     *
     * @api public
     */

    streamVideo: function() {
        return this._streamVideo;
    },

    /**
     * Get the Local Video Stream
     *
     * @api public
     */

    streamScreen: function() {
        return this._streamScreen;
    },

    /**
     * Is a screen stream captured and ready to be sent
     *
     * @api public
     */

    isScreenCaptured: function() {
        return this._isScreenCaptured;
    },

    /**
     * Is a camera stream captured and ready to be sent
     *
     * @api public
     */

    isCameraCaptured: function() {
        return this._isCameraCaptured;
    },

    /**
     * Subscribe to stream events
     *
     * @api private
     */

    _subscribeToStreamEvent: function(stream) {

        var that = this;

        stream.onended = function() {
            Sonotone.log("LOCALMEDIA", "Local Stream has ended"); 
            //TODO
            //Perahps we have to remove the MediaTrack that ended
            that._callbacks.trigger('onLocalStreamEnded', that._stream);
        };

        stream.onaddtrack = function() {
            Sonotone.log("LOCALMEDIA", "New track added to LocalStream"); 
        };

        stream.onremovetrack = function() {
            Sonotone.log("LOCALMEDIA", "Track removed from LocalStream"); 
        };
    }
};/**
 * Remote Media namespace.
 * We can have several remote media for the moment one per peerconnection
 *
 * @namespace
 */

var RemoteMedia = Sonotone.IO.RemoteMedia = function() {
    Sonotone.log("REMOTEMEDIA", "RemoteMedia initialized");

    this._callbacks = new Sonotone.IO.Events();
    this._stream = {};
    this._mediaReady = false;
};

/**
 * RemoteMedia interface.
 *
 */

RemoteMedia.prototype = {
    
    /**
     * Get or set the remote Stream
     *
     * @api public
     */

    stream: function(stream, peerID) {
        if(stream !== null) {
            if(this._stream[peerID] !== null) {
                Sonotone.log("REMOTEMEDIA", "Stream already exists. Add again to the Remote Media for peer <" + peerID + ">");
            }
            else {
                Sonotone.log("REMOTEMEDIA", "Set the stream associated to this Remote Media for peer <" + peerID + ">");
            }
            this._stream[peerID] = stream;
            this._subscribeToStreamEvent(stream, peerID); 
            this._callbacks.trigger('onRemoteStreamStarted', peerID);
        }

        return this._stream;
    },

    /**
     * Subscribe to Local Media events
     * @param {String} eventName The event to subscribe
     * @param {Function} callbackFunction The function to call
     * @param {Object} context The context to use when calling the callback function
     *
     * @api public
     */

    on: function(eventName, callbackFunction, context) {
        this._callbacks.on(eventName, callbackFunction, context);
    },

    /**
     * Attach the RemoteStream to a <video> or <canvas> element
     *
     * @api public
     */

    renderStream: function(HTMLMediaElement, peerID) {
        Sonotone.log("REMOTEMEDIA", "Render the remote stream associated to peer <" + peerID + ">"); 
        Sonotone.attachToMedia(HTMLMediaElement, this._stream[peerID]);
    },

    /**
     * Subscribe to Stream events
     *
     * @api private
     */

    _subscribeToStreamEvent: function(stream, peerID) {

        var that = this;

        stream.onended = function() {
            Sonotone.log("REMOTEMEDIA", "Remote Stream has ended"); 
            //TODO
            //Perahps we have to remove the MediaTrack that ended
            that._callbacks.trigger('onRemoteStreamEnded', peerID);
        };

        stream.onaddtrack = function() {
            Sonotone.log("REMOTEMEDIA", "New track added to RemoteStream"); 
        };

        stream.onremovetrack = function() {
            Sonotone.log("REMOTEMEDIA", "Track removed from RemoteStream"); 
        };
    }
};/**
 * RemoteTransport namespace
 * Use a Remote Transport when you have your own transport defined and you want to use it
 *
 * @namespace
 */

var RemoteTransport = Sonotone.IO.RemoteTransport = function(config) {
    this._transportReady = true;
    this._callbacks = new Sonotone.IO.Events();
    this._sendCallbackFn = config.sendCallback;
    this._context = config.context;

    Sonotone.log("TRANSPORT", "Creating a Remote transport");
};

/**
 * RemoteTransport interface.
 *
 */

RemoteTransport.prototype = {

    /**
     * Subscribe to Transport events
     * @param {String} eventName The event to subscribe
     * @param {Function} callbackFunction The function to call
     * @param {Object} context The context to use when calling the callback function
     *
     * @api public
     */

    on: function(eventName, callbackFunction, context) {
        this._callbacks.on(eventName, callbackFunction, context);
    },

    /**
     * Connect using the Custom transport
     *
     * @api public
     */

    connect: function() {
        this._transportReady = true;
        this._callbacks.trigger('onReady', {});
    },

    /**
     * Send a message using the Custom Transport
     * This function calls the 'sendCallback' function
     * @param {Object} JSONMessage  The message in JSON format
     *
     * @api public
     */

    send: function(JSONMessage) {
        if(this._transportReady) {
            Sonotone.log("TRANSPORT", "Send Message", JSONMessage);
            if(this._sendCallbackFn) {
                this._sendCallbackFn.call(this._context || this, JSONMessage);
            }
            else {
                Sonotone.log("TRANSPORT", "Transport not configured");
                this._callbacks.trigger('onError', "NOT_CONFIGURED");
            }
        }
        else {
            Sonotone.log("TRANSPORT", "Transport not ready");
            this._callbacks.trigger('onError', "NOT_READY");
        }
    },

    /**
     * Receive a message from your own transport and push it to the Remote Transport
     * Parameters will be injected in Sonotone.IO as if they come from a transport managed by Sonotone 
     *
     * @param {Object} JSONMessage
     */

    receive: function(JSONMessage) {
        if(JSONMessage.data.type !== undefined) {
            Sonotone.log("TRANSPORT", "Receive a message of type " + JSONMessage.data.type);
            this._callbacks.trigger('onMessage', JSONMessage);

        }
        else {
            Sonotone.log("TRANSPORT", "Unknown message. Do not treat" + JSON.stringify(JSONMessage));
        }
    }
};/**
 * WebSocketTransport namespace.
 *
 * @namespace
 */

var WebSocketTransport = Sonotone.IO.WebSocketTransport = function(config) {
    this._host = config.host;
    this._port = config.port;
    this._transportReady = false;
    this._socket = null;
    this._callbacks = new Sonotone.IO.Events();
    this._id = new Date().getTime();
    this._room = null;

    if(this._port) {
        Sonotone.log("TRANSPORT", "Creating a WebSocket transport to " + this._host + ":" + this._port);
    }
    else {
        Sonotone.log("TRANSPORT", "Creating a WebSocket transport to " + this._host);
    }
};

/**
 * WebSocketTransport interface.
 *
 */

WebSocketTransport.prototype = {

    /**
     * Connect the Transport
     * @param {Object} caps The user capabilities that have to be transmitted to others peers (nickname, audio/video capabilities...)
     * @param {String} code, The conference code (room)
     *
     * @api public
     */

    connect: function(caps, code) {
        if(!this._socket) {
            Sonotone.log("TRANSPORT", "Try to connect to SIG server");
            
            if(this._port) {
                this._socket = new WebSocket("ws://" + this._host + ":" + this._port);
            }
            else {
                this._socket = new WebSocket("ws://" + this._host);
            }

            this._room = code;

            var that = this;

            this._socket.onopen = function(msg) {
                Sonotone.log("TRANSPORT", "Channel Ready");
                that._transportReady = true;
                that._callbacks.trigger('onReady', msg);

                that.send(
                    {
                        data: {
                            type: 'join',
                            caps: caps
                        },
                        caller: Sonotone.ID, 
                        callee: 'all',
                    }
                );
            };

            this._socket.onmessage = function(msg) {

                var message = JSON.parse(msg.data);

                if(message.data.type !== undefined) {
                    Sonotone.log("TRANSPORT", "Receive a message of type " + message.data.type, message);
                    that._callbacks.trigger('onMessage', message);

                }
                else {
                    Sonotone.log("TRANSPORT", "Unknown message. Do not treat" + JSON.stringify(message));
                }
            };

            this._socket.onclose = function() {
                Sonotone.log("TRANSPORT", "Channel Closed");
                that._transportReady = false;
            };

            this._socket.onerror = function(err) {
                Sonotone.log("TRANSPORT", "Receive an error message" + JSON.stringify(err));
                that._callbacks.trigger('onError', err);
            };
        }
    },

    /**
     * Send a message using the Transport
     *
     * @api public
     */

    send: function(JSONMessage) {
        if(this._transportReady) {
            if(this._room) {
                JSONMessage.room = this._room;    
            }
            var message = JSON.stringify(JSONMessage);
            Sonotone.log("TRANSPORT", "Send a Message", JSONMessage);
            this._socket.send(message);
        }
        else {
             Sonotone.log("TRANSPORT", "Not ready!!!", JSONMessage);
        }
    },

    /**
     * Subscribe to Transport events
     * @param {String} eventName The event to subscribe
     * @param {Function} callbackFunction The function to call
     * @param {Object} context The context to use when calling the callback function
     *
     * @api public
     */

    on: function(eventName, callbackFunction, context) {
        this._callbacks.on(eventName, callbackFunction, context);
    }

};/**
 *
 */

var SocketIOTransport = Sonotone.IO.SocketIOTransport = function(config) {
    this._host = config.host;
    this._port = config.port;
    this._transportReady = false;
    this._io = config.io;
    this._socket = null;
    this._callbacks = new Sonotone.IO.Events();
    this._id = new Date().getTime();
    this._dataChannel = null;

    Sonotone.log("TRANSPORT", "Creating a SocketIO transport to " + this._host + ":" + this._port);
};
 
SocketIOTransport.prototype = {
    
    /**
     * Connect the Transport
     *
     * @api public
     */

    connect: function() {
        if(!this._socket) {
            Sonotone.log("TRANSPORT", "Try to connect to SIG server");
            
            this._socket = this._io.connect('http://localhost:8080');

            var that = this;

           // this._socket.onopen = function(msg) {
            this._socket.on('connect', function(msg) {
                Sonotone.log("TRANSPORT", "Channel Ready");
                that._transportReady = true;
                that._callbacks.trigger('onReady', msg);

                that.send(
                    {
                        data: {
                            type: 'join'
                        },
                        caller: Sonotone.ID, 
                        callee: 'all'
                    }
                );
            });

            this._socket.on('message', function(msg) {

                var message = JSON.parse(msg.data);

                if(message.data.type !== undefined) {
                    Sonotone.log("TRANSPORT", "Receive a message of type " + message.data.type, message);
                    that._callbacks.trigger('onMessage', message);

                }
                else {
                    Sonotone.log("TRANSPORT", "Unknown message. Do not treat" + JSON.stringify(message));
                }
            });

            this._socket.on('close', function() {
                Sonotone.log("TRANSPORT", "Channel Closed");
                that._transportReady = false;
            });

            this._socket.on('error', function(err) {
                Sonotone.log("TRANSPORT", "Receive an error message" + JSON.stringify(err));
                that._callbacks.trigger('onError', err);
            });
        }
    },


    /**
     * Send a message using the Transport
     *
     * @api public
     */

    send: function(JSONMessage) {
        if(this._transportReady) {

            var message = JSON.stringify(JSONMessage);
            Sonotone.log("TRANSPORT", "Send a Message", JSONMessage);
            this._socket.send(message);
        }
        else {
             Sonotone.log("TRANSPORT", "Not ready!!!", JSONMessage);
        }
    },

    /**
     * Subscribe to Transport events
     * @param {String} eventName The event to subscribe
     * @param {Function} callbackFunction The function to call
     * @param {Object} context The context to use when calling the callback function
     *
     * @api public
     */

    on: function(eventName, callbackFunction, context) {
        this._callbacks.on(eventName, callbackFunction, context);
    }
};/**
 * SIPTransport over WebSocket Namespace.
 *
 * @namespace
 */

var SIPTransport = Sonotone.IO.SIPTransport = function(config) {

    console.log("config:", config);
    this._socket = null;
    this._callbacks = new Sonotone.IO.Events();
};

/**
 * SIPTransport interface.
 *
 */

SIPTransport.prototype = {

    /**
     * Subscribe to Transport events
     * @param {String} eventName The event to subscribe
     * @param {Function} callbackFunction The function to call
     * @param {Object} context The context to use when calling the callback function
     *
     * @api public
     */

    on: function(eventName, callbackFunction, context) {
        this._callbacks.on(eventName, callbackFunction, context);
    },

    /**
     * Connect the Transport
     *
     * @api public
     */

    connect: function() {
        if(!this._socket) {
            Sonotone.log("TRANSPORT", "Try to connect to SIG server");
            
            this._socket = new WebSocket("ws://172.26.161.86:11112");

            this._socket.onopen = function() {
                Sonotone.log("TRANSPORT", "Channel Ready");
            };

            this._socket.onmessage = function() {
                console.log("toto");
                //Sonotone.log("TRANSPORT", "received", msg);
            };

            this._socket.onclose = function() {
                Sonotone.log("TRANSPORT", "Channel Closed");
            };

            this._socket.onerror = function(err) {
                Sonotone.log("TRANSPORT", "Receive an error message", err);
            };
        }
    },

    invite: function() {

        console.log('invite');

        var msg = 'REGISTER sip:172.26.161.86 SIP/2.0\r\n' + 
            'Via: SIP/2.0/WS 0favl06pnehr.invalid;branch=z9hG4bK6362795\r\n' + 
            'Max-Forwards: 69\r\n' + 
            'To: <sip:1000@172.26.161.86>\n' + 
            'From: "1000" <sip:1000@172.26.161.86>;tag=8pm5mjc9r6\r\n' + 
            'Call-ID: 9m066q4onv48liqouhdo94\r\n' + 
            'CSeq: 81 REGISTER\r\n' + 
            'Contact: <sip:b5ukfko1@0favl06pnehr.invalid;transport=ws>;reg-id=1;+sip.instance="<urn:uuid:a2223471-94ca-4436-b16a-fd78828a2961>";expires=600\r\n' + 
            'Allow: ACK,CANCEL,BYE,OPTIONS\r\n' + 
            'Supported: path, outbound, gruu\r\n' + 
            'User-Agent: JsSIP 0.3.0\r\n' + 
            'Content-Length: 0\r\n\r\n';

        this._socket.send(msg);
    }


};/**
 * PeerConnection namespace.
 * @param {String} id The peerConnection ID to user
 * @param {Boolean} hasRemoteDataChannel True if the remote peer can use Data Channel
 * @namespace
 */

var PeerConnection = Sonotone.IO.PeerConnection = function(id, hasRemoteDataChannel) {

    Sonotone.log("PEERCONNECTION", "Create new Peer Connection <" + id + ">");

    this._id = id || new Date().getTime();

    this.isCaller = false;

    this.answerCreated = false;

    this.isConnected = false;

    if(Sonotone.enableSTUN) {
        Sonotone.log("PEERCONNECTION", "Use STUN Server", Sonotone.STUN);
        this._peer = new Sonotone.RTCPeerConnection(Sonotone.STUN, Sonotone.constraints);
    }
    else {
        Sonotone.log("PEERCONNECTION", "No STUN server used");
        this._peer = new Sonotone.RTCPeerConnection(null, Sonotone.constraints);   
    }

    this._dataChannel = new Sonotone.IO.DataChannel(id, hasRemoteDataChannel, this._peer);

    this._subscribeToDataChannelEvents();

    Sonotone.log("PEERCONNECTION", "PeerConnection created", this._peer);

    this._callbacks = new Sonotone.IO.Events();

    var that = this;

    // Chrome - Firefox
    this._peer.onicecandidate = function(event) {
        if (event.candidate) {
            Sonotone.log("PEERCONNECTION", "Send local ICE CANDIDATE to PEER CONNECTION <" + that._id + ">");
            that._callbacks.trigger('onICECandiateReceived', event);
        } else {
            Sonotone.log("PEERCONNECTION", "No more local candidate to PEER CONNECTION <" + that._id + ">");
            that._callbacks.trigger("onICECandidateEnd", event);
        }
    };

    // Chrome - Firefox
    this._peer.onaddstream = function(event) {
        Sonotone.log("PEERCONNECTION", "Remote stream added from PEER CONNECTION <" + that._id + ">");
        that._callbacks.trigger('onRemoteStreamReceived', event);
    };

    // Chrome - Firefox
    this._peer.onremovestream = function(event) {
        Sonotone.log("PEERCONNECTION", "Remote stream removed from PEER CONNECTION <" + that._id + ">");
        that._callbacks.trigger('onRemoteStreamEnded', event);  
    };

    // Chrome only
    this._peer.oniceconnectionstatechange = function(event) {
        var state = event.target.iceConnectionState;
        Sonotone.log("PEERCONNECTION", "On Ice Connection state changes to " + state + " for PEER CONNECTION <" + that._id + ">", event);
        that._callbacks.trigger('onIceConnectionStateChanged', state);
    };

    // Chrome only
    this._peer.onnegotiationneeded = function(event) {
        Sonotone.log("PEERCONNECTION", "On negotiation needed for PEER CONNECTION <" + that._id + ">", event);
        that._callbacks.trigger('onNegotiationNeeded', event);
    };

    // Chrome only
    this._peer.onsignalingstatechange = function(event) {
        var signalingState = "";
        if(event.target) {
            signalingState = event.target.signalingState;
        }
        else if(event.currentTarget) {
            signalingState = event.currentTarget.signalingState;
        }
        else {
            signalingState = event;
        }
        Sonotone.log("PEERCONNECTION", "On signaling state changes to " + signalingState + " for PEER CONNECTION <" + that._id + ">", event);
        that._callbacks.trigger('onSignalingStateChanged', signalingState);  
    };

    // Firefox only
    this._peer.onclosedconnection = function(event) {
        Sonotone.log("PEERCONNECTION", "Connection closed for PEER CONNECTION <" + that._id + ">", event);
        that._callbacks.trigger('onClosedConnection', null);  
    };

    // Firefox only
    this._peer.onconnection = function(event) {
        Sonotone.log("PEERCONNECTION", "Connection opened for PEER CONNECTION <" + that._id + ">", event);
        that._callbacks.trigger('onConnection', null);  
    };

    // Firefox only
    this._peer.onopen = function(event) {
        Sonotone.log("PEERCONNECTION", "On Open for PEER CONNECTION <" + that._id + ">", event);
        that._callbacks.trigger('onOpen', null);  
    };

    this._peer.getStats(function(raw) {
        console.log("STATS", raw);
    });

    this._peerReady = true;
};

/**
 * PeerConnection interface.
 *
 */

PeerConnection.prototype = {

    /**
     * ID of the Peer Connection
     *
     * @api public
     */

    ID: function(id) {
        if(id !== undefined) {
            this._id = id;
        }
        return this._id;
    },

    /**
     * Attach a stream to the Peer Connection
     * @param {Object} stream the Stream to attach
     *
     * @api public
     */

    attach: function(stream) {
        Sonotone.log("PEERCONNECTION", "Attach a stream to the Peer Connection <" + this._id + ">");
        if(stream) {
            this._peer.addStream(stream);
        }
        else {
            Sonotone.log("PEERCONNECTION", "No stream to add");
        }
    },

    /**
     * ID of the PeerConnection
     * @param {Object} stream The stream to detach
     *
     * @api public
     */

    detach: function(stream) {
        if(stream) {
            Sonotone.log("PEERCONNECTION", "Detach a stream to the Peer Connection <" + this._id + ">");
            this._peer.removeStream(stream);
            this.close();
        }
        else {
            Sonotone.log("PEERCONNECTION", "No stream to remove");
        }
    },

    /**
     * Is the Peer Connection ready (= always ???)
     *
     * @api public
     */

    ready: function() {
        return this._peerReady;
    },

    /**
     * Store the SDP into the Local Description of the peer
     * @param {Objet} SDP The JSON SDP message
     *
     * @api public
     */

    setLocalDescription: function(SDP) {
        Sonotone.log("PEERCONNECTION", "Store the SDP parameters to the local description");
        this._peer.setLocalDescription(SDP);
    },

    /**
     * Store the SDP into the Remote Description of the peer
     * @param {Objet} SDP The JSON SDP message
     *
     * @api public
     */

    setRemoteDescription: function(SDP) {
        Sonotone.log("PEERCONNECTION", "Store the SDP parameters to the remote description");
        this._peer.setRemoteDescription(SDP);
    },

    /**
     * Create an offer to one or several peers
     * @param {Boolean} isScreencaptured True if the screen has captured
     *
     * @api public
     */ 

    createOffer: function(screenCaptured) {

        var sdpConstraints = {
            'mandatory': {
                'OfferToReceiveAudio': screenCaptured ? false : true,
                'OfferToReceiveVideo': screenCaptured ? false : true 
            }
        };

        this.isCaller = true;

        var offerConstraints = {"optional": [], "mandatory": {}};

        var constraints = Sonotone.mergeConstraints(offerConstraints, sdpConstraints);

        Sonotone.log("PEERCONNECTION", "Create the SDP offer", constraints);

        var that = this;
    
        this._peer.createOffer(function(offerSDP) {
        
            //offerSDP.sdp = preferOpus(offerSDP.sdp);
            that.setLocalDescription(offerSDP);
            
            Sonotone.log("PEERCONNECTION", "Send this SDP OFFER to the remote peer <" + that._id + ">");

            var event = {
                data: offerSDP,
                caller: Sonotone.ID,
                callee: that._id
            };

            that._callbacks.trigger('onSDPOfferToSend', event);

        }, function(error) {
            Sonotone.log("PEERCONNECTION", "Fail to create Offer", error);
        }, constraints);
    },

    /**
     * Create an SDP answer message
     */

    createAnswer: function() {

        var sdpConstraints = {
            'mandatory': {
                'OfferToReceiveAudio': true,
                'OfferToReceiveVideo': true 
            }
        };
                    
        var that = this;

        this.isCaller = false;
                    
        this._peer.createAnswer(function(answerSDP) {
            //answerSDP.sdp = preferOpus(answerSDP.sdp);
            that.setLocalDescription(answerSDP);
                      
            Sonotone.log("PEERCONNECTION", "Send this SDP answer to the remote peer <" + that._id + ">");

            var event = {
                data: answerSDP,
                caller: Sonotone.ID,
                callee: that._id
            };

            that._callbacks.trigger('onSDPAnswerToSend', event);

        }, function(error) {
            Sonotone.log("PEERCONNECTION", "Fail to create Answer", error);
        }, sdpConstraints);

        this.answerCreated = true;

    },

    /**
     * Add an ICE candidate to the PeerConnection
     * @param {Object} ICEcandidate The candidate to add
     *
     * @api public
     */

    addIceCandidate: function(ICEcandidate)  {
        Sonotone.log("PEERCONNECTION", "Add ICE CANDIDATE to the PEER CONNECTION <" + this._id + ">");
        var candidate = new Sonotone.RTCIceCandidate({sdpMLineIndex:ICEcandidate.label, candidate:ICEcandidate.candidate, id: ICEcandidate.sdpMid});
        this._peer.addIceCandidate(candidate);
    },  

    /**
     * Subscribe to peer events
     * @param {String} eventName The event to subscribe
     * @param {Function} callbackFunction The function to call
     * @param {Object} context The context to use when calling the callback function
     *
     * @api public
     */

    on: function(eventName, callbackFunction, context) {
        this._callbacks.on(eventName, callbackFunction, context);
    },

    /**
     * Get the PeerConnection 
     *
     * @api public
     */

    peer: function() {
        return this._peer;
    },

    /**
     * Close the peerConnection
     *
     * @api public
     */

    close: function() {
        Sonotone.log("PEERCONNECTION", "Close the PeerConnection <" + this._id + ">");
        this._peer.close();
    },

    /**
     * Send data using the Data Channel
     * @param {Object} data The data to send
     *
     * @api public
     */

    sendFile: function(file) {
        this._dataChannel.sendFile(file);
    },

    /**
     * Subscribe to datachannel events
     *
     * @api private
     */

    _subscribeToDataChannelEvents: function() {
        var that = this;

        console.log("peer");

        this._dataChannel.on('onFileReceived', function(file) {
            that._callbacks.trigger('onFileReceived', file);
        }, this);
    }

};/**
     * Data Channel
     * Manage the Data Channel part of the Peer Connection
     * @param {String} id The ID to use
     * @param {Boolean} hasRemoteDataChannel True if the remote peer can use Data-Channel
     * @param {Object} peer The parent peer where to add the Data Channel
     *
     * @namespace
     */

    var DataChannel = Sonotone.IO.DataChannel = function(id, hasRemoteDataChannel, peer) {
        Sonotone.log("DATACHANNEL", "Data-Channel initialized");

        this._remotePeerID = id;

        this._isReady = false;

        this._callbacks = new Sonotone.IO.Events();

        this._channel = null;

        this._file =[];

        this._fileInfo = null;

        this._remainingBlob = null;

        var that = this;

        if(Sonotone.isDataChannelCompliant && hasRemoteDataChannel) {
            this._channel = peer.createDataChannel(id, { reliable : true });

            // When data-channel is opened with remote peer
            this._channel.onopen = function(){
                Sonotone.log("DATACHANNEL", "Data-Channel opened with other peer");
                that._isReady = true;
            };

            // On data-channel error
            this._channel.onerror = function(e){
                Sonotone.log("DATACHANNEL", "Data-Channel error", e);
                that._isReady = false;
            };

            // When data-channel is closed with remote peer
            this._channel.onclose = function(e){
                Sonotone.log("DATACHANNEL", "Data-Channel close", e);
                that._isReady = false;
            };

            // On new message received
            this._channel.onmessage = function(e){

                //Sonotone.log("DATACHANNEL", "Received", e.data);

                if(e.data instanceof ArrayBuffer) {
                    //Sonotone.log("DATACHANNEL", "Type ArrayBuffer");
                    var blob = new Blob([e.data], {type: that._fileInfo.type});
                    that._file.push(blob);

                    var ack =  {
                        type: "ACK"
                    };
                    //Sonotone.log("DATACHANNEL", "Send ACK");
                    that._channel.send(JSON.stringify(ack));
                }
                else if (e.data instanceof Blob) {
                    //Sonotone.log("DATACHANNEL", "Type Blob");
                    that._file.push(e.data);
                }
                else {

                    try {

                        if(e.data.indexOf('{') === 0) {
                            //Sonotone.log("DATACHANNEL", "Type SIG");
                            var jsonMessage = JSON.parse(e.data);

                            switch (jsonMessage.type) {
                                case "FILE_START":
                                    Sonotone.log("DATACHANNEL", "Start receiving file", jsonMessage.content);
                                    that._file = [];
                                    that._fileInfo = jsonMessage.content;
                                    break;
                                case "FILE_END":
                                    var fullFile = new Blob(that._file);
                                    Sonotone.log("DATACHANNEL", "End receiving file");
                                    var file = {
                                        info: that._fileInfo,
                                        content: fullFile
                                    };

                                    that._callbacks.trigger('onFileReceived', file); 
                                    break;
                                case "ACK":
                                    //Sonotone.log("DATACHANNEL", "Received ACK");
                                    if(that._remainingBlob.size) {
                                        //Sonotone.log("DATACHANNEL", "Continue to send remaining file part");
                                        that._sendBlobFile(that._remainingBlob);
                                    }
                                    else {
                                        //Sonotone.log("DATACHANNEL", "No more part to send");
                                         var msg = {
                                            type: "FILE_END"
                                        };
                                        that._channel.send(JSON.stringify(msg));
                                    }
                                    break;
                            }
                        }
                    }
                    catch(err) {
                        console.error(err);
                    }
                }

            };        
        }
        else if(!Sonotone.isDataChannelCompliant) {
            Sonotone.log("DATACHANNEL", "Browser not compliant for Data-Sharing");
        }
        else {
            Sonotone.log("DATACHANNEL", "Remote Peer browser is not compliant for Data-Sharing");
        }
    };

    /**
     * DataChannel interface.
     *
     */

    DataChannel.prototype = {

        /**
         * Is the Data Channel readu (= opened with other peer)
         * 
         * @api public
         */

        isReady: function() {
            return this._isReady;
        },

        /**
         * Send data using this Channel
         * @param {Object} data The data to send
         *
         * @api public
         */

        sendData: function(data) {
            if(this._isReady) {
                Sonotone.log("DATACHANNEL", "Try to send a message to the peer <" + this._remotePeerID + ">");
                this._channel.send(data);
            }
            else {
                Sonotone.log("DATACHANNEL", "Data Channel not ready for sennding a message!");
            }
        },

        /**
         * Send data using this Channel
         * @param {Object} data The data to send
         *
         * @api public
         */

        sendFile: function(file) {

            var reader = new FileReader();

            var that = this;

            var msg = {
                type: "FILE_START",
                content: {
                    fileName: file.name,
                    size: file.size,
                    type: file.type
                }
            };

            Sonotone.log("DATACHANNEL", "Send a file to peer <" + this._remotePeerID + ">");

            this._channel.send(JSON.stringify(msg));

            reader.onload = function(file) {

                if(reader.readyState === FileReader.DONE) {
                    that._sendBlobFile(new Blob([file.target.result]));
                }
            };

            reader.readAsArrayBuffer(file);
        },

        /**
         * Subscribe to DataChannel events
         * @param {String} eventName The event to subscribe
         * @param {Function} callbackFunction The function to call
         * @param {Object} context The context to use when calling the callback function
         *
         * @api public
         */

        on: function(eventName, callbackFunction, context) {
            this._callbacks.on(eventName, callbackFunction, context);
        },

        /**
         * Send a part of a file using the Data Channel
         * File is splitted into chunks (blob)
         * @param {Object} blob File or a part of a file (remaining part of the file)
         *
         * @api private
         */

        _sendBlobFile: function(blob) {

            var toSend = null,
                chunkLength = 64000,
                fr = new FileReader(),
                that = this;

            if (blob.size > chunkLength) {
                toSend = blob.slice(0, chunkLength);
            }
            else {
                toSend = blob;
            }

            fr.onload = function() {
                that._remainingBlob = blob.slice(toSend.size);
                that._channel.send(this.result);
            };
            
            fr.readAsArrayBuffer(toSend);
        }
    };/**
 * Manage Events subscriptions and firings
 */
var Events = Sonotone.IO.Events = function(){
    this.events = null;
};

/**
 * Events interface.
 *
 */

Events.prototype = {

    /**
     * Subscribe to an event
     * @param {String} name The event to subscribe
     * @param {Function} callbackFunction The function to call
     * @param {Object} context The context to use when calling the callback function
     *
     * @api public
     */

    on: function(name, callback, context) {
        if(!this._events) {
            this._events = {};
        }
        var events = this._events[name] || (this._events[name] = []);
        events.push({callback: callback, ctx: context || this});
        return this;
    },

    /**
     * Trigger an event
     * @param {String} name The event to subscribe
     * @param {args} Arguments to send to the callback function
     *
     * @api public
     */
     
    trigger: function(name, args) {
        if (!this._events) {
            return this;
        }
        var events = this._events[name];

        if (events) {
            for (var i=0;i<events.length;i++) {
                events[i].callback.call(events[i].ctx, args);
            }
        }
    }
};

}).call(this);