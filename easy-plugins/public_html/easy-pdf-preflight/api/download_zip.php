<?php
// Easy PDF Preflight - ZIP Download API
// Creates and serves a ZIP file containing all extracted images

// Start session to validate ownership
session_start();

// Security: Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: text/plain');
    echo 'Method not allowed';
    exit;
}

$sessionId = session_id();

// Define base directory for extracted images
$baseDir = __DIR__ . '/../extracted_images';
$sessionDir = $baseDir . '/' . $sessionId;

// Check if session directory exists
if (!is_dir($sessionDir)) {
    http_response_code(404);
    header('Content-Type: text/plain');
    echo 'No extracted images found for this session';
    exit;
}

// Get all image files in session directory
$imageFiles = glob($sessionDir . '/img_' . $sessionId . '_*.*');
if (empty($imageFiles)) {
    http_response_code(404);
    header('Content-Type: text/plain');
    echo 'No extracted images found';
    exit;
}

// Check if ZipArchive is available
if (!class_exists('ZipArchive')) {
    http_response_code(500);
    header('Content-Type: text/plain');
    echo 'ZIP functionality is not available on this server. Please contact the administrator.';
    exit;
}

// Create temporary ZIP file
$zipFileName = 'pdf-images-' . $sessionId . '-' . time() . '.zip';
$zipFilePath = sys_get_temp_dir() . '/' . $zipFileName;

$zip = new ZipArchive();
if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
    http_response_code(500);
    header('Content-Type: text/plain');
    echo 'Failed to create ZIP file';
    exit;
}

// Add each image file to the ZIP
$addedCount = 0;
foreach ($imageFiles as $imageFile) {
    if (is_file($imageFile)) {
        $fileName = basename($imageFile);
        // Extract image info from filename (img_sessionId_index.extension)
        if (preg_match('/^img_' . preg_quote($sessionId, '/') . '_(\d+)\.(.+)$/', $fileName, $matches)) {
            $imageIndex = $matches[1];
            $extension = $matches[2];
            // Create a more readable filename in the ZIP
            $zipFileName = 'image-' . ($imageIndex + 1) . '.' . $extension;
        } else {
            $zipFileName = $fileName;
        }
        
        if ($zip->addFile($imageFile, $zipFileName)) {
            $addedCount++;
        }
    }
}

$zip->close();

if ($addedCount === 0) {
    @unlink($zipFilePath);
    http_response_code(500);
    header('Content-Type: text/plain');
    echo 'No images could be added to ZIP file';
    exit;
}

// Get file info
$fileSize = filesize($zipFilePath);
$downloadFileName = 'pdf-images.zip';

// Set headers for download
header('Content-Type: application/zip');
header('Content-Length: ' . $fileSize);
header('Content-Disposition: attachment; filename="' . $downloadFileName . '"');
header('Cache-Control: no-cache, must-revalidate');
header('Expires: 0');

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Output file
if (readfile($zipFilePath) === false) {
    http_response_code(500);
    header('Content-Type: text/plain');
    echo 'Error reading ZIP file';
    exit;
}

// Clean up temporary ZIP file
@unlink($zipFilePath);



