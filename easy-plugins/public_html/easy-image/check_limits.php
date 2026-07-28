<?php
require_once __DIR__ . '/src/security.php';
easyImageSendSecurityHeaders();

function parseLimitSize($size) {
    return easyImageParseIniSize($size);
}

$response = [
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'memory_limit' => ini_get('memory_limit'),
    'upload_max_filesize_bytes' => parseLimitSize(ini_get('upload_max_filesize')),
    'post_max_size_bytes' => parseLimitSize(ini_get('post_max_size')),
    'memory_limit_bytes' => parseLimitSize(ini_get('memory_limit')),
];

easyImageSendJson($response);
