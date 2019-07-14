'use strict';


/**
 * vueChannelSelector
 * The controller for the Channel Selector form
 * @type {Vue}
 */
let vueChannelSelector = new Vue({
    el: elChannelSelector,
    data: {
        isConnected: false,                     // Current connection status
        isConnectedPreviously: false,           // If we were previously connected (used to prevent unrecoverable errors)
        activeMessage: false,                   // When set TRUE, the message box will display
        activeLoader: true,                     // When set TRUE, loading icon will display
        activeForm: false,                      // When set TRUE, the channel selection form will show
        title: 'Let\'s get you set up',
        submit: 'Join Channel',
        loader: '',                             // Text shown under the loading icon
        errorTitle: 'Error Title',
        errorDescription: 'Error Description',
        channelIdTitle: 'Choose a Channel ID',
        channelIdDesc: 'Devices with the same Channel ID can communicate together.',
        channelIdLabel: 'Channel ID',
        channelIdInput: '',                     // The text entered into the Channel ID
        audioPlaybackTitle: 'Audio Playback',
        audioPlaybackDesc: 'Should this system play audio or control others playing audio?',
        audioPlaybackLabel: 'Play Audio',
        audioPlaybackInput: false,              // The status of the Audio Playback toggle switch
    },
    methods: {
        /**
         * inputSubmit
         * Called when the form input has been submitted
         * @param  {Object} event
         * @return {void}
         */
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
        /**
         * showError
         * Resets the view and displays an error message
         * @param  {String} title       [description]
         * @param  {String} description [description]
         * @param  {Boolean} showform    [description]
         * @return {void}             [description]
         */
        showError: function(title, description, showform) {
            this.defaults();
            this.activeForm = showform;
            this.activeMessage = true;
            this.errorTitle = title;
            this.errorDescription = description;
        },
        /**
         * loaderMessage
         * Displays a message underneath the animated loading icon
         * @param  {String} message [description]
         * @return {void}         [description]
         */
        loaderMessage: function(message) {
            this.activeLoader = true;
            this.loader = message;
        },
        /**
         * defaults
         * Resets the current display state, only showing the logo above and tagline underneath.
         * @return {void} [description]
         */
        defaults: function() {
            this.activeForm = false;
            this.activeMessage = false;
            this.activeLoader = false;
        },
        /**
         * connReady
         * Called when the connection is active
         * @return {void} [description]
         */
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
        /**
         * connBusy
         * Called when the connection has been lost
         * @return {void} [description]
         */
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



/**
 * vueMainInterface
 * The controller for the main interface
 * @type {Vue}
 */
let vueMainInterface = new Vue({
    el: elAudioPlayer,
    data: {
        wsCommAbbr: 'vueMainInterface-WS: ',    // Displayed beside Websocket console logs for debug
        currentHowlerTrackId: 0,                // The track ID of the current song playing within HowlerJS
        currentHowlerTrack: '',                 // The track hash of the currernt song playing within HowlerJS
        currentHowlerSeekRunning: false,        // The state of the setInterval function monitoring the seek bar
        playlistCacheName: 'songs',             // The name of the cache which songs are loaded in to
        playlistCacheValidator: '',             // A unique string used to determine whether the cache needs to be cleared
        isConnected: false,                     // The status of the Websocket connection
        isDoingPlayback: false,                 // Determines whether this system is supposed to playback music
        channel: '',                            /* this is only used to verify the interface is ready */
        title: '',                              // The title of the currently playing song
        artist: '',                             // The artist of the currently playing song
        storage: {
            timeline: {
                duration: 0,
                progress: 0
            },
            playlist: [],
            customdata: '',                     // Custom data, not actually used but reactive.
            status: '',
            track: '',
            volume: 0,
            appearance: '',                     // Not used, but is reactive
            autoplay: false, /* autoplay next unlocked track */
            loop: false /* loop all tracks */
        },
        modal: {                                // Attributes associated with the 'help popup' modals
            el: '#playback',
            icon: 'info circle',
            header: 'Modal Header',
            content: 'Modal Content'
        },
        state: {                                // Very verbose variables defining local state
            loopListWasEnabledBeforeDisablingAutoplay: false
        }
    },
    methods: {
        /**
         * modalShow
         * Displays a help modal
         * @param  {String} icon    [description]
         * @param  {String} header  [description]
         * @param  {String} content [description]
         * @return {void}         [description]
         */
        modalShow: function(icon, header, content) {
            this.modal.icon = icon;
            this.modal.header = header;
            this.modal.content = content;
            $(this.modal.el).modal('show');
        },
        /**
         * modalHide
         * Called by the 'close' button on the modal to hide it
         * @return {[type]} [description]
         */
        modalHide: function() {
            $(this.modal.el).modal('hide');
        },
        /**
         * trackSet
         * Handles the non-reactive functions associated with track changes
         * @param  {String} hash The hash of the track to change to
         * @return {void}      [description]
         */
        trackSet: function(hash) { /* Some things are handled by Vue, not trackSet */
            let sp = {'track':hash};
            this.storage.track = hash;
            this.wsSend(sp);
            this.updateTrackDetails();
            this.updateAudioPlayer();
        },
        /**
         * playPause
         * Called to play or pause a track
         * @return {void} [description]
         */
        playPause: function() {
            if (this.storage.track!='') {
                var states = ['playing','paused'];
                if (this.storage.status == states[0]) {
                    this.storage.status = states[1];
                } else {
                    this.storage.status = states[0];
                }
                this.updateAudioPlayer();
                this.wsSend({status:this.storage.status});
            }
        },
        /**
         * volume
         * Increment or decrement the volume by a predefined amount
         * @param  {Boolean} b TRUE to increase volume, FALSE to decrease volume
         * @return {void}   [description]
         */
        volume: function(b) {
            let volumeIncr = 4;
            this.storage.volume = parseInt(this.storage.volume);
            if (b && this.storage.volume < 100) {
                this.storage.volume+=volumeIncr;
            } else if (!b && this.storage.volume > 0) {
                this.storage.volume-=volumeIncr;
            }
            this.updateAudioPlayer();
            this.wsSend({volume:this.storage.volume});
        },
        /**
         * toggleAutoplayTrack
         * Toggles autoplay for a specific track on the playlist. If a individual
         * tracks' autoplay is OFF, it will be skipped during global autoplay.
         * @param  {String} hash The hash of the track to toggle
         * @return {void}      [description]
         */
        toggleAutoplayTrack: function(hash) {
            let arrlen = this.storage.playlist.length;
            for (arrlen = arrlen-1; arrlen>-1; arrlen--) {
                if (this.storage.playlist[arrlen]['hash']==hash) {
                    this.storage.playlist[arrlen]['autoplay']^=true;
                    arrlen=0;
                    this.wsSend({playlist:this.storage.playlist});
                    this.$forceUpdate(); /* Vue does not detect the nested changes on the local system. This updates as normal everywhere else. */
                }
            }
        },
        /**
         * getTrackDetails
         * Looks up a track using the hash given, returns an object containing attributes
         * of that track and IDs of nearby tracks to assist with fast forward and rewind
         * @param  {String} hash The hash of the track to look up
         * @return {void}      [description]
         */
        getTrackDetails: function(hash) {
            var totalSongs = this.storage.playlist.length;
            var trackInfo = {};
            for (let currentSong = 0; totalSongs > currentSong; currentSong++) {
                if (this.storage.playlist[currentSong]['hash']==hash) {
                    trackInfo = JSON.parse(JSON.stringify(this.storage.playlist[currentSong]));
                    var nearbyTracks = {id:currentSong,idNext:null,idPrev:null};
                    if (currentSong-1 >= 0) {
                        nearbyTracks.idPrev = currentSong-1;
                    }
                    if (currentSong+1 < totalSongs) {
                        nearbyTracks.idNext = currentSong+1;
                    }
                    Object.assign(trackInfo, nearbyTracks);
                }
            }
            return trackInfo;
        },
        /**
         * updateTrackDetails
         * Looks up the hash of the currently playing track to retrieve artist and title
         * @return {void} [description]
         */
        updateTrackDetails: function() {
            var trackDt = this.getTrackDetails(this.storage.track);
            this.title = typeof trackDt.title!='undefined'?trackDt.title:'';
            this.artist = typeof trackDt.artist!='undefined'?trackDt.artist:'';
        },
        /**
         * trackNextCallback
         * Called by HowlerJS when a track has completed playing. This determines whether
         * to proceed to the next song, or halt entirely
         * @return {void} [description]
         */
        trackNextCallback: function() {
            if (this.storage.autoplay == true) {
                this.trackNext(true);
            } else {
                sound.seek(0, this.currentHowlerTrackId);
                this.playPause();
            }
        },
        /**
         * trackNext
         * Looks for the next song or previous song in the list which is playable. Tracks with
         * autoplay disabled are automatically skipped. This function also loops the playlist
         * automatically if LOOP is enabled, and detects whether all the songs in the playlist
         * are locked.
         * @param  {Boolean} goForwards [description]
         * @return {void}            [description]
         */
        trackNext: function(goForwards) {
            if (this.storage.track.length > 0) {
                let trackInfo = this.getTrackDetails(this.storage.track);
                let currentSong = trackInfo.id;     // The current song ID being processed in the loop
                let playableSongFound = false;      // TRUE when a playable song is found
                let playlistLooped = false;         // TRUE when the end of the playlist is reached
                while (!playableSongFound) {
                    if (playlistLooped == true &&
                        ((goForwards == true && trackInfo.idNext==null) ||
                        (goForwards == false && trackInfo.idPrev==null))) {
                        // If we've gone through the playlist already and not found a suitable song
                        playableSongFound = true;
                        this.modalShow(
                            'info circle',
                            'All tracks are locked',
                            'It looks like all the tracks are locked - you\'ll need to manually select the track you\'d like to play.'
                        );
                    } else {
                        // If we can still look for a song
                        if (goForwards===true) {
                            if (trackInfo.idNext !== null) {
                                currentSong ++;
                            } else {
                                if (this.storage.loop == true) {
                                    currentSong = 0;
                                }
                                playlistLooped = true;
                            }
                        } else {
                            if (trackInfo.idPrev !== null) {
                                currentSong --;
                            } else {
                                if (this.storage.loop == true) {
                                    currentSong = this.storage.playlist.length-1;
                                }
                                playlistLooped = true;
                            }
                        }
                        let currentSongInPlaylist = this.storage.playlist[currentSong];
                        if (currentSongInPlaylist.autoplay == true) {
                            // autoplay is actually a number, we imply it's true here
                            playableSongFound = true;
                            if (currentSongInPlaylist.hash == this.storage.track) {
                                // Reached the same song
                                console.log('End of playlist reached');
                            } else {
                                // Song found is not the same as the one already loaded
                                this.trackSet(currentSongInPlaylist.hash);
                            }
                        } else {
                            // get the track details of the current song we're at so it can be checked in the next loop
                            trackInfo = this.getTrackDetails(currentSongInPlaylist.hash);
                        }
                    }
                }
            }
        },
        /**
         * handleExternalChanges
         * This function is called by the websocket connection on reciept of a message,
         * and also when the main interface is first loaded. This should call other
         * functions which are not reactive/do not have event listeners.
         * @return {void} [description]
         */
        handleExternalChanges: function() {
            //this.refreshPlaylistCache();
            this.updateTrackDetails();
            this.updateAudioPlayer();
            this.updateSeekBar();
        },
        /**
         * updateAudioPlayer
         * Handles updating of the audio player when a track is changed, paused or played.
         * Seeking is handled by a separate function, updateSeekBar.
         * NOTE: Caching is currently not being used - it is broken, so songs are downloaded
         * fresh every time they are needed unfortunately.
         * @return {void} [description]
         */
        updateAudioPlayer: function() {
            if (this.isDoingPlayback) {
                console.log('This is a Master system. Updating...');
                if (this.storage.track != '') {
                    let trackInfo = this.getTrackDetails(this.storage.track);
                    let howlPlaying = this.storage.status=='playing'?true:false;
                    let howlVolume = this.storage.volume/100;
                    if (this.currentHowlerTrack == this.storage.track) {
                        console.log('...existing track');
                        sound.volume(howlVolume);
                        if (howlPlaying) {
                            sound.play(this.currentHowlerTrackId);
                        } else {
                            sound.pause(this.currentHowlerTrackId);
                        }
                        // seek...
                    } else {
                        console.log('...new track');
                        if (this.currentHowlerTrack.length > 0) {
                            console.log('Unloading existing track');
                            sound.unload();
                        }
                        this.currentHowlerTrack = this.storage.track;
                        this.storage.timeline.progress = 0;
                        let self = this;
                        let audioFile = 'data/audio/'+trackInfo.filename;
                        sound = new Howl({
                            src: [audioFile],
                            volume: howlVolume,
                            autoplay: false,
                            preload: true
                        });
                        sound.on('end', function(){ self.trackNextCallback(); });
                        this.currentHowlerTrackId = sound.play();
                        if (!howlPlaying) {
                            sound.stop(this.currentHowlerTrackId);
                        }
                        // open the cache to load a new song... NOT WORKING
                        /*caches.open(this.playlistCacheName).then(function(cache){
                            let audioFile = 'data/audio/'+trackInfo.filename;
                            // check if the song exists in the cache
                            cache.match(audioFile).then(function(a){
                                if (typeof a !== 'undefined') {
                                    console.log(a.arrayBuffer());// convert stream to base64.
                                }
                                sound = new Howl({
                                    src: [audioFile],
                                    volume: howlVolume,
                                    autoplay: howlPlaying,
                                    preload: true
                                });
                                sound.on('end', function(){ self.trackNextCallback(); });
                            });
                        });*/
                    }
                } else {
                    console.log('...nothing? no track loaded');
                }
            }
        },
        /**
         * updateSeekBar
         * Firing every 500ms sending the current seek bar location to the server. Also seeks
         * to the selected location when controlled from another device.
         * @return {void} [description]
         */
        updateSeekBar: function() {
            if (!this.currentHowlerSeekRunning) {
                this.currentHowlerSeekRunning = true;
                let self = this;
                setInterval(function(){
                    if (self.isDoingPlayback && self.storage.status == 'playing') {
                        if (self.currentHowlerTrack.length > 0) {
                            //console.log('update seek...');
                            let tlSrc = (isNaN(sound.seek()) ? 0 : Math.round(sound.seek()));
                            // if there is a major difference between the progress bar and the seek then seek to new location
                            //console.log(tlSrc + ' // ' + self.storage.timeline.progress);
                            if (diff(tlSrc, self.storage.timeline.progress) > 3) {
                                sound.seek(self.storage.timeline.progress, self.currentHowlerTrackId);
                            } else {
                                self.storage.timeline.progress = tlSrc;
                            }
                            let tlDur = self.storage.timeline.duration = self.getTrackDetails(self.currentHowlerTrack).duration;
                            self.wsSendThrough({timeline:{ duration: tlDur, progress: tlSrc }}, 'js si ');
                            self.wsSendThrough({timeline:{ duration: tlDur, progress: tlSrc }}, '');
                        }
                    }
                }, 500);
            }
        },
        /**
         * seekBarClick
         * Seeks to the location selected (if the track is playing locally) and sends
         * the location of the seekbar to the server.
         * @return {void} [description]
         */
        seekBarClick: function() {
            //console.log('Seekbar Clicked - to: ' + this.storage.timeline.progress);
            if (sound !== null) {
                sound.seek(this.storage.timeline.progress, this.currentHowlerTrackId);
            }
            this.wsSend({timeline:{ duration: this.storage.timeline.duration, progress: this.storage.timeline.progress }});
        },
        /**
         * toggleLoop
         * Enables and disables the loop functionality. Shows a modal if global autoplay
         * is not enabled
         * @return {void} [description]
         */
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
        /**
         * toggleAutoplayList
         * Enables and disables global autoplay. Disables looping if that is enabled when
         * this feature is being disabled.
         * @return {void} [description]
         */
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
            this.wsSend({autoplay:this.storage.autoplay,loop:this.storage.loop});
        },
        /**
         * clickConnectivityIcon
         * Shows a modal when the connectivity icon is clicked
         * @return {void} [description]
         */
        clickConnectivityIcon: function() {
            this.modalShow(
                'plug',
                'Connectivity Status',
                'This icon shows solid when you are connected to the server, and faded out when trying to reconnect.'
            );
        },
        /**
         * clickPlaybackIcon
         * Shows a modal when the local audio playback icon is clicked
         * @return {void} [description]
         */
        clickPlaybackIcon: function() {
            this.modalShow(
                'bullhorn',
                'Playback Status',
                'This icon shows solid when this system is set to play audio, and faded out when this system is a controller.'
            );
        },
        /**
         * refreshPlaylistCache
         * Determines whether the playlist cache requires refreshing.
         * NOTE: NOT IN USE
         * @return {void} [description]
         */
        refreshPlaylistCache: function() {
            if (this.isDoingPlayback) {
                let playlistHashConcat = '';
                let playlistUrls = [];

                this.storage.playlist.forEach(function(item, index) {
                    playlistHashConcat += item.hash;
                    playlistUrls.push('data/audio/' + item.filename);
                });

                if (this.playlistCacheValidator === playlistHashConcat) {
                    console.log('Not tampering with cache');
                } else {
                    console.log('Purging cache...');
                    caches.delete(this.playlistCacheName);
                    console.log('Adding URLs to cache...');
                    caches.open(this.playlistCacheName).then(function(cache){
                        cache.addAll(playlistUrls);
                    });
                    this.playlistCacheValidator = playlistHashConcat;
                }
            }
        },
        /**
         * wsSend
         * Broadcasts to every device on the same Websocket channel
         * @param  {Object} msgJson JSON object to broadcast
         * @return {void}         [description]
         */
        wsSend: function(msgJson) {
            this.wsSendThrough(msgJson, 'js bc ');
        },
        /**
         * wsSendThrough
         * Issues bespoke commands to the Websocket channel
         * @param  {Object} msgJson JSON object to broadcast
         * @param  {String} param   Command to issue with the data
         * @return {void}         [description]
         */
        wsSendThrough: function(msgJson, param){
            if (this.isConnected) {
                let msgStr = JSON.stringify(msgJson);
                //console.log(this.wsCommAbbr+msgStr);
                socket.send(param+msgStr);
            } else {
                console.log(this.wsCommAbbr+'Connection Unavailable');
            }
        },
        /**
         * connReady
         * Called when the Websocket connection has been established
         * @return {void} [description]
         */
        connReady: function() {
            this.isConnected = true;
            if (this.channel!='') {
                // set the channel on reconnect
                socket.send('ch ' + this.channel);
                if (this.isDoingPlayback == true) {
                    // if we're a master then tell others what's new since disconnect
                    console.log(this.wsCommAbbr+'Uploading playlist to server');
                    socket.send('js bc '+JSON.stringify(this.storage));
                } else {
                    // otherwise just ask the others what's going on
                    console.log(this.wsCommAbbr+'Downloading Playlist');
                    socket.send('js pl');
                }
            }
        },
        /**
         * connBusy
         * Called when the Websocket connection has been lost
         * @return {[type]} [description]
         */
        connBusy: function() {
            this.isConnected = false;
        }
    }
});



/**
 * errorModal
 * The controller for the exception error popover modal
 * @type {Vue}
 */
let errorModal = new Vue({
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
