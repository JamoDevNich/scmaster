<?php
use Ratchet\Server\IoServer;
use SCMaster\WebSocketServer;

// was __DIR__, to get parent dir name
require dirname(__FILE__) . '/vendor/autoload.php';

$server = IoServer::factory(
    new WebSocketServer(),
    8080
);

$server->run();
