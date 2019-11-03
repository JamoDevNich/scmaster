'use strict';

let strGettingStartedDocumentationLink = 'https://github.com/JamoDevNich/scmaster#getting-started';
let elChannelSelector = '#view-channel-selector';
let elAudioPlayer = '#view-audio-player';
let transitionDuration = 2000; /* Corresponds with CSS file, change there also */
let audioplayer = null;
let socket = null;
let sound = null;
