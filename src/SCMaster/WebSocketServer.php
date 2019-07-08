<?php
namespace SCMaster;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use SCMaster\PlaylistController;


/**
 * WebSocketServer
 * Handles real-time data transport between main interface and backend.
 * @author Nicholas E
 * @link https://nich.dev
 */
class WebSocketServer implements MessageComponentInterface {
    protected $connectedClients;
    protected $liveStorage;


    public function __construct() {
        $this->connectedClients = new \SplObjectStorage;
        $this->liveStorage = [];
        $ifSupported = (version_compare(phpversion(),'7.2.4') > -1 ? true : false);

        echo('SCMaster WebSocket Server Started. Copyright 2019 Nicholas E. Powered by Ratchet and various other technologies.' . "\n");

        if (!$ifSupported) {
            /* The PlaylistController component returns an object type. This is not supported in older versions */
            echo('Your PHP version ' . phpversion() . ' is not supported. Please upgrade to 7.2.4 or higher.');
        }
    }


    /**
     * onOpen
     * Called when a client connects.
     * @param  ConnectionInterface $conn
     * @return null
     */
    public function onOpen(ConnectionInterface $conn) {
        $this->connectedClients->attach($conn);
        $conn->channel = '';
        echo("Client {$conn->resourceId} has joined. Current Online: " . count($this->connectedClients) . "\n");
    }


    /**
     * onMessage
     * Called when a client sends a message.
     * @param  ConnectionInterface $sender
     * @param  string              $msg
     * @return null
     */
    public function onMessage(ConnectionInterface $sender, $msg) {
        $ifMinimumCmdLength = (strlen($msg) > 1);
        $ifChannelChange = ($sender->channel === '' || ($ifMinimumCmdLength && substr($msg, 0, 2) === 'ch'));
        $ifJsonDataRecieved = ($ifMinimumCmdLength && substr($msg, 0, 2) === 'js');

        if ($ifChannelChange) {
            $this->doChannelChange($sender, $msg);
        } elseif ($ifJsonDataRecieved) {
            $this->doCommandProcessing($sender, $msg);
        } else {
            $this->doMessageBroadcast($sender, $msg);
        }
    }


    /**
     * doMessageBroadcast
     * Called when a message needs to be broadcast to every client on a
     * particular channel.
     * @param  ConnectionInterface $sender
     * @param  string              $msg
     * @return null
     */
    private function doMessageBroadcast(ConnectionInterface $sender, $msg) {
        echo("Client {$sender->resourceId} sending message on channel {$sender->channel}\n");

        foreach ($this->connectedClients as $client) {
            if ($sender !== $client && $sender->channel === $client->channel) {
                $client->send($msg);
            }
        }
    }


    /**
     * onClose
     * Called when a client disconnects
     * @param  ConnectionInterface $conn
     * @return null
     */
    public function onClose(ConnectionInterface $conn) {
        $this->connectedClients->detach($conn);
        echo(
            "Client {$conn->resourceId} " .
            ($conn->channel!=='' ? "on channel {$conn->channel} " : '') .
            "has disconnected. Current Online: " .
            count($this->connectedClients) . "\n"
        );
    }


    /**
     * onError
     * @param  ConnectionInterface $conn
     * @param  Exception           $e
     * @return null
     */
    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo("Something went wrong: {$e->getMessage()}\n");
        $conn->close();
    }


    /**
     * doChannelChange
     * Called when a client chooses to or is required to change their channel.
     * @param  ConnectionInterface $sender
     * @param  string              $msg
     * @return null
     */
    private function doChannelChange(ConnectionInterface $sender, $msg) {
        $channelsFound = [];
        preg_match('/([0-9]{8})/', $msg, $channelsFound);

        if (count($channelsFound) > 0) {
            $sender->channel = $channelsFound[0];
            $sender->send("Channel set to: {$sender->channel}\n");
            echo("Client {$sender->resourceId} is on channel {$sender->channel}\n");
        } else {
            $sender->send("Provide a channel: numerical and 8 characters long\n");
        }
    }


    /**
     * doCommandProcessing
     * Called when a client sends a command to be handled by the command processor.
     * @param  ConnectionInterface $sender
     * @param  string              $msg
     * @return null
     */
    private function doCommandProcessing(ConnectionInterface $sender, $msg) {
        if (!isset($this->liveStorage[$sender->channel])) {
            $this->liveStorage[$sender->channel] = [];
        }

        $commandHandler = new PlaylistController($this->liveStorage[$sender->channel]);
        $msg = preg_replace('/^js[\ ]*/', '', $msg);
        $commandHandler->set($msg);
        $response = $commandHandler->get();
        $this->liveStorage[$sender->channel] = $commandHandler->getStorage();

        if ($commandHandler->getSendToAll()) {
            $this->doMessageBroadcast($sender, $response . "\n");
        } else {
            $sender->send($response . "\n");
        }
    }
}
