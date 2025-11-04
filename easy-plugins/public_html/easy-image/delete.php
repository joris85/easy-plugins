<?php
require_once __DIR__ . '/src/config/config.php';

// Initialize configuration
Config::init();

header('Content-Type: application/json');

try {
    // Get the POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['url']) || !isset($data['filename'])) {
        throw new Exception('Missing required parameters');
    }

    // Extract the filename from the URL
    $filename = basename($data['url']);
    
    // Define the path to the file
    $filepath = 'uploads/resize/' . $filename;
    
    // Check if file exists
    if (!file_exists($filepath)) {
        throw new Exception('File not found');
    }
    
    // Try to delete the file
    if (!unlink($filepath)) {
        throw new Exception('Failed to delete file');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'File deleted successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} 