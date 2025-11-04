<?php
// Prevent any output before JSON response
ob_start();

// Enable error reporting but don't display errors
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Define base path (only if not already defined)
if (!defined('BASE_PATH')) {
    define('BASE_PATH', __DIR__);
}

// Include initialization
require_once BASE_PATH . '/init.php';

// Set error handler
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("PHP Error [$errno]: $errstr in $errfile on line $errline");
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

// Check if ImageProcessor class exists
if (!class_exists('ImageProcessor')) {
    try {
        require_once 'src/models/ImageProcessor.php';
    } catch (Exception $e) {
        ob_end_clean();
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Failed to load ImageProcessor class: ' . $e->getMessage()
        ]);
        exit;
    }
}

// Ensure we're sending JSON
header('Content-Type: application/json');

try {
    // Clear any previous output
    ob_clean();

    // Log the raw POST data
    $logFile = __DIR__ . '/logs/process_debug.log';
    $logMessage = date('Y-m-d H:i:s') . " - Raw POST data: " . file_get_contents('php://input') . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    $logMessage = date('Y-m-d H:i:s') . " - \$_POST contents: " . print_r($_POST, true) . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    $logMessage = date('Y-m-d H:i:s') . " - \$_FILES contents: " . print_r($_FILES, true) . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);

    if (!isset($_POST['settings']) || !isset($_FILES['images'])) {
        throw new Exception('Missing required parameters');
    }

    // Log the received settings
    $logMessage = date('Y-m-d H:i:s') . " - Received settings: " . $_POST['settings'] . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);

    $settings = json_decode($_POST['settings'], true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid settings JSON: ' . json_last_error_msg());
    }

    // Log decoded settings
    $logMessage = date('Y-m-d H:i:s') . " - Decoded settings: " . print_r($settings, true) . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);

    // Validate required settings
    if (!isset($settings['mode'])) {
        throw new Exception('Mode is required in settings');
    }

    // Validate crop settings
    if ($settings['mode'] === 'crop') {
        if (!isset($settings['width']) || !isset($settings['height'])) {
            throw new Exception('Width and height are required for crop mode');
        }
        if (!isset($settings['cropMode'])) {
            throw new Exception('Crop mode is required');
        }
        if ($settings['cropMode'] === 'auto' && !isset($settings['alignment'])) {
            throw new Exception('Alignment is required for automatic crop mode');
        }
    }

    $processor = new ImageProcessor();
    $processedImages = [];

    // Use absolute path for upload directory
    $uploadDir = BASE_PATH . '/uploads/resize';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }
    }

    foreach ($_FILES['images']['tmp_name'] as $index => $tmpName) {
        if (!is_uploaded_file($tmpName)) {
            error_log("Skipping invalid upload: $tmpName");
            continue;
        }

        $originalName = $_FILES['images']['name'][$index];
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $baseName = pathinfo($originalName, PATHINFO_FILENAME);
        
        // Set the output format based on settings
        $outputFormat = isset($settings['format']) ? strtolower($settings['format']) : 'jpg';
        
        // Create output filename with the new format
        $outputName = $baseName . '.' . $outputFormat;
        
        try {
            $logMessage = date('Y-m-d H:i:s') . " - Processing image: " . $originalName . "\n";
            file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
            $logMessage = date('Y-m-d H:i:s') . " - Output format: " . $outputFormat . "\n";
            file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
            
            // Load the image
            $processor->loadImage($tmpName);

            // Apply settings
            if ($settings['mode'] === 'resize') {
                if (isset($settings['width'])) {
                    $processor->resize($settings['width']);
                } else if (isset($settings['height'])) {
                    $processor->resize(null, $settings['height']);
                }
            } else if ($settings['mode'] === 'crop') {
                // Crop mode
                if ($settings['cropMode'] === 'auto') {
                    $logMessage = date('Y-m-d H:i:s') . " - Performing auto crop with alignment: " . $settings['alignment'] . "\n";
                    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
                    $logMessage = date('Y-m-d H:i:s') . " - Crop dimensions: " . $settings['width'] . "x" . $settings['height'] . "\n";
                    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
                    $logMessage = date('Y-m-d H:i:s') . " - Full crop settings: " . print_r($settings, true) . "\n";
                    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
                    $processor->crop($settings['width'], $settings['height'], $settings['alignment']);
                } else {
                    // Manual crop
                    if (isset($_POST['cropData'][$index])) {
                        $cropData = json_decode($_POST['cropData'][$index], true);
                        if ($cropData) {
                            $processor->crop($settings['width'], $settings['height'], null, $cropData);
                        }
                    }
                }
            }

            // Apply effects if present
            if (isset($settings['effects'])) {
                $logMessage = date('Y-m-d H:i:s') . " - Applying effects: " . print_r($settings['effects'], true) . "\n";
                file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
                $processor->applyEffects($settings['effects']);
            }

            // Set quality
            if (isset($settings['quality'])) {
                $processor->setQuality($settings['quality']);
            }

            // Save with the specified format
            $outputPath = $uploadDir . '/' . $outputName;
            error_log("Saving image to: $outputPath");
            $processor->save($outputPath, $outputFormat);

            // Use relative path for the image URL
            $processedImages[] = [
                'url' => 'uploads/resize/' . $outputName,
                'name' => $outputName
            ];
        } catch (Exception $e) {
            $logMessage = date('Y-m-d H:i:s') . " - Error processing image " . $originalName . ": " . $e->getMessage() . "\n";
            file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
            $logMessage = date('Y-m-d H:i:s') . " - Stack trace: " . $e->getTraceAsString() . "\n";
            file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
            throw new Exception('Error processing image ' . $originalName . ': ' . $e->getMessage());
        }
    }

    if (empty($processedImages)) {
        throw new Exception('No images were processed successfully');
    }

    // Clear any output and send JSON response
    ob_clean();
    echo json_encode([
        'success' => true,
        'images' => $processedImages
    ]);

} catch (Throwable $e) {
    // Clear any output and send error response
    ob_clean();
    $logFile = __DIR__ . '/logs/process_debug.log';
    $logMessage = date('Y-m-d H:i:s') . " - Image processing error: " . $e->getMessage() . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    $logMessage = date('Y-m-d H:i:s') . " - Stack trace: " . $e->getTraceAsString() . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
} finally {
    // Clean up processor
    if (isset($processor)) {
        $processor->destroy();
    }
    // End output buffering
    ob_end_flush();
} 