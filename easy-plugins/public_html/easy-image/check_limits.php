<?php
// Check PHP limits that affect large image uploads
header('Content-Type: application/json');

$limits = [
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'memory_limit' => ini_get('memory_limit'),
    'max_execution_time' => ini_get('max_execution_time'),
    'max_input_time' => ini_get('max_input_time'),
    'max_file_uploads' => ini_get('max_file_uploads'),
    'file_uploads' => ini_get('file_uploads') ? 'enabled' : 'disabled',
    'max_input_vars' => ini_get('max_input_vars'),
    'variables_order' => ini_get('variables_order'),
    'request_order' => ini_get('request_order')
];

// Convert to bytes for comparison
function parseSize($size) {
    $unit = preg_replace('/[^bkmgtpezy]/i', '', $size);
    $size = preg_replace('/[^0-9\.]/', '', $size);
    if ($unit) {
        return round($size * pow(1024, stripos('bkmgtpezy', $unit[0])));
    } else {
        return round($size);
    }
}

$limits['upload_max_filesize_bytes'] = parseSize($limits['upload_max_filesize']);
$limits['post_max_size_bytes'] = parseSize($limits['post_max_size']);
$limits['memory_limit_bytes'] = parseSize($limits['memory_limit']);

// Check current request info
$limits['current_request'] = [
    'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'NOT SET',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'NOT SET',
    'request_method' => $_SERVER['REQUEST_METHOD']
];

// Recommendations
$recommendations = [];
if ($limits['upload_max_filesize_bytes'] < 50 * 1024 * 1024) { // 50MB
    $recommendations[] = "upload_max_filesize should be at least 50M for large images";
}
if ($limits['post_max_size_bytes'] < 100 * 1024 * 1024) { // 100MB
    $recommendations[] = "post_max_size should be at least 100M for multiple large images";
}
if ($limits['memory_limit_bytes'] < 256 * 1024 * 1024) { // 256MB
    $recommendations[] = "memory_limit should be at least 256M for image processing";
}
if ($limits['max_execution_time'] < 300) { // 5 minutes
    $recommendations[] = "max_execution_time should be at least 300 seconds for large image processing";
}

$limits['recommendations'] = $recommendations;

echo json_encode($limits, JSON_PRETTY_PRINT);
?>


