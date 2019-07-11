'use strict';

var elChannelSelector = '#view-channel-selector';
var elAudioPlayer = '#view-audio-player';
var transitionDuration = 2000; /* Corresponds with CSS file, change there also */
let socket = null;

var vueChannelSelector = new Vue({
    el: elChannelSelector,
    data: {
        activeMessage: false,
        activeLoader: false,
        activeForm: false,
        title: 'Let\'s get you set up',
        submit: 'Join Channel',
        loader: 'Optional Loader Text',
        errorTitle: 'Error Title',
        errorDescription: 'Error Description',
        channelIdTitle: 'Choose a Channel ID',
        channelIdDesc: 'Devices with the same Channel ID can communicate together.',
        channelIdLabel: 'Channel ID',
        channelIdInput: '',
        audioPlaybackTitle: 'Audio Playback',
        audioPlaybackDesc: 'Should this system play audio or control others playing audio?',
        audioPlaybackLabel: 'Play Audio',
        audioPlaybackInput: false,
    },
    methods: {
        inputSubmit: function(event) {
            if (this.channelIdInput.length < 1) {
                this.showError('Check the Channel ID', 'The Channel ID cannot be empty');
            } else if(!isInt(this.channelIdInput)) {
                this.showError('Check the Channel ID', 'The Channel ID can only contain numbers');
            } else if (this.channelIdInput.length != 8) {
                this.showError('Check the Channel ID', 'The Channel ID must be 8 digits long');
            } else {
                if (vueMainInterface.isConnected) {
                    uiController.submitUpdatedChannel();
                }
            }
        },
        showError: function(title, description) {
            this.activeMessage = true;
            this.errorTitle = title;
            this.errorDescription = description;
        },
        defaults() {
            this.activeForm = false;
            this.activeMessage = false;
            this.activeLoader = false;
        }
    }
});



var vueMainInterface = new Vue({
    el: elAudioPlayer,
    data: {
        isConnected: false,
        isDoingPlayback: vueChannelSelector.audioPlaybackInput,
        title: '',
        artist: '',
        storage: {
            timeline: 0,
            playlist: [],
            customdata: '',
            status: '',
            track: '',
            volume: 0,
            appearance: '',
            autoplay: false, /* autoplay next unlocked track */
            loop: false /* loop all tracks */
        }
    },
    methods: {
        trackSet: function(hash) { /* Some things are handled by Vue, not trackSet */
            var sp = {'track':hash};
            this.storage.track = hash;
            this.wsSend(sp);
            this.updateTrackDetails();
        },
        playPause: function() {
            var states = ['playing','paused'];
            if (this.storage.status == states[0]) {
                this.storage.status = states[1];
            } else {
                this.storage.status = states[0];
            }
            this.wsSend({status:this.storage.status});
        },
        volume: function(b) {
            this.storage.volume = parseInt(this.storage.volume);
            if (b && this.storage.volume < 100) {
                this.storage.volume+=2;
            } else if (!b && this.storage.volume > 0) {
                this.storage.volume-=2;
            }
            this.wsSend({volume:this.storage.volume});
        },
        toggleAutoplayTrack: function(hash) {
            var arrlen = this.storage.playlist.length;
            for (arrlen = arrlen-1; arrlen>-1; arrlen--) {
                if (this.storage.playlist[arrlen]['hash']==hash) {
                    this.storage.playlist[arrlen]['autoplay']^=true;
                    arrlen=0;
                    this.wsSend({playlist:this.storage.playlist});
                    this.$forceUpdate(); /* Vue does not detect the nested changes on the local system. This updates as normal everywhere else. */
                }
            }
        },
        getTrackDetails: function(hash) {
            var totalSongs = this.storage.playlist.length;
            var trackInfo = {};
            for (var currentSong = 0; totalSongs > currentSong; currentSong++) {
                if (this.storage.playlist[currentSong]['hash']==hash) {
                    trackInfo = JSON.parse(JSON.stringify(this.storage.playlist[currentSong]));
                    var nearbyTracks = {hashNext:null,hashPrev:null};
                    if (currentSong-1 >= 0) {
                        nearbyTracks.hashPrev = this.storage.playlist[currentSong-1].hash;
                    }
                    if (currentSong+1 < totalSongs) {
                        nearbyTracks.hashNext = this.storage.playlist[currentSong+1].hash;
                    }
                    Object.assign(trackInfo, nearbyTracks);
                }
            }
            return trackInfo;
        },
        updateTrackDetails: function() {
            var trackDt = this.getTrackDetails(this.storage.track);
            this.title = typeof trackDt.title!='undefined'?trackDt.title:'';
            this.artist = typeof trackDt.artist!='undefined'?trackDt.artist:'';
        },
        trackNext: function(b) {
            if (this.storage.track.length > 0) {
                var nearbyTracks = this.getTrackDetails(this.storage.track);

                if (b === true && nearbyTracks.hashNext === null && this.storage.loop == true) {
                    nearbyTracks = this.getTrackDetails(this.storage.playlist[0].hash);
                    while (nearbyTracks.autoplay == false && nearbyTracks.hashNext !== null) {
                        nearbyTracks = this.getTrackDetails(nearbyTracks.hashNext);
                    }
                    if (nearbyTracks.autoplay == true) {
                        this.trackSet(nearbyTracks.hash);
                    }
                }
                else if (b === true && nearbyTracks.hashNext !== null) {
                    nearbyTracks = this.getTrackDetails(nearbyTracks.hashNext);
                    while (nearbyTracks.autoplay == false && nearbyTracks.hashNext !== null) {
                        nearbyTracks = this.getTrackDetails(nearbyTracks.hashNext);
                    }
                    if (nearbyTracks.autoplay == true) {
                        this.trackSet(nearbyTracks.hash);
                    }
                } else if (b === false && nearbyTracks.hashPrev !== null) {
                    nearbyTracks = this.getTrackDetails(nearbyTracks.hashPrev);
                    while (nearbyTracks.autoplay == false && nearbyTracks.hashPrev !== null) {
                        nearbyTracks = this.getTrackDetails(nearbyTracks.hashPrev);
                    }
                    if (nearbyTracks.autoplay == true) {
                        this.trackSet(nearbyTracks.hash);
                    }
                }
            }
        },
        handleExternalChanges: function () {
            // Track name etc does not change when modified externally (no event listeners)
            this.updateTrackDetails();
        },
        toggleLoop: function() {
            this.storage.loop^=true;
            this.wsSend({loop:this.storage.loop});
        },
        toggleAutoplayList: function() {
            this.storage.autoplay^=true;
            this.wsSend({autoplay:this.storage.autoplay});
        },
        wsSend: function(sp) {
            if (vueMainInterface.isConnected) {
                console.log('WS Broadcasting');
                socket.send('js bc '+JSON.stringify(sp));
            } else {
                console.log('WS Unavailable');
            }
        }
    }
});



var uiController = {
    start: function(st) {
        vueChannelSelector.loader = '';             // remove text from the loader
        vueChannelSelector.activeLoader = true;     // show the loader
        if (typeof st !== 'undefined') {
            vueChannelSelector.channelIdInput = st;
            webSocketManager.fastStart = true;
        }
        $(elAudioPlayer).hide();
        $(elChannelSelector).hide();
        $(elChannelSelector)
            .show()
            .addClass('sc-visible')
            .removeClass('sc-hidden');
        setTimeout(function(){ uiController.connectToWebsocket() }, transitionDuration);
    },
    connectToWebsocket: function() {
        setTimeout(function() {
            if (!vueMainInterface.isConnected) {
                vueChannelSelector.loader = 'Just a little longer...';
            }
            setTimeout(function() {
                if (!vueMainInterface.isConnected && !vueMainInterface.activeMessage) {
                    vueChannelSelector.showError(
                        'Startup is taking too long',
                        'Something is causing application startup to take longer than it should. Try refreshing your browser, and ensure the server is running.'
                    );
                }
            }, 15000);
        }, 6000);
        webSocketManager.open();                    // open websocket connection
    },
    submitUpdatedChannel: function() {
        vueChannelSelector.defaults();
        vueChannelSelector.activeLoader = true;
        //vueChannelSelector.loader = 'Joining channel';
        webSocketManager.callback = uiController.prepareSongInterface;
        socket.send(vueChannelSelector.channelIdInput);
    },
    prepareSongInterface: function() {
        //vueChannelSelector.loader = 'Setting up';
        webSocketManager.callback = uiController.showSongInterface;
        socket.send('js pl');
    },
    showSongInterface: function() {
        //vueChannelSelector.loader = 'Preparing interface';
        $(elChannelSelector)
            .addClass('sc-invisible')
            .removeClass('sc-visible');
        $(elAudioPlayer)
            .show()
            .addClass('sc-visible')
            .removeClass('sc-hidden');
        setTimeout(function(){
            $(elChannelSelector)
                .hide()
                .addClass('sc-hidden')
                .addClass('sc-displaynone')
                .removeClass('sc-invisible');
        }, transitionDuration);
    }
}



var webSocketManager = {
    prevConnSuccess: false,
    fastStart: false,
    callback: null,
    tryReconnection: function() {
        setTimeout(function(){
            if (webSocketManager.prevConnSuccess && !vueMainInterface.isConnected) {
                console.log('WS connection unexpectedly lost. Reconnecting.');
                webSocketManager.open();
            }
        },5000);
    },
    actionsSetup: function() {
        socket.onopen = function(e) {
            webSocketManager.prevConnSuccess = true;
            vueMainInterface.isConnected = true;
            console.log('WS Connection established.');
            /*
             * How this is handled on the Channel Select screen
             */
            if (vueChannelSelector.activeLoader == true || vueChannelSelector.activeForm == true) {
                if (webSocketManager.fastStart) {
                    vueChannelSelector.inputSubmit();
                } else {
                    vueChannelSelector.defaults();
                    vueChannelSelector.activeForm = true;
                }
            } else
            /*
             * How this is handled when the audio interface is showing
             */
            if (vueChannelSelector.activeLoader !== true && vueChannelSelector.activeForm !== true && vueChannelSelector.channelIdInput !=='') {
                console.log('WS: Main interface was open, catching up...');
                socket.send('ch '+vueChannelSelector.channelIdInput);
                if (vueChannelSelector.audioPlaybackInput == true) {
                    // if we're a master then regain control of the system
                    console.log('WS: Uploading playlist to server');
                    socket.send('js bc '+JSON.stringify(vueMainInterface.storage));
                } else {
                    // otherwise just ask the others what's going on
                    console.log('WS: Downloading Playlist');
                    socket.send('js pl');
                }
            }
        };

        socket.onmessage = function(event) {
            console.log(`[message] Data received: ${event.data} <- server`);
            // check if track is different before overwriting data
            if (isJsonString(event.data)) {
                Object.assign(vueMainInterface.storage, JSON.parse(event.data));
                vueMainInterface.handleExternalChanges();
            }

            if (typeof webSocketManager.callback === 'function') {
                var func = webSocketManager.callback;
                webSocketManager.callback = null;
                func();
            }
        };

        socket.onclose = function() {
            socket.close();
            //socket = null;
            vueMainInterface.isConnected = false;
            webSocketManager.tryReconnection();
            /*
             * How the error is handled on the Channel Select screen
             */
            if (vueChannelSelector.activeLoader == true || vueChannelSelector.activeForm == true) {
                if (vueChannelSelector.activeForm != true) {
                    vueChannelSelector.defaults();
                }
                vueChannelSelector.showError(
                    'Can\'t connect to WebSocket',
                    (webSocketManager.prevConnSuccess ?
                        'We\'re trying to reconnect - please stand by...' :
                        'We can\'t establish a connection to the WebSocket server, please verify that it\'s up and running')
                );
            }
        };

        socket.onerror = function(error) {
            console.log(`[error] ${error.message}`);
            socket.onclose();
        };
    },
    open: function() {
        console.log('WS Connecting...');
        socket = new WebSocket('ws://' + location.hostname + ':8080');
        webSocketManager.actionsSetup();
    }
}



/**
 * isInt
 * Determines whether a string is equal to an integer
 * @link https://stackoverflow.com/a/14794066/2422168
 * @param  {String}  value
 * @return {Boolean}
 */
function isInt(value) {
  return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
}



/**
 * isJsonString
 * Determines whether a string is valid JSON
 * @link https://stackoverflow.com/a/3710226/2422168
 * @param  {String} str
 * @return {Boolean}
 */
function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}



/*
 * Initialiser
 */
$(function(){
    if (window.location.hash) {
        uiController.start(window.location.hash.substring(1));
    } else {
        uiController.start();
    }
}); // the loading animation is horrible without this for some reason
