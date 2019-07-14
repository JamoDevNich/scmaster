'use strict';


let vueChannelSelector = new Vue({
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



let vueMainInterface = new Vue({
    el: elAudioPlayer,
    data: {
        wsCommAbbr: 'vueMainInterface-WS: ',
        currentHowlerTrack: '',
        currentHowlerSeekRunning: false,
        playlistCacheName: 'songs',
        playlistCacheValidator: '',
        isConnected: false,
        isDoingPlayback: false,
        channel: '', /* this is only used to verify the interface is ready */
        title: '',
        artist: '',
        storage: {
            timeline: {
                duration: 0,
                progress: 0
            },
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
            let sp = {'track':hash};
            this.storage.track = hash;
            this.wsSend(sp);
            this.updateTrackDetails();
            this.updateAudioPlayer();
        },
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
        updateTrackDetails: function() {
            var trackDt = this.getTrackDetails(this.storage.track);
            this.title = typeof trackDt.title!='undefined'?trackDt.title:'';
            this.artist = typeof trackDt.artist!='undefined'?trackDt.artist:'';
        },
        trackNextCallback: function() {
            if (this.storage.autoplay == true) {
                this.trackNext(true);
            } else {
                sound.seek(0);
                this.playPause();
            }
        },
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
        handleExternalChanges: function() {
            // Track name etc does not change when modified externally (no event listeners)
            // This is called when the playlist has loaded from the server on initialisation
            //this.refreshPlaylistCache();
            this.updateTrackDetails();
            this.updateAudioPlayer();
            this.updateSeekBar();
        },
        updateAudioPlayer: function() {
            // The current howler implementation on this app does not utilise its caching mechanism
            // So, the song is downloaded essentially every time it is needed for playback.
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
                            sound.play();
                        } else {
                            sound.pause();
                        }
                        // seek...
                    } else {
                        console.log('...new track');
                        if (this.currentHowlerTrack.length > 0) {
                            console.log('Unloading existing track');
                            sound.unload();
                        }
                        this.currentHowlerTrack = this.storage.track;
                        let self = this;
                        let audioFile = 'data/audio/'+trackInfo.filename;
                        sound = new Howl({
                            src: [audioFile],
                            volume: howlVolume,
                            autoplay: howlPlaying,
                            preload: true
                        });
                        sound.on('end', function(){ self.trackNextCallback(); });
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
        updateSeekBar: function() {
            if (!this.currentHowlerSeekRunning) {
                this.currentHowlerSeekRunning = true;
                let self = this;
                setInterval(function(){
                    if (self.isDoingPlayback && self.storage.status == 'playing') {
                        if (self.currentHowlerTrack.length > 0) {
                            console.log('update seek...');
                            let tlPrg = self.storage.timeline.progress = (isNaN(sound.seek()) ? 0 : Math.round(sound.seek()));
                            let tlDur = self.storage.timeline.duration = self.getTrackDetails(self.currentHowlerTrack).duration;
                            self.wsSend({timeline:{ duration: tlDur, progress: tlPrg }});
                        }
                    }
                }, 500);
            }
        },
        seekBarClick: function() {
            console.log('Seekbar Clicked - to: ' + this.storage.timeline.progress);
            if (sound !== null) {
                sound.seek(this.storage.timeline.progress);
            } else {
                this.wsSend({timeline:{ duration: this.storage.timeline.duration, progress: this.storage.timeline.progress }});
            }
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
            this.wsSend({autoplay:this.storage.autoplay,loop:this.storage.loop});
        },
        clickConnectivityIcon: function() {
            this.modalShow(
                'plug',
                'Connectivity Status',
                'This icon shows solid when you are connected to the server, and faded out when trying to reconnect.'
            );
        },
        clickPlaybackIcon: function() {
            this.modalShow(
                'bullhorn',
                'Playback Status',
                'This icon shows solid when this system is set to play audio, and faded out when this system is a controller.'
            );
        },
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
        wsSend: function(msgJson) {
            this.wsSendThrough(msgJson, 'js bc ');
        },
        wsSendThrough: function(msgJson, param){
            if (this.isConnected) {
                let msgStr = JSON.stringify(msgJson);
                //console.log(this.wsCommAbbr+msgStr);
                socket.send(param+msgStr);
            } else {
                console.log(this.wsCommAbbr+'Connection Unavailable');
            }
        },
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
        connBusy: function() {
            this.isConnected = false;
        }
    }
});



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
