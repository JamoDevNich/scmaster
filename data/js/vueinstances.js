'use strict';


var vueChannelSelector = new Vue({
    el: elChannelSelector,
    data: {
        isConnected: false,
        isConnectedPreviously: false,
        activeMessage: false,
        activeLoader: true,
        activeForm: false,
        title: 'Let\'s get you set up',
        submit: 'Join Channel',
        loader: '',
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
                this.showError('Check the Channel ID', 'The Channel ID cannot be empty', true);
            } else if(!isInt(this.channelIdInput)) {
                this.showError('Check the Channel ID', 'The Channel ID can only contain numbers', true);
            } else if (this.channelIdInput.length != 8) {
                this.showError('Check the Channel ID', 'The Channel ID must be 8 digits long', true);
            } else {
                if (this.isConnected) {
                    transferDataBetweenVueInstances.tasksFollowingChannelSubmit(); // Change to event to remove external dependency
                }
            }
        },
        showError: function(title, description, showform) {
            this.defaults();
            this.activeForm = showform;
            this.activeMessage = true;
            this.errorTitle = title;
            this.errorDescription = description;
        },
        loaderMessage: function(message) {
            this.activeLoader = true;
            this.loader = message;
        },
        defaults: function() {
            this.activeForm = false;
            this.activeMessage = false;
            this.activeLoader = false;
        },
        connReady: function() {
            this.isConnected = true;
            if (this.channelIdInput!=='') {
                if (!this.isConnectedPreviously) {
                    this.inputSubmit();
                } else {
                    /* Known bug: will crash if connection lost&reestablished while channel id is occupied on form. severity: 2/10 */
                    this.showError(
                        'Unrecoverable Error',
                        'Something has gone horribly wrong - this shouldn\'t happen again. Please reload the webpage to continue.',
                        false
                    );
                }
            } else {
                this.defaults();
                this.activeForm = true;
            }
            this.isConnectedPreviously = true;
        },
        connBusy: function() {
            this.isConnected = false;
            this.showError(
                'Can\'t connect to WebSocket',
                'We can\'t establish a connection to the WebSocket server. Trying to connect...',
                this.activeForm
            );
        }
    }
});



var vueMainInterface = new Vue({
    el: elAudioPlayer,
    data: {
        isConnected: false,
        isDoingPlayback: false,
        channel: '', /* this is only used to verify the interface is ready */
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
        },
        modal: {
            el: '#playback',
            icon: 'info circle',
            header: 'Modal Header',
            content: 'Modal Content'
        },
        state: {
            loopListWasEnabledBeforeDisablingAutoplay: false
        }
    },
    methods: {
        modalShow: function(icon, header, content) {
            this.modal.icon = icon;
            this.modal.header = header;
            this.modal.content = content;
            $(this.modal.el).modal('show');
        },
        modalHide: function() {
            $(this.modal.el).modal('hide');
        },
        trackSet: function(hash) { /* Some things are handled by Vue, not trackSet */
            var sp = {'track':hash};
            this.storage.track = hash;
            this.wsSend(sp);
            this.updateTrackDetails();
        },
        playPause: function() {
            if (this.storage.track!='') {
                var states = ['playing','paused'];
                if (this.storage.status == states[0]) {
                    this.storage.status = states[1];
                } else {
                    this.storage.status = states[0];
                }
                this.wsSend({status:this.storage.status});
            }
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
            if (!this.storage.autoplay) {
                this.modalShow(
                    'info circle',
                    'Loop Track List',
                    'This functionality only works with Autoplay enabled - please enable that first by tapping the >> icon.'
                );
            } else {
                this.storage.loop^=true;
                this.wsSend({loop:this.storage.loop});
            }
        },
        toggleAutoplayList: function() {
            this.storage.autoplay^=true;
            if (this.storage.autoplay && this.state.loopListWasEnabledBeforeDisablingAutoplay) {
                this.state.loopListWasEnabledBeforeDisablingAutoplay = false;
                this.storage.loop = true;
            }
            if (!this.storage.autoplay && this.storage.loop) {
                this.state.loopListWasEnabledBeforeDisablingAutoplay = true;
                this.storage.loop = false;
            }
            this.wsSend({autoplay:this.storage.autoplay});
        },
        clickConnectivityIcon: function() {
            this.modalShow(
                'plug',
                'Connectivity Status',
                'This icon shows blue when you are connected to the server, and red when trying to reconnect.'
            );
        },
        clickPlaybackIcon: function() {
            this.modalShow(
                'bullhorn',
                'Playback Status',
                'This icon shows blue when this system is set to play audio, and red when this system is a controller.'
            );
        },
        wsSend: function(sp) {
            if (this.isConnected) {
                console.log('WS Broadcasting');
                socket.send('js bc '+JSON.stringify(sp));
            } else {
                console.log('WS Unavailable');
            }
        },
        connReady: function() {
            this.isConnected = true;
            if (this.channel!='') {
                // set the channel on reconnect
                socket.send('ch ' + this.channel);
                if (this.isDoingPlayback == true) {
                    // if we're a master then tell others what's new since disconnect
                    console.log('WS: Uploading playlist to server');
                    socket.send('js bc '+JSON.stringify(this.storage));
                } else {
                    // otherwise just ask the others what's going on
                    console.log('WS: Downloading Playlist');
                    socket.send('js pl');
                }
            }
        },
        connBusy: function() {
            this.isConnected = false;
        }
    }
});



var errorModal = new Vue({
    el: '#error',
    data: {
        icon: 'wrench',
        title: 'Attention needed',
        desc: 'Something caused the system to crash. If any error info was available, it will be shown below.',
        error: '',
    },
    methods: {
        show: function(e) {
            this.error = e;
            $(this.$el).modal('show');
        },
        hide: function() {
            $(this.$el).modal('hide');
        }
    }
});
