<?php
/**
 * Cleanup ping: the browser calls this (sendBeacon) when images are
 * downloaded. Responds immediately; the sweep of files older than 30
 * minutes runs after the response so nobody waits for it.
 */
ini_set('display_errors', '0');
error_reporting(E_ALL);

if (!defined('BASE_PATH')) {
    define('BASE_PATH', __DIR__);
}
require_once BASE_PATH . '/src/security.php';

easyImageSendSecurityHeaders();
http_response_code(204);

easyImageScheduleCleanup(BASE_PATH);
