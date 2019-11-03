<?php
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use SCMaster\SCServer;

// was __DIR__, to get parent dir name
require dirname(__FILE__) . '/vendor/autoload.php';

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new SCServer()
        )
    ),
    8081
);

$server->run();
