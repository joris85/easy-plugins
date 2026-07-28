<?php
require_once __DIR__ . '/src/security.php';
easyImageSendSecurityHeaders();

$metricsFile = __DIR__ . '/data/metrics.json';

if (!file_exists($metricsFile)) {
    $metrics = [
        'totalImages' => 0,
        'totalBytesProcessed' => 0,
        'totalBytesSaved' => 0,
        'lastUpdated' => null
    ];
} else {
    $metrics = json_decode(file_get_contents($metricsFile), true);
    if (!is_array($metrics)) {
        $metrics = [
            'totalImages' => 0,
            'totalBytesProcessed' => 0,
            'totalBytesSaved' => 0,
            'lastUpdated' => null
        ];
    } else {
        $metrics = array_merge([
            'totalImages' => 0,
            'totalBytesProcessed' => 0,
            'totalBytesSaved' => 0,
            'lastUpdated' => null
        ], $metrics);
    }
}

easyImageSendJson([
    'totalImages' => (int)$metrics['totalImages'],
    'totalBytesProcessed' => (int)$metrics['totalBytesProcessed'],
    'totalBytesSaved' => (int)$metrics['totalBytesSaved'],
    'lastUpdated' => $metrics['lastUpdated']
], 200, JSON_PRETTY_PRINT);
