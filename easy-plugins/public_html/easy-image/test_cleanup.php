<?php
// Simple test to check if PHP is working in web environment
echo "<h1>PHP Test</h1>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "<p>SAPI: " . php_sapi_name() . "</p>";
echo "<p>Is CLI: " . (php_sapi_name() === 'cli' ? 'true' : 'false') . "</p>";
echo "<p>Is Web: " . (php_sapi_name() !== 'cli' ? 'true' : 'false') . "</p>";
echo "<p>Current Directory: " . __DIR__ . "</p>";
echo "<p>Uploads Directory: " . __DIR__ . '/uploads/' . "</p>";
echo "<p>Uploads Directory Exists: " . (is_dir(__DIR__ . '/uploads/') ? 'Yes' : 'No') . "</p>";
echo "<p>Log File: " . __DIR__ . '/cleanup_log.txt' . "</p>";
echo "<p>Log File Exists: " . (file_exists(__DIR__ . '/cleanup_log.txt') ? 'Yes' : 'No') . "</p>";

if (file_exists(__DIR__ . '/cleanup_log.txt')) {
    echo "<p>Log File Size: " . filesize(__DIR__ . '/cleanup_log.txt') . " bytes</p>";
    echo "<h3>Log Content:</h3>";
    echo "<pre>" . htmlspecialchars(file_get_contents(__DIR__ . '/cleanup_log.txt')) . "</pre>";
}

echo "<p><a href='cleanup_images.php'>Go to Cleanup Manager</a></p>";
?> 