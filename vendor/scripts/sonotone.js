/* 

sonotone.js - v0.4.8
WebRTC library for building WebRTC application
Build date 2014-04-27
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

Sonotone.VERSION = '0.4.9';

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
            "DATACHANNEL": "Crimson",
            "CAPABILITIES": "black"
        };

        var time = new Date();

        var displaycat = cat.substring(0, 12);
        while(displaycat.length < 12) {
            displaycat += ' ';
        }

        if(arg !== undefined) {
            console.log("%c|'O~O'| " + time.toLocaleTimeString() + ":" + time.getMilliseconds() + " [" + displaycat + "] - " + msg + " | %O", "color:" + color[cat], arg);
        }
        else {
         console.log("%c|'O~O'| " + time.toLocaleTimeString() + ":" + time.getMilliseconds() + " [" + displaycat + "] - " + msg, "color:" + color[cat]);   
        }
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
/**
 * IO namespace.
 * @param {String} id The ID of the user
 * @param {stunTurnOption}
 *
 * @namespace
 */

var IO = Sonotone.IO = function(id, stunConfig, turnConfig) {

    // Display Sonotone.IO version in logs
    Sonotone.log("SONOTONE.IO", "Running v" + Sonotone.VERSION);

    /**
     * Sonotone ID
     *
     * @api public
     */

    Sonotone.ID = id;

    /**
     * Configuration for STUN
     *
     * @api public
     */

    //Firefox (STUN) = {"iceServers": [{"url": "stun:stun.services.mozilla.com"}]};
    //Google (STUN) = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
    Sonotone.stunConfig = stunConfig || {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};

    /**
     * Configuration for TURN
     * TODO: Take into account TURN server
     *
     * @api public
     */

    Sonotone.turnConfig = turnConfig;    

    /**
     * Transport to use
     *
     * @api private
     */

    this._transport = null;

    /**
     * Capabilities
     *
     * @api private
     */

    this._capabilities = new Sonotone.IO.Capabilities();

    /**
     * Adapter
     *
     * @api private
     */
    this._adapter = new Sonotone.IO.Adapter();

    /**
     * Local stream
     *
     * @api private
     */

    this._localMedia = new Sonotone.IO.LocalMedia(this.caps(), this._adapter);

    /**
     * Remote stream
     *
     * @api private
     */

    this._remoteMedia = new Sonotone.IO.RemoteMedia(this._adapter);

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
                    this._transport = new Sonotone.IO.WebSocketTransport(config, this.caps());
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
     * Get the user Capabilities
     *
     * @api public
     */
    caps: function() {
        return this._capabilities.caps();
    },

    /**
     * Manage the PeerConnections
     * Get/Create a PeerConnection
     * @param {String} id The ID of the PeerConnection (= the ID or the recipient)
     *
     * @api public
     */

    peerConnections: function(id) {
        if(this._peerConnections[id] === undefined) {
            Sonotone.log("SONOTONE.IO", "PeerConnections not found, create a new one...", id);
            this._peerConnections[id] = new Sonotone.IO.PeerConnection(id, false, this._adapter, this.caps());
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

    sendIMMessage: function(msg, to) {
        if(this._transport) {

            var message = {
                data: {
                    type: 'im',
                    content: msg,
                    private: to ? true: false
                },
                caller: Sonotone.ID,
                callee: to || 'all'
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

            var exist = false;

            if("d" + callee in this._peerConnections) {
                exist = true;
            }

            peer = this.peerConnections("d" + callee);

            if(!exist) {
                peer.addDataChannel();
            }

            peer.sendFile(file);
        }
        else {

        }
    },

    sendPeerMessage: function(msg, callee) {
        var peer = this.peerConnections("d" + callee);
        peer.sendMessage(msg);
    },

    /**
     * Add the local video stream to a Peer Connection
     * @param {String} callee The callee
     *
     * @api public
     */

    addVideoToCall: function(callee) {
        var peer = this.peerConnections("v" + callee);
        peer.attach(this.localMedia().streamVideo());
    },

    /**
     * Remove the local video stream from the peer
     * @param {String} callee The callee
     *
     * @api public
     */

    removeVideoFromCall: function(callee) {
        var peer = this.peerConnections("v" + callee);
        peer.detach(this.localMedia().streamVideo(), true);   
    },

    /**
     * Check if there is a video call with a user
     * @param {String} callee The user to check
     *
     * @api public
     */

    isVideoReceivedFrom: function(callee) {
        var peerID =  'v' + callee;
        if(peerID in this._peerConnections) {
            var peer = this._peerConnections[peerID];
            return peer.isStreamConnected();
        }
        else {
            return false;
        }
    },

    /**
     * Is Screen sharing received from
     * @param {String} callee The user to check
     *
     * @api public
     */

    isScreenReceivedFrom: function(callee) {
        var peerID =  's' + callee;
        if(peerID in this._peerConnections) {
            var peer = this._peerConnections[peerID];
            return peer.isStreamConnected();
        }
        else {
            return false;
        }
    },

    /**
     * Add data channel to a peer connection
     * @param {String} callee The callee
     * @param {String} media 'video', 'screen', 'data'
     *
     * @api public
     */

    addDataToCall: function(callee, media) {
        var m = media.substring(0,1);
        var peer = this.peerConnections(m + callee);
               
        peer.addDataChannel();

    },

    /**
     * Try to call an other peer
     * @param {String} callee The recipient ID
     * @param {String} media 'video', 'screen', 'data'
     * @param {Boolean} withDataChannel True to add data channel support to the peer (if possible)
     *
     * @api public
     */

    call: function(callee, media, withDataChannel) {

        var m = media.substring(0,1);
        var peer = this.peerConnections(m + callee, withDataChannel);
        
        switch (media) {
            case 'video':
                if(this.localMedia().isCameraCaptured()) {
                    peer.attach(this.localMedia().streamVideo());    
                }
                break;
            case 'screen':
                if(this.localMedia().isScreenCaptured()) {
                    peer.attach(this.localMedia().streamScreen());
                }
                break;
            case 'data':
                peer.addDataChannel();
                //No other thing to do
                break;
            default:
                break;

        }

        if(this._transport.type() === 'sip'){
            this._transport.setPeer(peer.peer());
        } 

        peer.createOffer(media, withDataChannel, null);
    },

    /**
     * Try to answer to call from a peer
     * @param {String} caller The recipient ID
     * @param {Boolean} doNotSendLocalVideo If true, do not share the local video (only receive the stream for the moment)
     *
     * @api public
     */

    answer: function(caller, doNotSendLocalVideo) {

        var m = this._tmpOffer.media.substring(0,1);
        var withDataChannel = this._tmpOffer.channel;
        var peer = this.peerConnections(m + caller, withDataChannel);
        var blockVideo = peer.isLocalStreamBlocked() || doNotSendLocalVideo;

        switch (this._tmpOffer.media) {
            case 'video':
                if(this.localMedia().isCameraCaptured() && !blockVideo) {
                    peer.attach(this.localMedia().streamVideo());    
                }
                break;
            case 'screen':
                break;
            case 'data':
                break;
            default:
                break;
        }

        peer.setRemoteDescription(this._adapter.RTCSessionDescription(this._tmpOffer.data));
        peer.createAnswer(this._tmpOffer.media);

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
            peer.createOffer(this.localMedia().isScreenCaptured());
        }
    },

    /**
     * Close Connection with a peer
     *
     * @api public
     */

    release: function(callee, media) {
        var peerID = media.substring(0,1) + callee;

        // Release the media
        if(media === 'video') {
            this._localMedia.releaseVideo();
        }
        else {
            this._localMedia.releaseScreen();
        }

        // Close the associated peerConnection
        var peer = this.peerConnections(peerID);

        peer.close();
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

    /**
     * Unsubscribe to IO events
     * @param {String} eventName The event to unsubscribe
     * @param {Function} callbackFunction The registered callback
     *
     * @api public
     */    

    off: function(eventName, callbackFunction) {
        this._callbacks.off(eventName, callbackFunction);
    },

    setSTUNServer: function(stun) {
        Sonotone.STUN = {"iceServers": [{"url": stun}]};
    },

    setStats: function() {
        // Start stat for each peerConnection
        for (var peerID in this._peerConnections) {
            this._peerConnections[peerID].activateStats();
        }
    },

    stopStats: function() {
        // Stop stat for each peerConnection
        for (var peerID in this._peerConnections) {
            this._peerConnections[peerID].stopStats();
        }
    },

    /**
     * Mute a stream (video or screen)
     * @param {String} callee The user ID to mute
     * @param {String} media The media to mute
     *
     * @api public
     */

    mute: function(callee, media) {
        var flag = media.substring(0, 1);
        var peer = this.peerConnections(flag + callee);
        peer.createOffer(media, false, {action: 'mute'});
    },

    /**
     * Unmute a stream (video or screen)
     * @param {String} callee The user to unmute
     * @param {String} media The media to unmute
     *
     * @api public
     */

    unmute: function(callee, media) {
        var flag = media.substring(0, 1);
        var peer = this.peerConnections(flag + callee);
        peer.createOffer(media, false, {action: 'unmute'});      
    },

    /**
     * Subscribe to transport event
     *
     * @api private
     */

    _subscribeToTransportEvent: function() {
        if(this._transport) {

            this._transport.on('onReady', function(msg) {
                Sonotone.log("SONOTONE.IO", "Transport successfully connected", msg);
                this._callbacks.trigger('onTransportReady', msg);
            }, this);

            this._transport.on('onMessage', function(msg) {
                Sonotone.log("SONOTONE.IO", "Received from Transport: " + msg.data.type);

                var media = "";

                switch (msg.data.type) {
                    case 'join':
                        this._callbacks.trigger('onPeerConnected', {id: msg.caller, caps: msg.data.caps});
                        break;
                     case 'already_joined':
                        this._callbacks.trigger('onPeerAlreadyConnected', {id: msg.caller, caps: msg.data.caps});
                        break;
                    case 'release':
                        this._callbacks.trigger('onPeerDisconnected', {id: msg.caller});
                        break;
                    case 'offer':
                        this._tmpOffer = msg;
                        this._callbacks.trigger('onCallOffered', {id: msg.caller, media: msg.media});
                        break;
                    case 'answer':
                        this._callbacks.trigger('onCallAnswered', {id: msg.caller, media: msg.media});
                        media = msg.media.substring(0, 1);
                        this.peerConnections(media + msg.caller).setRemoteDescription(this._adapter.RTCSessionDescription(msg.data));
                        break;
                    case 'candidate':
                        media = msg.media.substring(0, 1);
                        var peer = this.peerConnections(media + msg.caller); 
                        if(peer.answerCreated || peer.isCaller) {
                            if(!peer.isConnected) {
                                peer.addIceCandidate(msg.data);
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
                    case 'im':
                         this._callbacks.trigger('onPeerIMMessage', {id: msg.caller, content: msg.data.content, private: msg.data.private});
                        break;
                    case 'bye':
                        this._callbacks.trigger('onCallEnded', {id: msg.caller, media: msg.media});
                        break;
                    default:
                        this._callbacks.trigger('onTransportMessage', msg);
                        break;
                }

            }, this);

            this._transport.on('onClose', function(msg) {
                Sonotone.log("SONOTONE.IO", "Transport connection closed", msg);
                this._callbacks.trigger('onTransportClose', msg);
            }, this);  

            this._transport.on('onError', function(msg) {
                Sonotone.log("SONOTONE.IO", "Transport error", msg);
                this._callbacks.trigger('onTransportError', msg);
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

            this._localMedia.on('onLocalVideoStreamStarted', function() {
                Sonotone.log("SONOTONE.IO", "Local Media successfully initialized");

            }, this);

            this._localMedia.on('onLocalVideoStreamEnded', function() {
                Sonotone.log("SONOTONE.IO", "Local Video Media stopped");

                for(var peerID in this._peerConnections) {

                    if(peerID.substring(0,1) === 'v') {
                        that.peerConnections(peerID).detach(that.localMedia().streamVideo());

                        //Inform other (SIG) about stopping call
                        var message = {
                            data: {
                                type: 'bye',
                            },
                            media: 'video',
                            caller: Sonotone.ID,
                            callee: peerID.substring(1)
                        };

                        that._transport.send(message);    
                    }
                }

            }, this);

            this._localMedia.on('onLocalScreenStreamEnded', function() {
                Sonotone.log("SONOTONE.IO", "Local Screen Media stopped");

                for(var peerID in this._peerConnections) {

                    if(peerID.substring(0,1) === 's') {
                        that.peerConnections(peerID).detach(that.localMedia().streamScreen());

                        //Inform other (SIG) about stopping call
                        var message = {
                            data: {
                                type: 'bye',
                            },
                            caller: Sonotone.ID,
                            callee: peerID.substring(1),
                            media: 'screen',
                        };

                        that._transport.send(message);    
                    }
                }

            }, this);            

            this._localMedia.on('onLocalVideoStreamError', function(err) {
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

    _getMediaUsed: function(peer) {
        return peer.ID().substring(0,1) === 'v' ? 'video' : peer.ID().substring(0,1) === 's' ? 'screen' : 'data';
    },

    /**
     * Subscribe to PeerConnection event
     * @param {Object} peer The PeerConnection to subscribe
     */

    _subscribeToPeerConnectionEvent: function(peer) {

        // Listen to candidates
        peer.on('onICECandiateReceived', function(event) {
            
            // Only send this message when no using a SIP transport
            if(this._transport.type() !== 'sip') {
                
                if(!peer.isConnected) {

                    Sonotone.log("SONOTONE.IO", "Send ICE Candidate received by Peer Connection <" + peer.ID() + ">");

                    var message = {
                        data: {
                            type: 'candidate',
                            label: event.candidate.sdpMLineIndex,
                            id: event.candidate.sdpMid,
                            candidate: event.candidate.candidate
                        },
                        caller: Sonotone.ID,
                        callee: peer.ID().substring(1),
                        media: this._getMediaUsed(peer)
                    };

                    this._transport.send(message);
                }
                else {
                    Sonotone.log("SONOTONE.IO", "Do not send ICE Candidate because Peer Connection <" + peer.ID() + "> is already connected");
                }    
            }

        }, this);

        // Listen to end of candidate
        peer.on('onICECandidateEnd', function(message) {

            
            // Special case of SIP transport: Send SDP only when ICE candidate are all received
            if(this._transport.type() === 'sip') {
                
                Sonotone.log("SONOTONE.IO", "Send the complete SDP to PeerConnection <" + peer.ID() + '>');

                
                this._transport.send(message);
            }

            
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

            Sonotone.log("SONOTONE.IO", "Create the Remote Media with this remote stream received for PeerConection <" + peer.ID() + ">");
            this._remoteMedia.stream(event.stream, peer.ID(), peer.media());

        }, this);

        // Listen to end of remote stream
        peer.on('onRemoteStreamEnded', function() {
            Sonotone.log("SONOTONE.IO", "Remote Stream ended");
        }, this);

        // Listen to Offer to send 
        peer.on('onSDPOfferToSend', function(event) {

            //Only send this message when transport is not a SIP transport
            if(this._transport.type() !== 'sip') {
                // Send this message to the remote peer
                this._transport.send(event);
            }

        }, this);

        // Listen to Answer to send
        peer.on('onSDPAnswerToSend', function(event) {

            //Only send this message when transport is not a SIP transport
            if(this._transport.type() !== 'sip') {
                // Send this message to the remote peer
                this._transport.send(event);    
            }

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
                    this._callbacks.trigger('onCallStarted', {id: peer.ID(), media: peer.media()});

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
                        this._remoteMedia.stream(streams[0], peer.ID(), peer.media());
                    }
                    break;

                // Disconnected by the other peer
                case "disconnected":
                    Sonotone.log("SONOTONE.IO", "Disconnected PeerConnection <" + peer.ID() + ">");
                    this.peerConnections(peer.ID()).isConnected = false;
                    this.peerConnections(peer.ID()).close();
                    break;

                // PeerConnection closed
                case "closed":
                    Sonotone.log("SONOTONE.IO", "Closed PeerConnection <" + peer.ID() + ">");
                    this._removePeer(peer.ID());
                    break;
            }

        }, this);

        // A change has been made that need a renegotiation
        // Should be used only if a connection already exists
        peer.on('onNegotiationNeeded', function() {
            peer.createOffer(this._getMediaUsed(peer), false, null);                
        }, this);

        // Listen to a new file received
        peer.on('onFileReceived', function(event) {

            var msg = {
                caller: peer.ID(),
                callee: Sonotone.ID,
                data: event
            };

            this._callbacks.trigger('onPeerFileReceived', msg);

        }, this);

        // Listen to peerConnection statistics
        peer.on('onPeerConnectionStats', function(event) {
            this._callbacks.trigger('onPeerConnectionStats', event);
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
 * Config namespace.
 * 
 * @namespace
 */

var Capabilities = Sonotone.IO.Capabilities = function() {
	this._browser = 'unknown';
	this._browserVersion = 'unknown';
	this._audioVideoEnabled = false;
	this._sharingEnabled = false;
	this._sharingViewerEnabled = false;
	this._dataChannelEnabled = false;
	this._HTTPSEnabled = window.location.protocol === "http:" ? false : true;

	if(navigator.mozGetUserMedia && window.mozRTCPeerConnection) {
		// Firefox: Can make call but not sharing
        this._browser = "Firefox";
        this._browserVersion = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
        this._audioVideoEnabled = true;
        this._sharingEnabled = false;
        this._sharingViewerEnabled = true;
        this._dataChannelEnabled = true;
	}
	else if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection) {
        // Chrome: can make call or Sharing
        this._browser = "Chrome";
        this._browserVersion = parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);
        this._audioVideoEnabled = true;
        this._sharingViewerEnabled = true;
        this._sharingEnabled = this._HTTPSEnabled;
        if(this._browserVersion >= 31) {
            this._dataChannelEnabled = true;
        }
	}

	// Display Browser version
    Sonotone.log("CAPABILITIES", "Started on " + this._browser  + " v" + this._browserVersion);

};

/**
 * Capabilities interface.
 *
 */

Capabilities.prototype = {

	/**
	 * Get the Capabilities of the user
	 *
	 * api public
	 */

	caps: function() {
		return {
			browser: this._browser,
			browserVersion: this._browserVersion,
			canDoAudioVideoCall: this._audioVideoEnabled,
			canDoScreenSharing: this._sharingEnabled,
			canViewScreenSharing: this._sharingViewerEnabled,
			canUseDataChannel: this._dataChannelEnabled,
			startedWithHTTPS: this._HTTPSEnabled
		};		
	}
};/**
 * Adapter
 * For keeping API compatibility between Chrome and Firefox
 * Compliant since:
 * Chrome 28+
 * Firefox 22+
 *
 * @namespace
 */

var Adapter = Sonotone.IO.Adapter = function() {

	this._isFirefox = false;
	this._isChrome = false;

	if(navigator.mozGetUserMedia && window.mozRTCPeerConnection) {
		this._isFirefox = true;
	}
	else if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection) {
		this._isChrome = true;
	}

};

/**
 * Adapter interface.
 *
 */

Adapter.prototype = {

	getUserMedia: function(constraints, callback, errCallback, context) {

		if(this._isChrome) {
			return navigator.webkitGetUserMedia.bind(navigator).call(context, constraints, callback, errCallback);
		}
		else if(this._isFirefox) {
			return navigator.mozGetUserMedia.bind(navigator).call(context, constraints, callback, errCallback, context);
		}
	},

	attachToMedia: function(element, stream) {
		if(this._isChrome) {
			if (typeof element.srcObject !== 'undefined') {
                element.srcObject = stream;
            } else if (typeof element.mozSrcObject !== 'undefined') {
                element.mozSrcObject = stream;
            } else if (typeof element.src !== 'undefined') {
                element.src = window.URL.createObjectURL(stream);
            }
		}
		else if(this._isFirefox) {
			element.mozSrcObject = stream;
            element.play();
		}
		return element;	
	},

	RTCPeerConnection: function (stun, constraints) {
		if(this._isChrome) {
			return new window.webkitRTCPeerConnection(stun, constraints);
		} else if (this._isFirefox) {
			return new window.mozRTCPeerConnection(stun, constraints);
		}
	},

	RTCSessionDescription: function (sdp) {
		if(this._isChrome) {
			return new window.RTCSessionDescription(sdp);
		} else if (this._isFirefox) {
			return new window.mozRTCSessionDescription(sdp);
		}	
	},

	RTCIceCandidate: function (candidate) {
		if(this._isChrome) {
			return new window.RTCIceCandidate(candidate);
		} else if (this._isFirefox) {
			return new window.mozRTCIceCandidate(candidate);
		}	
	},

	RTCPeerConnectionConstraints: function() {
		if(this._isChrome) {
			return {
				optional: [
					{
						//DtlsSrtpKeyAgreement: true
					}
				]
			};
		} else if (this._isFirefox) {
			return {
				optional: [
					{
						RtpDataChannels: true
					}
				]
			};
		}	
	}




};/**
 * LocalMedia namespace.
 *
 * @namespace
 */

var LocalMedia = Sonotone.IO.LocalMedia = function(caps, adapter) {
    Sonotone.log("LOCALMEDIA", "LocalMedia initialized");

    this._requestUserMediaPending = false;
    this._callbacks = new Sonotone.IO.Events();

    this._streamVideo = null;
    this._streamScreen = null;

    this._isScreenCaptured = false;
    this._isCameraCaptured = false;

    this._caps = caps;

    this._adapter = adapter;
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
                    maxHeight: 240
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
                    default:
                        mediaConstraints.video.mandatory = {
                            maxWidth: 320,
                            maxHeight: 240
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
        if(!this._requestUserMediaPending && this._caps.canDoAudioVideoCall) {

            var that = this;

            var mediaConstraints = this._getMediaConstraints(constraints);

            Sonotone.log("LOCALMEDIA", "Requested access to local media - Camera....", constraints);

            if(constraints.audio && constraints.video) {
                Sonotone.log("LOCALMEDIA", "Ask for audio and video media", mediaConstraints);
            }
            else if(constraints.audio) {
                Sonotone.log("LOCALMEDIA", "Ask for audio only", mediaConstraints);
                //if(this._caps.browser === "firefox") {
                    //mediaConstraints.video = false;
                //}
            }
            else if(constraints.video) {
                Sonotone.log("LOCALMEDIA", "Ask for video only", mediaConstraints);
                //if(this._caps.browser === "firefox") {
                    //mediaConstraints.audio = false;
                //}
            }
            else {
                Sonotone.log("LOCALMEDIA", "Ask for no media", mediaConstraints);
                 //if(this._caps.browser === "firefox") {
                    //mediaConstraints.audio = false;
                    //mediaConstraints.video = false;
                //}
            }

            this._requestUserMediaPending = true;

            this._adapter.getUserMedia(mediaConstraints, function(_stream) {
                Sonotone.log("LOCALMEDIA", "User has granted access to local media - Camera", _stream);              
                that._streamVideo = _stream;
                that._requestUserMediaPending = false;
                that._subscribeToStreamEvent(that._streamVideo);
                that._isCameraCaptured = true;
                that._callbacks.trigger('onLocalVideoStreamStarted', {media: 'video', stream: that._streamVideo});
            }, function(_error) {
                Sonotone.log("LOCALMEDIA", "Failed to get access to local media", _error);   
                that._requestUserMediaPending = false;
                that._isCameraCaptured = false;
                that._callbacks.trigger('onLocalVideoStreamError', {code: 1, message:"", name: "PERMISSION_DENIED"});
            }, this);
        }  
        else {
            if(!this._caps.canDoAudioVideoCall) {
                Sonotone.log("LOCALMEDIA", "Browser not compliant for Audio/Video Communication");  
                this._callbacks.trigger('onLocalVideoStreamError', {code: 2, message:"", name: "BROWSER_NOT_COMPLIANT"});
            }
            else {
                Sonotone.log("LOCALMEDIA", "Aquire already in progress...");  
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
         if(this._isScreenCaptured) {
            Sonotone.log("LOCALMEDIA", "Stop local media - Screen stream...");
            this._streamScreen.stop();
        }
    },

    /**
     * Release Screen stream on local Media
     *
     * @api public
     */

    releaseVideo: function() {
         if(this._isCameraCaptured) {
            Sonotone.log("LOCALMEDIA", "Stop local media - Video stream...");
            this._streamVideo.stop();
        }
    },

    /**
     * Share the screen to an other peer
     *
     * @api public
     */

    acquireScreen: function(constraints, id) {

        // Screen sharing seems to work only using HTTPS
        if(this._caps.canDoScreenSharing && this._caps.startedWithHTTPS) {
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

            var video_constraints = null;

            if(id) {
                video_constraints = {
                    mandatory: { 
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: id,

                        maxWidth: maxWidth,
                        maxHeight: maxHeight
                    },
                    optional: []
                };
            }
            else {
                video_constraints = {
                    mandatory: { 
                        chromeMediaSource: 'screen',

                        maxWidth: maxWidth,
                        maxHeight: maxHeight
                    },
                    optional: []
                };
            }

            Sonotone.log("LOCALMEDIA", "Ask for screen media", video_constraints);

            this._adapter.getUserMedia({
                video: video_constraints
            }, function(_stream) {
                Sonotone.log("LOCALMEDIA", "User has granted access to local media - Screen");              
                that._streamScreen = _stream;
                that._requestUserMediaPending = false;
                that._isScreenCaptured = true;
                that._subscribeToStreamEvent(that._streamScreen);
                that._callbacks.trigger('onLocalScreenStreamStarted', {media:'screen', stream: that._streamScreen});
            }, function(_erroronstreaming) {
                that._isScreenCaptured = false;
                Sonotone.log("LOCALMEDIA", "Failed to get access to local media - Screen", _erroronstreaming);   
                that._requestUserMediaPending = false;
                that._callbacks.trigger('onLocalScreenStreamError', {code: 1, message:"", name: "PERMISSION_DENIED"});
            }, this);
        }
        else {
            if(!this._caps.startedWithHTTPS) {
                Sonotone.log("LOCALMEDIA", "Protocol should be HTTPS");  
                this._callbacks.trigger('onLocalScreenStreamError', {code: 3, message:"", name: "PROTOCOL_ERROR"});
                
            }
            else {
                Sonotone.log("LOCALMEDIA", "Browser not compliant for Desktop/Application sharing");  
                this._callbacks.trigger('onLocalScreenStreamError', {code: 2, message:"", name: "BROWSER_NOT_COMPLIANT"});    
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
     * Unsubscribe to IO events
     * @param {String} eventName The event to unsubscribe
     * @param {Function} callbackFunction The registered callback
     *
     * @api public
     */    

    off: function(eventName, callbackFunction) {
        this._callbacks.off(eventName, callbackFunction);
    },

    /**
     * Trigger event
     * For testing purpose
     *
     * @api public
     */
    trigger: function(eventName, args) {
        this._callbacks.trigger(name, args);
    },

    /**
     * Attach the Local video stream to a <video> or <canvas> element
     *
     * @api public
     */

    renderVideoStream: function(HTMLMediaElement) {
        Sonotone.log("LOCALMEDIA", "Render the local stream - Video"); 
        if(this._streamVideo) {
            return this._adapter.attachToMedia(HTMLMediaElement, this._streamVideo);    
        }
        else {
            return null;
        }
    },

     /**
     * Attach the Local screen stream to a <video> or <canvas> element
     *
     * @api public
     */

    renderScreenStream: function(HTMLMediaElement) {
        Sonotone.log("LOCALMEDIA", "Render the local stream - Screen");
        if(this._streamScreen) {
            return this._adapter.attachToMedia(HTMLMediaElement, this._streamScreen);    
        }
        else {
            return null;
        }
    },

    /**
     * Get the Local Video Stream
     *
     * @api public
     */

    streamVideo: function(streamVideo) {
        if(streamVideo) {
            this._streamVideo = streamVideo;
            this._isCameraCaptured = true;
        }
        return this._streamVideo;
    },

    /**
     * Get the Local Video Stream
     *
     * @api public
     */

    streamScreen: function(streamScreen) {
        if(streamScreen) {
            this._streamScreen = streamScreen;
            this._isScreenCaptured = true;
        }
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
     * Get or set the capabilities
     * For testing purpose
     */
    caps: function(caps) {
        if(caps) {
            this._caps = caps;
        }
        return this._caps;
    },

    /**
     * Subscribe to stream events
     *
     * @api private
     */

    _subscribeToStreamEvent: function(stream) {

        var that = this;

        stream.onended = function(e) {

            var s = e.currentTarget;

            Sonotone.log("LOCALMEDIA", "A local track has ended... Try to find the good one...", s.id);

            console.log("VIDEO/SCREEN", that._streamVideo, that._streamScreen);

            if(that._streamVideo) {
                if(s.id === that._streamVideo.id) {
                    // It concerns the camera
                    Sonotone.log("LOCALMEDIA", "Local Video Stream has ended");
                    that._callbacks.trigger('onLocalVideoStreamEnded');
                    that._streamVideo = null;
                    that._isCameraCaptured = false;
                }
                else {
                    Sonotone.log("LOCALMEDIA", "Not the Video stream");
                }    
            }
            if (that._streamScreen) {
                if(s.id === that._streamScreen.id) {
                    // It concerns the screen
                    Sonotone.log("LOCALMEDIA", "Local Screen Stream has ended");
                    that._callbacks.trigger('onLocalScreenStreamEnded');
                    that._streamScreen = null;
                    that._isScreenCaptured = false;
                }
                else {
                    Sonotone.log("LOCALMEDIA", "Not the Screen stream");
                }
            }
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

var RemoteMedia = Sonotone.IO.RemoteMedia = function(adapter) {
    Sonotone.log("REMOTEMEDIA", "RemoteMedia initialized");

    this._callbacks = new Sonotone.IO.Events();
    this._stream = {};
    this._mediaReady = false;
    this._adapter = adapter;
};

/**
 * RemoteMedia interface.
 *
 */

RemoteMedia.prototype = {
    
    /**
     * Get or set the remote Stream
     * @param {Object} stream The remote Stream
     * @param {String} peerID The PeerConnection on which the remote Stream is attached
     * @param {String} mediaType The Media (video or screen)
     * @api public
     */

    stream: function(stream, peerID, mediaType) {
        if(stream !== null) {

            Sonotone.log("REMOTEMEDIA", "Existing Streams", this._stream);

            if(this._stream[peerID] !== undefined) {
                Sonotone.log("REMOTEMEDIA", "Stream already exists. Add again to the Remote Media for peer <" + peerID + ">");
            }
            else {
                Sonotone.log("REMOTEMEDIA", "Set the stream associated to this Remote Media for peer <" + peerID + ">");
            }
            this._stream[peerID] = stream;

            //Get the userID (= peerID without the media)
            var id = peerID.substring(1);

            this._subscribeToStreamEvent(stream, id, mediaType);

            var evt = {id: id, media: mediaType, stream: stream};

            if(mediaType === 'video') {
                Sonotone.log("REMOTEMEDIA", "Fire new remote video stream received", evt);
                this._callbacks.trigger('onRemoteVideoStreamStarted', evt);    
            }
            else {
                Sonotone.log("REMOTEMEDIA", "Fire new remote screen stream received", evt);
                this._callbacks.trigger('onRemoteScreenStreamStarted', evt);    
            }
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
     * Unsubscribe to IO events
     * @param {String} eventName The event to unsubscribe
     * @param {Function} callbackFunction The registered callback
     *
     * @api public
     */    

    off: function(eventName, callbackFunction) {
        this._callbacks.off(eventName, callbackFunction);
    },

    /**
     * Attach the RemoteStream to a <video> or <canvas> element
     *
     * @api public
     */

    renderStream: function(HTMLMediaElement, id, media) {
        
        var flag = media.substring(0,1),
        peerID = flag + id;

        if(media === "video") {
            Sonotone.log("REMOTEMEDIA", "Render the video stream associated to peer <" + peerID + ">"); 
        }
        else {
            Sonotone.log("REMOTEMEDIA", "Render the screen stream associated to peer <" + peerID + ">"); 
        }
        this._adapter.attachToMedia(HTMLMediaElement, this._stream[peerID]);
    },

    /**
     * Subscribe to Stream events
     *
     * @api private
     */

    _subscribeToStreamEvent: function(stream, id, media) {

        var that = this;

        console.log("subscribe to remote stream", stream, id, media);

        stream.onended = function() {
            Sonotone.log("REMOTEMEDIA", "Remote Stream has ended"); 
            //TODO
            //Perahps we have to remove the MediaTrack that ended
            if(media === 'video') {
                that._callbacks.trigger('onRemoteVideoStreamEnded', {id: id, media: media});
            }
            else {
                that._callbacks.trigger('onRemoteScreenStreamEnded', {id: id, media: media});   
            }

            // Free memory
            var peerID = media.substring(0,1) + id;
            that._stream[peerID] = null;
            delete that.stream[peerID];
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


    type: function() {
        return "remote";
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
    },

    /**
     * Unsubscribe to IO events
     * @param {String} eventName The event to unsubscribe
     * @param {Function} callbackFunction The registered callback
     *
     * @api public
     */    

    off: function(eventName, callbackFunction) {
        this._callbacks.off(eventName, callbackFunction);
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

var WebSocketTransport = Sonotone.IO.WebSocketTransport = function(config, caps) {
    this._host = config.host;
    this._port = config.port;
    this._transportReady = false;
    this._socket = null;
    this._callbacks = new Sonotone.IO.Events();
    this._id = new Date().getTime();
    this._room = null;
    this._caps = caps;

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

    type: function() {
        return "websocket";
    },

    /**
     * Connect the Transport
     * @param {Object} data The user capabilities that have to be transmitted to others peers (nickname, audio/video capabilities...)
     * @param {String} code, The conference code (room)
     *
     * @api public
     */

    connect: function(data, code) {
        if(!this._socket) {
            Sonotone.log("TRANSPORT", "Try to connect to SIG server");
            
            if(this._port) {
                console.log("LOCAL", "wss://localhost:8882");
                //this._socket = new WebSocket("wss://" + this._host + ":" + this._port);
                this._socket = new WebSocket("wss://localhost:8882");
            }
            else {
                this._socket = new WebSocket("wss://" + this._host);
            }

            this._room = code;

            var that = this;

            if(data) {
                for (var prop in data) {
                    this._caps[prop] = data[prop];
                }    
            }

            this._socket.onopen = function(msg) {
                Sonotone.log("TRANSPORT", "Channel Ready");
                that._transportReady = true;
                that._callbacks.trigger('onReady', msg);

                that.send(
                    {
                        data: {
                            type: 'join',
                            caps: that._caps
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
                    Sonotone.log("TRANSPORT", "Unknown message. Do not treat", message);
                }
            };

            this._socket.onclose = function() {
                Sonotone.log("TRANSPORT", "Channel Closed");
                that._transportReady = false;
            };

            this._socket.onerror = function(err) {
                Sonotone.log("TRANSPORT", "Receive an error message", err);
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
    },

    /**
     * Unsubscribe to IO events
     * @param {String} eventName The event to unsubscribe
     * @param {Function} callbackFunction The registered callback
     *
     * @api public
     */    

    off: function(eventName, callbackFunction) {
        this._callbacks.off(eventName, callbackFunction);
    },

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
    },

    /**
     * Unsubscribe to IO events
     * @param {String} eventName The event to unsubscribe
     * @param {Function} callbackFunction The registered callback
     *
     * @api public
     */    

    off: function(eventName, callbackFunction) {
        this._callbacks.off(eventName, callbackFunction);
    }
};/**
 * SIPTransport over WebSocket Namespace.
 *
 * @namespace
 */

var SIPTransport = Sonotone.IO.SIPTransport = function() {

    this._softPhone = null;
    this._transportReady = false;
    this._call = null;

    this._callbacks = new Sonotone.IO.Events();

    this._peer = null;
};

/**
 * SIPTransport interface.
 *
 */

SIPTransport.prototype = {

    type: function() {
        return "sip";
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
    },

    /**
     * Unsubscribe to IO events
     * @param {String} eventName The event to unsubscribe
     * @param {Function} callbackFunction The registered callback
     *
     * @api public
     */    

    off: function(eventName, callbackFunction) {
        this._callbacks.off(eventName, callbackFunction);
    },

    /**
     * Connect the Transport
     *
     * @api public
     */

    connect: function(params) {
        var that = this;

        this._softPhone = new JsSIP.UA(params);

        this._softPhone.on('registered', function() {
            Sonotone.log("TRANSPORT", "Registered to SIP Server thru WebSocket Gateway", params.ws_servers);
            that._transportReady = true;
            that._callbacks.trigger('onReady', {msg: 'registered'});
        });

        this._softPhone.on('unregistered', function() {
           that._callbacks.trigger('onClose', {msg: 'unregistered'}); 
        });

        this._softPhone.on('registrationFailed', function() {
            that._callbacks.trigger('onError', {err: 'registration-failed'});
        });

        this._softPhone.on('connected', function() {
            //that._callbacks.trigger('onConnected', null);
        });

        this._softPhone.on('disconnected', function() {
            //that._callbacks.trigger('onDisconnected', null);
        });

        this._softPhone.on('newRTCSession', function(e){
            that._call = e.data.session;
            Sonotone.log("TRANSPORT", "Get the call session", that._call);
        });

        Sonotone.log("TRANSPORT", "Try to register to SIP Server with user", params.uri);
        this._softPhone.start();

        
        // this._softPhone.call('7040', {
        //     'extraHeaders': [ 'X-Foo: foo', 'X-Bar: bar'],
        //     'RTCConstraints': {"optional" : [{'DtlsSrtpKeyAgreement': true}]},
        //     'mediaConstraints': {'audio': true, 'video': false}
        // });
    },

    send: function(JSONMessage) {
        console.log("SEND SIP", JSONMessage);

        console.log("PEER", this._peer);

        if(JSONMessage.data.type === 'offer') {
            this._softPhone.call(JSONMessage.callee, {
                'extraHeaders': [ 'X-Foo: foo', 'X-Bar: bar'],
                'RTCConstraints': {"optional" : [{'DtlsSrtpKeyAgreement': true}]},
                'mediaConstraints': {'audio': true, 'video': false}
            }, JSONMessage.data.sdp, this._peer);
        }

    },

    setPeer: function(peer) {
        this._peer = peer;
    }

};/**
 * PeerConnection namespace.
 * @param {String} id The peerConnection ID to user
 * @param {Boolean} hasRemoteDataChannel True if the remote peer can use Data Channel
 * @param {Object} caps The user capabilities
 * @namespace
 */

var PeerConnection = Sonotone.IO.PeerConnection = function(id, hasRemoteDataChannel, adapter, caps) {

    Sonotone.log("PEERCONNECTION", "Create new Peer Connection <" + id + ">");

    /**
     * PeerConnection ID
     * (s)xxxxxxxxx : for Screen sharing PeerConnection
     * (v)xxxxxxxxx : for Video PeerConnection
     */

    this._id = id;

    this._dataChannel = null;

    /**
     * Dedicated Media
     * Can be: video, screen data
     */

    this._media = (id.substring(0, 1) === 'v') ? 'video' : (id.substring(0, 1) === 's') ? 'screen' : 'data';

    this.isCaller = false;

    this.offerPending = false;

    this.raw = null;

    this.answerCreated = false;

    this.isConnected = false;

    this._streamConnected = false;

    this._streamForcedDetached = false;

    this.statID = '';

    this._caps = caps;

    this._adapter = adapter;

    this._localsdp = null;

    Sonotone.log("PEERCONNECTION", "Use STUN Server", Sonotone.stunConfig);

    //this._peer = this._adapter.RTCPeerConnection(Sonotone.stunConfig, this._adapter.RTCPeerConnectionConstraints(), this._adapter);
    this._peer = this._adapter.RTCPeerConnection(Sonotone.stunConfig, null);

    if(this.media === 'data') {
        this.addDataChannel();
    }

    Sonotone.log("PEERCONNECTION", "PeerConnection created", this._peer);

    this._callbacks = new Sonotone.IO.Events();

    var that = this;

    // Chrome - Firefox
    this._peer.onicecandidate = function(event) {
        if (event.candidate) {
            Sonotone.log("PEERCONNECTION", "Get local ICE CANDIDATE from PEER CONNECTION <" + that._id + ">", event);
            that._callbacks.trigger('onICECandiateReceived', event);
        } else {
            Sonotone.log("PEERCONNECTION", "No more local candidate to PEER CONNECTION <" + that._id + ">", event);
            
            //Todo send SDP
            var msg = {
                data: {
                    type: 'offer',
                    sdp: that.getLocalDescription().sdp
                }, 
                caller: Sonotone.ID,
                callee:  that._id.substring(1),
                media: that._media,
                channel: false,
                muted: false
            };

            that._callbacks.trigger("onICECandidateEnd", msg);
        }
    };

    // Chrome - Firefox
    this._peer.onaddstream = function(event) {
        Sonotone.log("PEERCONNECTION", "Remote stream added from PEER CONNECTION <" + that._id + ">");
        that._callbacks.trigger('onRemoteStreamReceived', event);
        that._streamConnected = true;
    };

    // Chrome - Firefox
    this._peer.onremovestream = function(event) {
        Sonotone.log("PEERCONNECTION", "Remote stream removed from PEER CONNECTION <" + that._id + ">");
        that._callbacks.trigger('onRemoteStreamEnded', event); 
        that._streamConnected = false; 
    };

    // Chrome only
    this._peer.oniceconnectionstatechange = function(event) {
        var state = event.target.iceConnectionState;
        Sonotone.log("PEERCONNECTION", "On Ice Connection state changes to " + state + " for PEER CONNECTION <" + that._id + ">", event);
        that._callbacks.trigger('onIceConnectionStateChanged', state);
    };

    // Chrome only
    // Only if stream is connected
    this._peer.onnegotiationneeded = function(event) {
        Sonotone.log("PEERCONNECTION", "On negotiation needed for PEER CONNECTION <" + that._id + ">", event);
        if(that._streamConnected) {
            that._callbacks.trigger('onNegotiationNeeded', event);
            Sonotone.log("PEERCONNECTION", "Negotiation really needed because PEER CONNECTION <" + that._id + "> is connected");    
        }
        else {
            Sonotone.log("PEERCONNECTION", "Negotiation not needed because PEER CONNECTION <" + that._id + "> is not connected", event);
        }
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

    this._peer.ondatachannel = function(event) {
        Sonotone.log("PEERCONNECTION", "Received Data Channel from <" + that._id + ">", event);
        that.addDataChannel(event.channel);
    };

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
     * Media of the Peer Connection
     *
     * @api public
     */
    media: function(media) {
        if(media) {
            this._media = media;
        }
        return this._media;
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

            var streams = this._peer.getLocalStreams(),
            alreadyAdded = false;
            for (var i=0;i< streams.length;i++) {
                if(streams[i].id === stream.id) {
                    alreadyAdded = true;
                }
            }

            this._streamForcedDetached = false;

            //As getStreamById is not yet implemented in Firefox, we should use the getLocalStreams method
            //if(this._peer.getStreamById(stream.id) == null) {
            if(!alreadyAdded) {
                this._peer.addStream(stream);
            }
            else {
                Sonotone.log("PEERCONNECTION", "Stream already added to the Peer Connection <" + this._id + ">");
            }
        }
        else {
            Sonotone.log("PEERCONNECTION", "No stream to add to the Peer Connection <" + this._id + ">");
        }
    },

    /**
     * ID of the PeerConnection
     * @param {Object} stream The stream to detach
     * @param {Object} forced True if forced by the user
     *
     * @api public
     */

    detach: function(stream, forced) {

        if(stream) {
            Sonotone.log("PEERCONNECTION", "Detach a stream to the Peer Connection <" + this._id + ">");
            
            var streams = this._peer.getLocalStreams(),
            exist = false;
            for (var i=0;i< streams.length;i++) {
                if(streams[i].id === stream.id) {
                    exist = true;
                }
            }            

            //As getStreamById is not yet implemented in Firefox, we should use the getLocalStreams method
            //if(this._peer.getStreamById(stream.id) !== null) {
            if(exist && !stream.ended) {
                this._peer.removeStream(stream);    
            }
            if(forced) {
                this._streamForcedDetached = true;
            }
        }
        else {
            Sonotone.log("PEERCONNECTION", "No stream to remove from the Peer Connection <" + this._id + ">");
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
     * Is the stream connected
     *
     * @api public
     */

    isStreamConnected: function() {
        return this._streamConnected;
    },

    /**
     * If a local Media stream exists, should it added to the peer (true if blocked)
     *
     * @api public
     */

     isLocalStreamBlocked: function() {
        return this._streamForcedDetached;
     },

    /**
     * Store the SDP into the Local Description of the peer
     * @param {Objet} SDP The JSON SDP message
     *
     * @api public
     */

    setLocalDescription: function(SDP) {
        Sonotone.log("PEERCONNECTION", "Store the SDP parameters to the local description of Peer Connection <" + this._id + ">");
        this._peer.setLocalDescription(SDP);
    },

    getLocalDescription: function() {
        return this._peer.localDescription;
    },

    /**
     * Store the SDP into the Remote Description of the peer
     * @param {Objet} SDP The JSON SDP message
     *
     * @api public
     */

    setRemoteDescription: function(SDP) {
        Sonotone.log("PEERCONNECTION", "Store the SDP parameters to the remote description of Peer Connection <" + this._id + ">");
        this._peer.setRemoteDescription(SDP);
    },

    /**
     * Create an offer to one or several peers
     * @param {Boolean} isForScreenSharing True if the screen has been captured
     * @param {Boolean} withDataChannel True if DataChannel is required
     * @param {Object} fct The action to do on the peerConnection SDP
     *
     * @api public
     */ 

    createOffer: function(media, withDataChannel, fct) {

        if(!this.offerPending) {

            var sdpConstraints = {
                'mandatory': {
                    'OfferToReceiveAudio': media === 'screen' ? false : true,
                    'OfferToReceiveVideo': media === 'screen' ? false : true 
                }
            };

            this.isCaller = true;

            this.offerPending = true;

            var muted = false;

            var offerConstraints = {"optional": [], "mandatory": {}};

            var constraints = Sonotone.mergeConstraints(offerConstraints, sdpConstraints);

            if(media === 'data') {
                constraints = null;
            }

            Sonotone.log("PEERCONNECTION", "Create the SDP offer for Peer Connection <" + this._id + ">", constraints);

            var that = this;

            this._peer.createOffer(function(offerSDP) {

                if(fct) {
                    switch (fct.action) {
                        case 'mute':
                            offerSDP = that.muteSDP(offerSDP);
                            muted = true;
                            break;
                        case 'unmute':
                            offerSDP = that.unmuteSDP(offerSDP);
                            break;
                        default:
                            break;
                    }
                }
                
                Sonotone.log("PEERCONNECTION", "Set the SDP to local description for <" + that._id + ">", offerSDP);
                //offerSDP.sdp = preferOpus(offerSDP.sdp);
                that.setLocalDescription(offerSDP);
                
                var event = {
                    data: offerSDP,
                    caller: Sonotone.ID,
                    callee:  that._id.substring(1),
                    media: media,
                    channel: withDataChannel,
                    muted: muted
                };

                that.offerPending = false;

                that._callbacks.trigger('onSDPOfferToSend', event);

            }, function(error) {
                Sonotone.log("PEERCONNECTION", "Fail to create Offer for Peer Connection <" + that._id + ">", error);
                that.offerPending = false;
            }, constraints);

        }
    },

    /**
     * Create an SDP answer message
     * @param {Boolean} media Media used in the offer
     *
     */

    createAnswer: function(media) {

        var sdpConstraints = {
            'mandatory': {
                'OfferToReceiveAudio': true,
                'OfferToReceiveVideo': true
            }
        };
                    
        var that = this;

        this.isCaller = false;

        if(media === 'data') {
            sdpConstraints = null;
        }
                    
        this._peer.createAnswer(function(answerSDP) {
            //answerSDP.sdp = preferOpus(answerSDP.sdp);
            that.setLocalDescription(answerSDP);
                      
            Sonotone.log("PEERCONNECTION", "Send this SDP answer to the remote peer <" + that._id + ">");

            var event = {
                data: answerSDP,
                caller: Sonotone.ID,
                callee: that._id.substring(1),
                media: media
            };

            that._callbacks.trigger('onSDPAnswerToSend', event);

        }, function(error) {
            Sonotone.log("PEERCONNECTION", "Fail to create Answer for Peer Connection <" + that._id + ">", error);
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
        var candidate = this._adapter.RTCIceCandidate({sdpMLineIndex:ICEcandidate.label, candidate:ICEcandidate.candidate, id: ICEcandidate.sdpMid});
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
     * Unsubscribe to IO events
     * @param {String} eventName The event to unsubscribe
     * @param {Function} callbackFunction The registered callback
     *
     * @api public
     */    

    off: function(eventName, callbackFunction) {
        this._callbacks.off(eventName, callbackFunction);
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
     * Add a Data Channel with the peer
     * @param {Object} channel Add an existing channel 
     *
     * @api public
     */

     addDataChannel: function(channel) {
        this._dataChannel = new Sonotone.IO.DataChannel(this._id, this._peer, this._caps, channel);

        this._subscribeToDataChannelEvents();
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
     * Send message using the DataChannel
     * @param {Object} msg The message
     *
     * @api public
     */

    sendMessage: function(msg) {
        this._dataChannel.sendData(msg);
    },

    /**
     * Activate the stats for the peerConnection
     *
     * @api public
     */

    activateStats: function() {
            
        Sonotone.log("PEERCONNECTION", "Activate stat for PeerConnection <" + this._id + ">");

        var that = this;

        this.bytesPrevUp = 0;
        this.timestampPrevUp = 0;
        this.bytesPrevDown = 0;
        this.timestampPrevDown = 0;
        this.bytesRateUp = 0;
        this.bytesRateDown = 0;

        this.statID = setInterval(function() {

            that._peer.getStats(function(raw) {

                // Augumentation of stats entries with utility functions.
                // The augumented entry does what the stats entry does, but adds
                // utility functions.
                function AugumentedStatsResponse(response) {
                  this.response = response;
                  this.addressPairMap = [];
                }

                AugumentedStatsResponse.prototype.collectAddressPairs = function(componentId) {
                    if (!this.addressPairMap[componentId]) {
                        this.addressPairMap[componentId] = [];
                        for (var i = 0; i < this.response.result().length; ++i) {
                            var res = this.response.result()[i];
                            if (res.type ==='googCandidatePair' && res.stat('googChannelId') === componentId) {
                                this.addressPairMap[componentId].push(res);
                            }
                        }
                    }
                    return this.addressPairMap[componentId];
                };

                AugumentedStatsResponse.prototype.result = function() {
                    return this.response.result();
                };

                // The indexed getter isn't easy to prototype.
                AugumentedStatsResponse.prototype.get = function(key) {
                    return this.response[key];
                };

                var stats = new AugumentedStatsResponse(raw);

                var results = stats.result();
                var bytesNow = 0;
                var mic=0, speaker=0;

                for (var j = 0; j < results.length; ++j) {
                    var res = results[j];

                    console.log("TYPE", res.type, res);

                    // Bandwidth
                    var timestamp = res.timestamp.getTime() / 1000;
                    if (res.type === 'ssrc') {

                        if(res.stat('bytesReceived')) {
                            bytesNow = res.stat('bytesReceived');
                            
                            if (that.timestampPrevDown > 0 && that.timestampPrevDown < timestamp) {
                                that.bytesRateDown = Math.round((Math.abs(bytesNow - that.bytesPrevDown) / Math.abs(timestamp - that.timestampPrevDown)) / 1024 * 8);
                                console.log("DOWN", bytesNow, that.bytesPrevDown, timestamp, that.timestampPrevDown);
                            }
                            if(that.timestampPrevDown < timestamp) {
                                that.timestampPrevDown = timestamp;
                                that.bytesPrevDown = bytesNow;    
                            }
                            
                        }
                        else {
                            bytesNow = res.stat('bytesSent');
                            
                            if (that.timestampPrevUp > 0 && that.timestampPrevUp < timestamp) {
                                that.bytesRateUp = Math.round((Math.abs(bytesNow - that.bytesPrevUp) / Math.abs(timestamp - that.timestampPrevUp)) / 1024 * 8);
                                console.log("UP", bytesNow, that.bytesPrevUp, timestamp, that.timestampPrevUp);
                            }
                            if(that.timestampUp < timestamp) {
                                that.timestampPrevUp = timestamp;
                                that.bytesPrevUp = bytesNow;
                            }
                        }
                    }

                    // ActivityDetection
                    var obj = res.remote;
                    if (obj) {
                        var nspk = 0.0;
                        var nmic = 0.0;
                        
                        if (obj.stat('audioInputLevel')) {
                            nmic = obj.stat('audioInputLevel');
                        }
                        if (nmic > 0.0) {
                            mic = Math.floor(Math.max((Math.LOG2E * Math.log(nmic) - 4.0), 0.0));
                        }
                        if (obj.stat('audioOutputLevel')) {
                            nspk = obj.stat('audioOutputLevel');
                        }
                        if (nspk > 0.0) {
                            speaker = Math.floor(Math.max((Math.LOG2E * Math.log(nspk) - 4.0), 0.0));
                        }
                    }

                    /*
                        if (res.names) {
                            var names = res.names();
                            for (var i = 0; i < names.length; ++i) {
                                console.log("GET " + names[i] + " VALUE " + res.stat(names[i]));
                            }
                        }
                    */
                }

                var e = {
                    peerId: that._id,
                    bytesRateUp: that.bytesRateUp,
                    bytesRateDown: that.bytesRateDown,
                    micro: mic,
                    speaker: speaker
                };

                that._callbacks.trigger('onPeerConnectionStats', e);
                //console.log("GET STATS " + i, res);
                
            });

        }, 1000);
    },

    stopStats: function() {
        Sonotone.log("PEERCONNECTION", "Stop stat for PeerConnection <" + this._id + ">");
        clearInterval(this.statID);
    },

    muteSDP: function(sd) {
        Sonotone.log("PEERCONNECTION", "Mute PeerConnection <" + this._id + ">");

        // Split SDP into lines
        var sdpLines = sd.sdp.split('\r\n');
        var replaceVideo = false;
        var replaceAudio = false;
        var l = sdpLines.length;

        // Mute the audio stream        
        for(var i=0; i<l; i++) {
        
            if(sdpLines[i].search('m=video') !== -1) {
                replaceVideo = true;
                continue;
            }

            if(replaceVideo) {
                if(sdpLines[i].search('a=sendrecv') !== -1) {
                    sdpLines[i] = 'a=recvonly';
                    break;
                }
            }
        }

        // Mute the video stream
        for(var j=0; j<l; j++) {
        
            if(sdpLines[j].search('m=audio') !== -1) {
                replaceAudio = true;
                continue;
            }

            if(replaceAudio) {
                if(sdpLines[j].search('a=sendrecv') !== -1) {
                    sdpLines[j] = 'a=recvonly';
                    break;
                }
            }
        }

        // Reconstruct SDP
        sd.sdp = sdpLines.join('\r\n');
        return sd;

    },

    unmuteSDP: function(sd) {
        Sonotone.log("PEERCONNECTION", "Unmute PeerConnection <" + this._id + ">");

        // Split SDP into lines
        var sdpLines = sd.sdp.split('\r\n');
        var replaceVideo = false;
        var replaceAudio = false;
        var l = sdpLines.length;

        for(var i=0; i<l; i++) {
        
            if(sdpLines[i].search('m=video') !== -1) {
                replaceVideo = true;
                continue;
            }

            if(replaceVideo) {
                if(sdpLines[i].search('a=recvonly') !== -1) {
                    sdpLines[i] = 'a=sendrecv';
                    break;
                }
            }
        }

        for(var j=0; j<l; j++) {
        
            if(sdpLines[j].search('m=audio') !== -1) {
                replaceAudio = true;
                continue;
            }

            if(replaceAudio) {
                if(sdpLines[j].search('a=recvonly') !== -1) {
                    sdpLines[j] = 'a=sendrecv';
                    break;
                }
            }
        }

        // Reconstruct SDP
        sd.sdp = sdpLines.join('\r\n');
        return sd;
    },

    /**
     * Subscribe to datachannel events
     *
     * @api private
     */

    _subscribeToDataChannelEvents: function() {
        var that = this;

        this._dataChannel.on('onFileReceived', function(file) {
            that._callbacks.trigger('onFileReceived', file);
        }, this);
    },

};/**
 * Data Channel
 * Manage the Data Channel part of the Peer Connection
 * @param {String} id The ID to use
 * @param {Object} peer The parent peer where to add the Data Channel
 * @param {Object} caps The user capabilities 
 * @param {Object} channel The existing channel received (for answering to a channel)
 *
 * @namespace
 */

var DataChannel = Sonotone.IO.DataChannel = function(id, peer, caps, channel) {
    Sonotone.log("DATACHANNEL", "Initialize Data Channel for PeerConnection <" + id + ">");

    this._remotePeerID = id;

    this._isReady = false;

    this._callbacks = new Sonotone.IO.Events();

    this._channel = channel;

    this._file =[];

    this._fileInfo = null;

    this._remainingBlob = null;

    var that = this;

    if(caps.canUseDataChannel) {

        if(!this._channel) {
            Sonotone.log("DATACHANNEL", "Create a new Data Channel for PeerConnection <" + id + ">");
            this._channel = peer.createDataChannel(id, null);        
        }
        else {
            Sonotone.log("DATACHANNEL", "Reuse existing channel received for PeerConnection <" + id + ">");
        }
        // When data-channel is opened with remote peer
        this._channel.onopen = function(){
            Sonotone.log("DATACHANNEL", "Data-Channel successfully opened for PeerConnection <" + id + ">");
            that._isReady = true;
        };

        // On data-channel error
        this._channel.onerror = function(e){
            Sonotone.log("DATACHANNEL", "Data-Channel error for PeerConnection <" + id + ">", e);
            that._isReady = false;
        };

        // When data-channel is closed with remote peer
        this._channel.onclose = function(e){
            Sonotone.log("DATACHANNEL", "Data-Channel closed for PeerConnection <" + id + ">", e);
            that._isReady = false;
        };

        // On new message received
        this._channel.onmessage = function(e){

            Sonotone.log("DATACHANNEL", "Message received by PeerConnection <" + id + ">", e.data);

             var ack =  {
                type: "FILE_ACK"
            }; 

            if(e.data instanceof ArrayBuffer) {
                //Sonotone.log("DATACHANNEL", "Type ArrayBuffer", e.data, that._fileInfo.type);
                var blob = new Blob([e.data], {type: that._fileInfo.type});
                that._file.push(blob);

                //Sonotone.log("DATACHANNEL", "Send ACK");
                that._channel.send(JSON.stringify(ack));
            }
            else if (e.data instanceof Blob) {
                //Sonotone.log("DATACHANNEL", "Type Blob");
                that._file.push(e.data);

                //Sonotone.log("DATACHANNEL", "Send ACK");
                that._channel.send(JSON.stringify(ack));
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
                            case "FILE_ACK":
                                //Sonotone.log("DATACHANNEL", "Received ACK");
                                if(that._remainingBlob.size) {
                                    //Sonotone.log("DATACHANNEL", "Continue to send remaining file part");
                                    that._sendBlobFile(that._remainingBlob);
                                }
                                else {
                                    Sonotone.log("DATACHANNEL", "No more part to send");
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
            Sonotone.log("DATACHANNEL", "Try to send a message to the peer <" + this._remotePeerID + ">", data);
            this._channel.send(data);
        }
        else {
            Sonotone.log("DATACHANNEL", "Data Channel not ready for sending a message!");
        }
    },

    /**
     * Send data using this Channel
     * @param {Object} file The file to send
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
     * Unsubscribe to IO events
     * @param {String} eventName The event to unsubscribe
     * @param {Function} callbackFunction The registered callback
     *
     * @api public
     */    

    off: function(eventName, callbackFunction) {
        this._callbacks.off(eventName, callbackFunction);
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
     * Unsubscribe to an event
     * @param {String} name The event to subscribe
     * @param {Function} callbackFunction The function to call
     *
     * @api public
     */

    off: function(name, callback) {
        if(this._events) {
            var events = this._events[name];
            if(events) {

                var index = -1;

                for (var i = 0, l = events.length; i < l; i++) {
                    if(callback === events[i].callback) {
                        index = i;
                    }
                }

                if(index > -1) {
                    events.splice(index, 1);
                }
            }
        }
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