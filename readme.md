# scmaster
Real time remote audio control client and server

SCMaster allows you to control one central audio playback device from multiple other devices on the same network. State is synchronized across all devices in real time.  

Requires PHP 7.2.4 or greater server-side  
Requires a browser supporting ES7 or greater  
Node+NPM is optional when using the pre-packaged version, but is required for the dev version.

## Screenshots
![Channel Selection Screen](https://i.imgur.com/kWc07dC.png)

![Track List Screen](https://i.imgur.com/uzuuDzu.png)

## Getting Started
### Pre-packaged version
In the releases there is a pre-packaged version available including all external libraries required to get up and running immediately.

1. Extract the zip file
2. Place your media files into the `data/audio/` folder (only MP3s are supported at the moment).
3. Run `php shellServer.php` to start the Websocket server.
4. Run `php -S 0.0.0.0:80` to serve the web client interface using PHP's development server.
5. Pop open a web browser, and navigate to the IP of the server running the web client interface.

### Docker
A docker image is available [here](https://hub.docker.com/repository/docker/jamodevnich/scmaster).
To start a container, run:
```
docker run -it --name scmaster -m 256m -p 0.0.0.0:8080:8080 -p 0.0.0.0:8081:8081 -d jamodevnich/scmaster:latest
```
If a directory containing media files is available, it can be mounted with `-v /path/to/media/file/dir:/var/www/scmaster/data/audio:ro`.  

A complete command may look like the following:
```
docker run -it \
    --name scmaster \
    -m 256m \
    -p 0.0.0.0:8080:8080 \
    -p 0.0.0.0:8081:8081 \
    -v /path/to/media/file/dir:/var/www/scmaster/data/audio:ro\
    -d jamodevnich/scmaster:latest
```

### Dev version
1. Pull the repository
2. Run `composer upgrade`
    - If composer is not installed, follow the [instructions here](https://getcomposer.org/doc/00-intro.md).
3. Run `npm update --no-optional --ignore-scripts`
    - If npm is not installed, follow the [instructions here](https://www.npmjs.com/get-npm)
4. Place your media files into the `data/audio/` folder (only MP3s are supported at the moment).
5. You're now ready to start up the app!
    - Run `npm run start-win` if you're on a Windows system.
    - Run `npm run start-nix` if you're on a \*nix system.

## Features
### Flexibility
Any device can disconnect/reconnect at will without affecting other connected devices.

### Reliability
In-built caching ensures audio continues uninterrupted on the playback device even if the backend goes down.*

__Caching has not yet been enabled in code*__

### Predictability
Restrict certain tracks from autoplaying by 'locking' them. These tracks can still be loaded and played manually.


## Issues :bug::bug:
- Multiple 'playback' systems are **not** recommended, but it does work, provided the tracks are buffered first, seeked to the same location and then played.
- Disabling autoplay (when loop tracks is enabled) on one device, will not restore the previous loop state when enabling autoplay on a different device
- Mobile browsers may not be able to seek tracks, Vue does not appear to pick up mobile range input events
- *Pull requests of fixes/improvements are welcome, feel free to open an issue for assistance*
