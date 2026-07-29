<?php
// Log errors but do not expose them in web responses.
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);

// Define base path (process.php may have defined it already)
if (!defined('BASE_PATH')) {
    define('BASE_PATH', __DIR__);
}

// Define upload directories
$uploadDirs = [
    BASE_PATH . '/uploads',
    BASE_PATH . '/uploads/resize',
    BASE_PATH . '/uploads/crop',
    BASE_PATH . '/uploads/optimize',
    BASE_PATH . '/uploads/custom'
];

// Create directories if they don't exist and set permissions
foreach ($uploadDirs as $dir) {
    if (!file_exists($dir)) {
        if (!mkdir($dir, 0755, true)) {
            die("Failed to create directory: $dir");
        }
    }
    
    // Ensure directory is writable
    if (!is_writable($dir)) {
        if (!chmod($dir, 0755)) {
            die("Directory not writable: $dir");
        }
    }
}

// Create .htaccess file to protect uploads directory but allow image access
$htaccessContent = "Options -Indexes\n
# Allow access to image files
<FilesMatch \"\\.(jpg|jpeg|png|gif|webp)$\">
    Require all granted
</FilesMatch>

# Deny access to all other files
<FilesMatch \"^(?!.*\\.(jpg|jpeg|png|gif|webp)$).\">
    Require all denied
</FilesMatch>";

$htaccessFile = BASE_PATH . '/uploads/.htaccess';
if (!file_exists($htaccessFile)) {
    file_put_contents($htaccessFile, $htaccessContent);
} 