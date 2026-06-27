<?php
/**
 * Smoke test for Easy PDF Preflight analyze API.
 *
 * Usage: php tests/run.php
 */

$baseDir = dirname(__DIR__);
$fixture = $baseDir . '/tests/fixtures/sample.pdf';

if (!file_exists($fixture)) {
    fwrite(STDERR, "FAIL: Fixture not found at {$fixture}\n");
    exit(1);
}

if (!file_exists($baseDir . '/vendor/autoload.php')) {
    fwrite(STDERR, "FAIL: vendor/autoload.php missing. Run: composer install\n");
    exit(1);
}

require_once $baseDir . '/vendor/autoload.php';

// Bootstrap analyze.php functions without HTTP layer
$_SERVER['REQUEST_METHOD'] = 'POST';
$_FILES = [
    'pdf' => [
        'name' => 'sample.pdf',
        'type' => 'application/pdf',
        'tmp_name' => $fixture,
        'error' => UPLOAD_ERR_OK,
        'size' => filesize($fixture)
    ]
];

ob_start();
include $baseDir . '/api/analyze.php';
$output = ob_get_clean();

$data = json_decode($output, true);
if (!$data) {
    fwrite(STDERR, "FAIL: Invalid JSON response\n{$output}\n");
    exit(1);
}

if (empty($data['success'])) {
    fwrite(STDERR, "FAIL: " . ($data['error'] ?? 'Unknown error') . "\n");
    exit(1);
}

$analysis = $data['data'] ?? [];
$errors = [];

if (($analysis['numPages'] ?? 0) < 1) {
    $errors[] = 'Expected at least 1 page';
}

if (!is_array($analysis['fonts'] ?? null)) {
    $errors[] = 'fonts must be an array';
}

if (!is_array($analysis['images'] ?? null)) {
    $errors[] = 'images must be an array';
}

if (!is_array($analysis['metadata'] ?? null)) {
    $errors[] = 'metadata must be an array';
}

if (!empty($errors)) {
    fwrite(STDERR, "FAIL:\n- " . implode("\n- ", $errors) . "\n");
    fwrite(STDERR, "Response: {$output}\n");
    exit(1);
}

echo "PASS: analyze API returned valid structure\n";
echo "  pages: " . ($analysis['numPages'] ?? 0) . "\n";
echo "  fonts: " . count($analysis['fonts']) . "\n";
echo "  images: " . count($analysis['images']) . "\n";
exit(0);
