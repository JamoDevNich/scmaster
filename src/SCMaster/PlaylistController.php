<?php
namespace SCMaster;
use Zedwood\MP3File;

/**
 * PlaylistController
 * Manages playlist data storage and information relaying in real-time
 * @author Nicholas E
 * @link https://nich.dev
 */
class PlaylistController {
    protected $mediaFilesLocation;
    protected $storage;
    protected $sendPlaylist;
    protected $sendToAll;


    public function __construct(array $storage) {
        $this->storage = $storage;
        $this->sendPlaylist = false;
        $this->sendToAll = false;
        $this->mediaFilesLocation = __DIR__ . '/../../data/audio';

        if (count($this->storage) < 4) {
            $this->doCreateStorage()->doScanAddTracks();
        }
    }

    /**
     * set
     * Handles incoming commands.
     * @param string $command
     */
    public function set(string $command) {
        $ifBroadcastAll = (preg_match('/^bc| bc/',$command) === 1);
        $commandJson = $this->getJsonData($command);
        $ifPlaylistRequired = (isset($commandJson->playlist) || (preg_match('/^pl| pl/',$command) === 1));

        if ($ifBroadcastAll) {
            $this->sendToAll = true;
        }

        if ($ifPlaylistRequired) {
            $this->sendPlaylist = true;
        }

        foreach ($commandJson as $key => $value) {
            if ($key!=='role') {
                $this->storage[$key] = $value;
            }
        }

        return $this;
    }


    /**
     * get
     * Returns outgoing json encoded data to the callee.
     * @return string
     */
    public function get() : string {
        $outgoingData = $this->storage;

        /*
            To save data, it may not always be necessary to send the playlist.
            A client can ask the server to send the playlist to clients, using
            the 'bc pl' (BroadCast PlayList) command, or just modify the
            playlist which will trigger sending it to all clients.
        */
        if (!$this->sendPlaylist) {
            unset($outgoingData['playlist']);
        }

        return json_encode($outgoingData);
    }


    /**
     * getStorage
     * Returns internal storage array to callee.
     * @return array
     */
    public function getStorage() : array {
        return $this->storage;
    }


    /**
     * getSendToAll
     * Informs callee whether the retrieved data should be sent to all clients
     * @return bool
     */
    public function getSendToAll() : bool {
        return $this->sendToAll;
    }


    /**
     * getJsonData
     * Separate the JSON data recieved with incoming commands, decoding it into
     * an object and return it to the caller.
     * @param  string $command
     * @return object
     */
    private function getJsonData($command) : object {
        $outputJson = (object) [];
        $commandArr = explode('{', $command, 2);
        $ifDataGiven = (count($commandArr) === 2);

        if ($ifDataGiven) {
            $tmp = json_decode('{' . $commandArr[1]);
            $outputJson = (gettype($tmp)==='object' ? $tmp : (object) []);
        }

        return $outputJson;
    }


    /**
     * doCreateStorage
     * Create an array which will store application data. NOTE: volume and
     * timeline progress are forwarded to all clients by the UI.
     * @return object
     */
    private function doCreateStorage() {
        $this->storage = [
            'role' => 'server',
            'track' => '',
            'status' => 'paused',
            'volume' => '40',
            'appearance' => 'default',
            'customdata' => '',
            'playlist' => [],
            'timeline' => [
                'duration' => 0,
                'progress' => 0
            ]
        ];

        return $this;
    }


    /**
     * doScanAddTracks
     * Scan and add all tracks available in designated folder.
     * @return object
     */
    private function doScanAddTracks() {
        $mediaFiles = scandir($this->mediaFilesLocation);

        foreach ($mediaFiles as $file) {
            if (strpos($file, '.mp3') !== false) {
                $fileNameNoExt = explode('.', $file)[0];
                $fileNameArr = explode(' - ', $fileNameNoExt);
                $fileTitle = (count($fileNameArr) > 0 ? $fileNameArr[0] : $fileNameNoExt); // $fil... fallback unnecessary
                $fileArtist = (count($fileNameArr) > 1 ? $fileNameArr[1] : '');
                $fileDuration = (new MP3File($this->mediaFilesLocation . '/' . $file))->getDurationEstimate();

                $this->storage['playlist'][] = [
                    'hash' => bin2hex(random_bytes(5)),
                    'title' => $fileTitle,
                    'artist' => $fileArtist,
                    'duration' => $fileDuration,
                    'filename' => $file,
                    'autoplay' => true
                ];
            }
        }

        return $this;
    }
}
