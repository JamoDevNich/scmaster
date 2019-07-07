<?php
namespace SCMaster;

class PlaylistController {
    /*
    data such as:
    - volume level
    - play or pause
    - theme
    - custom data field
    - playlist array:
        - song id
        - song hash (of filename)
        - song name
        - song artist
        - song duration
        - song path
     */

    protected $storage;
    protected $sendToAll;

    public function __construct($storage) {
        $this->storage = $storage;
        $this->sendToAll = false;
    }

    public function set(string $command) {
        $ifGetStorage = (preg_match('/^get/',$command) === 1);
        $ifTestStorage = (preg_match('/^test/',$command) === 1);

        if ($ifGetStorage) {
            $this->sendToAll = false;
        } elseif ($ifTestStorage) {
            $this->storage = [
                'test' => 'some data'
            ];
        }
    }

    public function get() : string {
        return json_encode($this->storage);
    }

    public function getStorage() : array {
        return $this->storage;
    }

    public function getSendToAll() : bool {
        return $this->sendToAll;
    }
}
