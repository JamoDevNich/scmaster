# scmaster
Real time remote audio control client and server

Requires PHP 7.2.4 or greater server-side
Requires ES7 or greater client-side

SCMaster allows you to control one central audio source from multiple other devices on the same network. State is synchronized across all devices in real time, and upon disconnect/reconnect.

## Screenshots
![Channel Selection Screen](https://i.imgur.com/kWc07dC.png)

![Track List Screen](https://i.imgur.com/uzuuDzu.png)

## Getting Started
In the releases there is a pre-packaged version available including all external libraries required to get up and running immediately.

After downloading, place your media files into the `data/audio/` folder. Only MP3s are supported at this time. Ensure media files are present before starting up the server or web interface, as they are not automatically refreshed at present.

In the base folder, run `php shellServer.php` to start the Websocket server.

Run `php -S 0.0.0.0:80` to serve the web client interface using PHP's development server.

## Features
### Flexibility
Any device can disconnect/reconnect at will without affecting other connected devices.

### Reliability
In-built caching ensures playback continues on the source device even if the backend goes down.*
__Caching has not yet been enabled in code*__

### Predictability
Restrict certain tracks from autoplaying by 'locking' them. These tracks can still be loaded and played manually.

## Issues :bug::bug:
- Disabling autoplay (when loop tracks is enabled) on one device, will not restore the previous loop state when enabling autoplay on a different device
- Mobile browsers may not be able to seek tracks, Vue does not appear to pick up mobile range input events
- Multiple 'playback' systems are **not** recommended, but it does work, provided the tracks are buffered first, seeked to the same location and then played.
