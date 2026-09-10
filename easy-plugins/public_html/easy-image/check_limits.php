<?php
/**
 * Upload limits for the Easy Image front-end.
 *
 * The uploader needs the real PHP limits so it can warn about a too-large
 * file BEFORE sending it, and split batches to fit post_max_size. Without
 * this endpoint the UI silently falls back to PHP's 2M/8M defaults and
 * rejects files the server would actually accept.
 *
 * Deliberately limited to the three upload-related values, so it exposes
 * nothing beyond what any upload attempt would already reveal.
 */
require_once __DIR__ . '/src/security.php';
easyImageSendSecurityHeaders();

$response = [
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'memory_limit' => ini_get('memory_limit'),
    'upload_max_filesize_bytes' => easyImageParseIniSize(ini_get('upload_max_filesize')),
    'post_max_size_bytes' => easyImageParseIniSize(ini_get('post_max_size')),
    'memory_limit_bytes' => easyImageParseIniSize(ini_get('memory_limit')),
];

easyImageSendJson($response);
