'use strict';

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



/**
 * diff
 * Returns the difference between two numbers
 * @link https://stackoverflow.com/a/3156794/2422168
 * @param  {Number} a
 * @param  {Number} b
 * @return {Number}
 */
function diff(a,b) {
    return Math.abs(a-b);
}



/**
 * transferDataBetweenVueInstances
 * Handles transmission of data between vue interfaces during set-up
 * @type {Object}
 */
var transferDataBetweenVueInstances = {
    tasksFollowingChannelSubmit: function() {
        webSocketManager.callback = transferDataBetweenVueInstances.tasksWhenServerResponds;
        vueChannelSelector.defaults();
        vueChannelSelector.activeLoader = true;
        socket.send(vueChannelSelector.channelIdInput);
        vueMainInterface.channel = vueChannelSelector.channelIdInput;
        vueMainInterface.isDoingPlayback = vueChannelSelector.audioPlaybackInput;
    },
    tasksWhenServerResponds: function() {
        webSocketManager.callback = uiAnimations.songInterfaceShow;
        socket.send('js pl');
    }
};



/**
 * uiAnimations
 * Static methods related to the UI animations
 * @type {Object}
 */
var uiAnimations = {
    start: function() {
        uiAnimations.animationStart();
        $(elAudioPlayer).hide();
        $(elChannelSelector).hide();
        $(elChannelSelector)
            .show()
            .addClass('sc-visible')
            .removeClass('sc-hidden');
        setTimeout(function(){
            uiAnimations.animationEnd();
        }, transitionDuration);
    },
    songInterfaceShow: function() {
        uiAnimations.animationStart();
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
            uiAnimations.animationEnd();
        }, transitionDuration);
    },
    animationStart: function() {
        $('body').css('overflow-x', 'hidden');
        $('body').css('overflow-y', 'hidden');
    },
    animationEnd: function() {
        $('body').css('overflow-y', 'auto');
    }
}



/**
 * webSocketManager
 * Static methods and variables related to administration and handling of the
 * websocket connection
 * @type {Object}
 */
var webSocketManager = {
    reconnectQueued: false,
    isConnected: false,
    fastStart: false,
    callback: null,
    tryReconnection: function() {
        console.log('WS connection failed - retrying in 5s.');
        if (!webSocketManager.reconnectQueued) {
            webSocketManager.reconnectQueued=true;
            setTimeout(function(){ webSocketManager.openConn(); webSocketManager.reconnectQueued=false; },5000);
        }
    },
    keepAwake: function() {
        /* ping send/response is implemented on server, this implementation requires work */
        setTimeout(function(){
            if (webSocketManager.isConnected) {
                socket.send('pi');
                webSocketManager.keepAwake();
            }
        }, 3000);
    },
    actionsSetup: function() {
        socket.onopen = function(e) {
            console.log('WS Connection established.');
            webSocketManager.isConnected = true;
            vueChannelSelector.connReady();
            vueMainInterface.connReady();
        };

        socket.onmessage = function(event) {
            console.log(`[message] Data received: ${event.data} <- server`);
            // check if track is different before overwriting data
            if (isJsonString(event.data)) {
                Object.assign(vueMainInterface.storage, JSON.parse(event.data));
                vueMainInterface.handleExternalChanges();
            }
            // execute a callback if necessary
            if (typeof webSocketManager.callback === 'function') {
                var func = webSocketManager.callback;
                webSocketManager.callback = null;
                func();
            }
        };

        socket.onclose = function() {
            socket.close();
            webSocketManager.isConnected = false;
            vueChannelSelector.connBusy();
            vueMainInterface.connBusy();
            webSocketManager.tryReconnection();
        };

        socket.onerror = function(error) {
            console.log(`[error] ${error.message}`);
            socket.onclose(); /* Chrome Compatibility */
        };
    },
    openConn: function() {
        console.log('WS Connecting...');
        socket = new WebSocket('ws://' + location.hostname + ':8081');
        webSocketManager.actionsSetup();
        webSocketManager.keepAwake();
    }
}



$(function(){
    // Setup onerror to output to a vue/formatic modal
    window.onerror = function(e) {
        errorModal.show(e);
    };
    // if a hash url is available it could be a channel - enter it into the channel input box
    if (window.location.hash) {
        vueChannelSelector.channelIdInput = window.location.hash.substring(1);
    }
    // set the timeout for opening the connection...
    setTimeout(function(){
        webSocketManager.openConn();
    }, transitionDuration);
    // ... just before triggering the first animation
    uiAnimations.start();
});
