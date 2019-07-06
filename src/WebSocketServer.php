<?php
namespace SCMaster;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class WebSocketServer implements MessageComponentInterface {
    protected $connectedClients;


    public function __construct() {
        $this->connectedClients = new \SplObjectStorage;
        echo('ShellServer Started' . "\n");
    }


    public function onOpen(ConnectionInterface $conn) {
        $this->connectedClients->attach($conn);
        $conn->channel = '';
        echo("Connected: {$conn->resourceId}\n");
        $conn->send('What channel do you want to join?' . "\n");
    }


    public function onMessage(ConnectionInterface $sender, $msg) {
        if ($sender->channel === '') {
            $sender->channel = iconv("UTF-8", "ASCII", preg_replace('/\n$/', '', $msg));
            $sender->send('Channel set to: ' . $sender->channel . "\n");
        } else {
            $numRecv = count($this->connectedClients) - 1;
            echo(
                sprintf(
                    'From %d: Size %d, to channel %s (%d total connection%s)',
                    $sender->resourceId,
                    strlen($msg),
                    $sender->channel,
                    $numRecv,
                    $numRecv == 1 ? '' : 's'
                ) . "\n"
            );

            foreach ($this->connectedClients as $client) {
                if ($sender !== $client && $sender->channel === $client->channel) {
                    $client->send($msg);
                }
            }
        }
    }


    public function onClose(ConnectionInterface $conn) {
        $this->connectedClients->detach($conn);
        echo("Disconnected: {$conn->resourceId}\n");
    }


    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo("Something went wrong: {$e->getMessage()}\n");
        $conn->close();
    }
}
