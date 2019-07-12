# Todo List
- JQuery and Semantic to be installed via npm instead
- tidy JS*(partially done)
- Optimise code for Next/Prev song checking
- Proper detection for master computer units
- Tidy and sort failed connection code**(partially done)
- When the end of the songlist is reached, if the last song is locked the fast forward cannot go back to the first song. change to a for loop.

## Issues
- ~~Track play buttons on main interface need better way to communicate song Id back to Vue~~ (resolved - by not handling the song)
- Soft Unrecoverable: User presented with channel input screen, user starts entering channel id. Server disconnects and reconnects during that time. User is presented with unrec error screen. (2/10 severity)

## Dropped, but considerations for future developments
- possibly unify both Vue instances to a single instance
