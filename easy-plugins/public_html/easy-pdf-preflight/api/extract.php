<?php
// Easy PDF Preflight - Image Extraction API
// Serves extracted images with proper security checks

// Start session to validate ownership
session_start();

// Security: Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: text/plain');
    echo 'Method not allowed';
    exit;
}

// Check if image ID is provided
if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    header('Content-Type: text/plain');
    echo 'Image ID is required';
    exit;
}

$imageId = $_GET['id'];
$sessionId = session_id();

// Validate image ID format (should be: img_sessionId_index)
if (!preg_match('/^img_([a-zA-Z0-9]+)_(\d+)$/', $imageId, $matches)) {
    http_response_code(400);
    header('Content-Type: text/plain');
    echo 'Invalid image ID format';
    exit;
}

// Extract session ID from image ID
$imageSessionId = $matches[1];
if ($imageSessionId !== $sessionId) {
    http_response_code(403);
    header('Content-Type: text/plain');
    echo 'Access denied: Image does not belong to your session';
    exit;
}

// Define base directory for extracted images
$baseDir = __DIR__ . '/../extracted_images';
$sessionDir = $baseDir . '/' . $sessionId;

// Check if session directory exists
if (!is_dir($sessionDir)) {
    http_response_code(404);
    header('Content-Type: text/plain');
    echo 'Image not found: Session directory does not exist';
    exit;
}

// Find the image file
$imageFiles = glob($sessionDir . '/' . $imageId . '.*');
if (empty($imageFiles) || !file_exists($imageFiles[0])) {
    http_response_code(404);
    header('Content-Type: text/plain');
    echo 'Image not found';
    exit;
}

$imagePath = $imageFiles[0];
$fileExtension = strtolower(pathinfo($imagePath, PATHINFO_EXTENSION));

// Validate file extension
$allowedExtensions = ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'jp2', 'ppm', 'pbm'];
if (!in_array($fileExtension, $allowedExtensions)) {
    http_response_code(400);
    header('Content-Type: text/plain');
    echo 'Invalid file type';
    exit;
}

// Determine MIME type
$mimeTypes = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'tiff' => 'image/tiff',
    'tif' => 'image/tiff',
    'jp2' => 'image/jp2',
    'ppm' => 'image/x-portable-pixmap',
    'pbm' => 'image/x-portable-bitmap'
];

$mimeType = $mimeTypes[$fileExtension] ?? 'application/octet-stream';

// Get file info
$fileSize = filesize($imagePath);
$fileName = basename($imagePath);

// Set headers for download
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . $fileSize);
header('Content-Disposition: attachment; filename="' . $fileName . '"');
header('Cache-Control: no-cache, must-revalidate');
header('Expires: 0');

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Output file
if (readfile($imagePath) === false) {
    http_response_code(500);
    header('Content-Type: text/plain');
    echo 'Error reading image file';
    exit;
}

// Note: We don't delete the file here - cleanup is handled by cleanupOldSessions()
// This allows users to download the same image multiple times during their session

