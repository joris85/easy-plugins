<?php
// info.php — drop this in your MAMP webroot (e.g. /Applications/MAMP/htdocs/)
// Open it via http://localhost:8888/info.php  (adjust port if needed)
// Delete it again when you're done — never leave phpinfo() on a public server.

// --- Quick check of the values you're most likely editing ---
$keys = [
    'upload_max_filesize',
    'post_max_size',
    'memory_limit',
    'max_execution_time',
    'max_input_time',
    'max_input_vars',
    'display_errors',
    'date.timezone',
];

echo '<h2>Loaded php.ini: ' . htmlspecialchars(php_ini_loaded_file() ?: 'none') . '</h2>';
echo '<p>PHP version: ' . htmlspecialchars(phpversion()) . '</p>';
echo '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:monospace;">';
echo '<tr><th align="left">Setting</th><th align="left">Value</th></tr>';
foreach ($keys as $k) {
    echo '<tr><td>' . htmlspecialchars($k) . '</td><td>'
        . htmlspecialchars((string) ini_get($k)) . '</td></tr>';
}
echo '</table>';
echo '<hr>';

// --- Full server / PHP info ---
phpinfo();