<?php
require_once __DIR__ . '/src/config/config.php';

// Initialize configuration
Config::init();

try {
    // Check if this is a ZIP download request
    if (isset($_GET['zip']) && $_GET['zip'] === '1') {
        // Create ZIP file
        $zip = new ZipArchive();
        $zipName = 'processed_images_' . date('Y-m-d_H-i-s') . '.zip';
        $zipPath = Config::RESIZED_DIR . $zipName;

        if ($zip->open($zipPath, ZipArchive::CREATE) !== TRUE) {
            throw new Exception('Could not create ZIP file');
        }

        // Get all processed images
        $files = glob(Config::RESIZED_DIR . '*');
        $addedFiles = false;

        foreach ($files as $file) {
            if (is_file($file) && !str_ends_with($file, '.zip')) {
                // Get original filename from the processed filename
                $originalName = substr(basename($file), strpos(basename($file), '_') + 1);
                if ($zip->addFile($file, $originalName)) {
                    $addedFiles = true;
                }
            }
        }

        if (!$addedFiles) {
            throw new Exception('No files to add to ZIP');
        }

        $zip->close();

        // Send ZIP file
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $zipName . '"');
        header('Content-Length: ' . filesize($zipPath));
        readfile($zipPath);

        // Clean up
        unlink($zipPath);
        
        // Clean up processed files
        foreach ($files as $file) {
            if (is_file($file) && !str_ends_with($file, '.zip')) {
                unlink($file);
            }
        }
        
        exit;
    }

    // Single file download
    if (!isset($_GET['file'])) {
        throw new Exception('No file specified');
    }

    $filename = basename($_GET['file']);
    $filepath = Config::RESIZED_DIR . $filename;

    if (!file_exists($filepath)) {
        throw new Exception('File not found');
    }

    // Get original filename from the processed filename
    $originalName = substr($filename, strpos($filename, '_') + 1);
    
    // Get file mime type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $filepath);
    finfo_close($finfo);
    
    // Set proper headers
    header('Content-Type: ' . $mimeType);
    header('Content-Disposition: attachment; filename="' . $originalName . '"');
    header('Content-Length: ' . filesize($filepath));
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Clear any previous output
    if (ob_get_level()) {
        ob_end_clean();
    }
    
    // Read file in chunks to handle large files
    $handle = fopen($filepath, 'rb');
    while (!feof($handle)) {
        echo fread($handle, 8192);
        flush();
    }
    fclose($handle);

    // Clean up
    unlink($filepath);

} catch (Exception $e) {
    http_response_code(400);
    echo 'Error: ' . $e->getMessage();
} 