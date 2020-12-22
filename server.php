<?php
use Ratchet\App;
use SCMaster\SCWebsocketController;
use SCMaster\SCBarebonesHttpController;

require dirname(__FILE__) . '/vendor/autoload.php';

$app = new \Ratchet\App('localhost', 8080);
$app->route('/ws', new SCWebsocketController(), array('*'));

$scHttpController = new SCBarebonesHttpController();
$allowed_origins = array('*');
$app->route('/', $scHttpController, $allowed_origins);
$app->route('/data/{vfolder}/{vfile}', $scHttpController, $allowed_origins);
$app->route('/data/{vfolder}/{vfile}/{v1}', $scHttpController, $allowed_origins);
$app->route('/data/{vfolder}/{vfile}/{v1}/{v2}', $scHttpController, $allowed_origins);
$app->route('/data/{vfolder}/{vfile}/{v1}/{v2}/{v3}', $scHttpController, $allowed_origins);
$app->route('/data/{vfolder}/{vfile}/{v1}/{v2}/{v3}/{v4}', $scHttpController, $allowed_origins);
$app->route('/node_modules/{vmdl}/{vdst}/{vfile}', $scHttpController, $allowed_origins);
$app->route('/node_modules/{vmdl}/{vdst}/{v1}/{v2}/{v3}/{v4}/{v5}', $scHttpController, $allowed_origins);

$app->run();
