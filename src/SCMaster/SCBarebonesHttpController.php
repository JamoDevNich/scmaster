<?php
namespace SCMaster;
use GuzzleHttp\Psr7\Message;
use GuzzleHttp\Psr7\Response;
use Ratchet\ConnectionInterface;
use Ratchet\Http\HttpServerInterface;
use Psr\Http\Message\RequestInterface;


/**
 * SCBarebonesHttpController
 * A rudimentary handler for HTTP requests.
 * @author Nicholas E
 * @link https://nich.dev
 */
class SCBarebonesHttpController implements HttpServerInterface {
    protected $instanceId;


    public function __construct() {
        echo('SCMaster HTTP Server (Rudimentary) Started. Copyright 2020 Nicholas E. Powered by Ratchet and various other technologies.' . "\n");
    }

    /**
     * onOpen
     * Responds to incoming HTTP requests with the requested file, if found.
     * @param  ConnectionInterface $conn
     * @param  RequestInterface    $request
     * @return null
     */
    public function onOpen(ConnectionInterface $conn, RequestInterface $request = null){
        $filepath = urldecode(($request->getUri())->getPath());  // https://www.php-fig.org/psr/psr-7/#35-psrhttpmessageuriinterface
        $filepath_relative = '.' . $filepath;
        $response = NULL;

        echo(__CLASS__ . ': Processing path ' . $filepath . "\n");

        if ($filepath === '/') {
            $application_path = 'data/html/application.html';

            $response = new Response(
                200,
                array(
                    'Content-Type' => 'text/html',
                    'Content-Length' => filesize($application_path)
                ),
                file_get_contents($application_path)
            );
        }

        elseif (is_file($filepath_relative) === TRUE) {
            $response = new Response(
                200,
                array('Content-Length' => filesize($filepath_relative)),
                file_get_contents($filepath_relative)
            );
        }

        else {
            $response = new Response(
                404,
                array(
                    'Content-Type' => 'text/plain'
                ),
                'File not found'
            );
        }

        $conn->send(Message::toString($response));  // https://docs.guzzlephp.org/en/stable/psr7.html
        $conn->close();
    }


    /**
     * onMessage
     * Not implemented, presence required to implement interface.
     * @param  ConnectionInterface $from
     * @param  [mixed]             $msg
     * @return null
     */
    public function onMessage(ConnectionInterface $from, $msg){
        throw new \BadMethodCallException('Method ' . __FUNCTION__ . ' in ' . __CLASS__ . ' is not implemented');
    }


    /**
     * onClose
     * Called when a connection is closed
     * @param  ConnectionInterface $conn
     * @return null
     */
    public function onClose(ConnectionInterface $conn){}


    /**
     * onError
     * Called when an exception is caught
     * @param  ConnectionInterface $conn
     * @param  Exception           $e
     * @return null
     */
    public function onError(ConnectionInterface $conn, \Exception $e){
        echo('Exception caught in ' . __CLASS__ . ': ' . $e->getMessage());
    }
}
