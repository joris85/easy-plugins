<?php
/**
 * Image Cleanup Script
 * Removes images older than 6 hours from the uploads directory
 * 
 * Usage: php cleanup_images.php
 * Cronjob: 0 2 * * * /usr/bin/php /path/to/public_html/cleanup_images.php
 * Web Interface: Visit cleanup_images.php in browser
 */

// Set timezone to Amsterdam
date_default_timezone_set('Europe/Amsterdam');

// Debug output for web requests
if (php_sapi_name() !== 'cli') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

// Configuration
$uploadsDir = __DIR__ . '/uploads/';
$maxAgeHours = 6; // For automatic cleanup (cronjob)
$maxAgeMinutes = 10; // For manual cleanup (web interface)
$logFile = __DIR__ . '/cleanup_log.txt';

// Check if this is a web request
$isWebRequest = php_sapi_name() !== 'cli';

// Initialize logging
function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s') . ' (Amsterdam)';
    $logEntry = "[$timestamp] $message" . PHP_EOL;
    
    // Write to log file
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // Also output to console if running from command line
    if (php_sapi_name() === 'cli') {
        echo $logEntry;
    }
}

// Function to read log file
function readLogFile() {
    global $logFile;
    if (file_exists($logFile)) {
        // Clear file cache to ensure fresh content
        clearstatcache(true, $logFile);
        
        $content = file_get_contents($logFile);
        $lines = explode(PHP_EOL, $content);
        
        // Get only the last 100 lines
        $lines = array_filter($lines); // Remove empty lines
        $lines = array_values($lines); // Re-index array
        $totalLines = count($lines);
        
        if ($totalLines > 100) {
            $lines = array_slice($lines, -100);
            $content = implode(PHP_EOL, $lines);
            return "Showing last 100 lines of $totalLines total log entries:\n\n" . $content;
        }
        
        return $content;
    }
    return "No log file found.";
}

// Function to get log file size
function getLogFileSize() {
    global $logFile;
    if (file_exists($logFile)) {
        $size = filesize($logFile);
        return formatBytes($size);
    }
    return "0 B";
}

// Function to clear log file
function clearLogFile() {
    global $logFile;
    if (file_exists($logFile)) {
        file_put_contents($logFile, '');
        return true;
    }
    return false;
}

// Function to get directory stats
function getDirectoryStats($dir) {
    global $maxAgeHours;
    $stats = [
        'total_files' => 0,
        'total_size' => 0,
        'old_files' => 0,
        'old_size' => 0
    ];
    
    if (!is_dir($dir)) {
        return $stats;
    }
    
    $cutoffTime = time() - ($maxAgeHours * 3600);
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $extension = strtolower(pathinfo($file->getFilename(), PATHINFO_EXTENSION));
            $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'];
            
            if (in_array($extension, $imageExtensions)) {
                $fileSize = $file->getSize();
                $fileTime = $file->getMTime();
                
                $stats['total_files']++;
                $stats['total_size'] += $fileSize;
                
                if ($fileTime < $cutoffTime) {
                    $stats['old_files']++;
                    $stats['old_size'] += $fileSize;
                }
            }
        }
    }
    
    return $stats;
}

// Helper function to format bytes
function formatBytes($bytes, $precision = 2) {
    $units = array('B', 'KB', 'MB', 'GB', 'TB');
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}

// Handle web interface actions
if ($isWebRequest) {
    // Enable error reporting for debugging
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    
    // Prevent caching
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
    header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");
    
    $action = $_GET['action'] ?? 'view';
    
    if ($action === 'run') {
        // Run cleanup process
        try {
            // Check if uploads directory exists
            if (!is_dir($uploadsDir)) {
                logMessage("ERROR: Uploads directory does not exist: $uploadsDir");
                header('Location: cleanup_images.php?action=view&error=1');
                exit;
            }

            // Calculate cutoff time (10 minutes ago for manual cleanup)
            $cutoffTime = time() - ($maxAgeMinutes * 60);
            logMessage("Starting manual cleanup - removing files older than " . date('Y-m-d H:i:s', $cutoffTime) . " (Amsterdam) (10 minutes)");

            global $totalRemoved, $totalSize;
            $totalRemoved = 0;
            $totalSize = 0;

            // Clean uploads directory
            logMessage("Cleaning uploads directory: $uploadsDir");
            cleanDirectory($uploadsDir, $cutoffTime);
            
            // Summary
            logMessage("Cleanup completed successfully!");
            logMessage("Total files removed: $totalRemoved");
            logMessage("Total space freed: " . formatBytes($totalSize));
            logMessage("----------------------------------------");
            
            header('Location: cleanup_images.php?action=view&ran=1');
            exit;
        } catch (Exception $e) {
            logMessage("ERROR: Exception occurred: " . $e->getMessage());
            header('Location: cleanup_images.php?action=view&error=1');
            exit;
        }
    } elseif ($action === 'clear') {
        // Clear log file
        clearLogFile();
        header('Location: cleanup_images.php?action=view&cleared=1');
        exit;
    }
    
    // Display web interface
    $stats = getDirectoryStats($uploadsDir);
    $logContent = readLogFile();
    $logSize = getLogFileSize();
    
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">
        <title>Image Cleanup Manager</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header {
                background: #4CAF50;
                color: #495057;
                padding: 20px;
            }
            .header-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 20px;
            }
            .header-text {
                text-align: center;
                flex: 1;
            }
            .header-actions {
                display: flex;
                gap: 10px;
            }
            .header h1 {
                margin: 0;
                font-size: 2rem;
            }
            .header p {
                margin: 5px 0 0 0;
            }
            .btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                background: rgba(255, 255, 255, 0.2);
                color: #495057;
                text-decoration: none;
                border-radius: 5px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                transition: all 0.3s ease;
            }
            .btn:hover {
                background: rgba(255, 255, 255, 0.3);
                color: #495057;
                text-decoration: none;
                transform: translateY(-1px);
            }
            .content {
                padding: 20px;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .stat-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #4CAF50;
                text-align: center;
            }
            .stat-card h3 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 1.1rem;
            }
            .stat-card .value {
                font-size: 2rem;
                font-weight: bold;
                color: #4CAF50;
            }
            .actions {
                display: flex;
                gap: 15px;
                margin-bottom: 30px;
                flex-wrap: wrap;
            }
            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 500;
                text-decoration: none;
                display: inline-block;
                transition: all 0.3s ease;
            }
            .btn-primary {
                background: #4CAF50;
                color: #495057;
            }
            .btn-primary:hover {
                background: #45a049;
                transform: translateY(-2px);
            }
            .btn-secondary {
                background: #6c757d;
                color: #495057;
            }
            .btn-secondary:hover {
                background: #5a6268;
            }
            .btn-danger {
                background: #dc3545;
                color: #495057;
            }
            .btn-danger:hover {
                background: #c82333;
            }
            .log-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin-top: 20px;
            }
            .log-header {
                display: flex;
                justify-content: between;
                align-items: center;
                margin-bottom: 15px;
                flex-wrap: wrap;
                gap: 10px;
            }
            .log-content {
                background: #2d3748;
                color: #e2e8f0;
                padding: 20px;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
                line-height: 1.5;
                max-height: 500px;
                overflow-y: auto;
                white-space: pre-wrap;
            }
            .alert {
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 20px;
            }
            .alert-success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .alert-info {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            .info-box {
                background: #e3f2fd;
                border: 1px solid #bbdefb;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .info-box h4 {
                margin: 0 0 10px 0;
                color: #1976d2;
            }
            .info-box p {
                margin: 0;
                color: #424242;
            }
            .footer {
                text-align: center;
                padding: 20px;
                border-top: 1px solid #e9ecef;
                margin-top: 20px;
            }
            .privacy-link {
                color: #6c757d;
                text-decoration: none;
                font-size: 0.9rem;
                transition: color 0.3s ease;
            }
            .privacy-link:hover {
                color: #4CAF50;
                text-decoration: underline;
            }
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
            }
            .modal-content {
                background-color: #495057;
                margin: 5% auto;
                padding: 0;
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                animation: modalSlideIn 0.3s ease;
            }
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .modal-header {
                background: #4CAF50;
                color: #495057;
                padding: 20px;
                border-radius: 8px 8px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h2 {
                margin: 0;
                font-size: 1.5rem;
            }
            .close {
                color: #495057;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
                transition: opacity 0.3s ease;
            }
            .close:hover {
                opacity: 0.7;
            }
            .modal-body {
                padding: 20px;
                max-height: 70vh;
                overflow-y: auto;
            }
            .modal-body h3 {
                color: #333;
                margin: 20px 0 10px 0;
                font-size: 1.2rem;
            }
            .modal-body h3:first-child {
                margin-top: 0;
            }
            .modal-body p {
                color: #666;
                line-height: 1.6;
                margin: 0 0 15px 0;
            }
            .modal-body strong {
                color: #4CAF50;
            }
            .fa-solid {
                margin-right: 8px;
            }
            .btn .fa-solid {
                margin-right: 6px;
            }
            .alert .fa-solid {
                margin-right: 8px;
            }
            .info-box h4 .fa-solid {
                margin-right: 8px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-content">
                    <div class="header-text">
                        <h1><i class="fa-solid fa-images"></i> Image Cleanup Manager</h1>
                        <p>Manage and monitor automatic image cleanup</p>
                    </div>
                    <div class="header-actions">
                        <a href="/" class="btn btn-primary">
                            <i class="fa-solid fa-home"></i> Home
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="content">
                <?php if (isset($_GET['ran'])): ?>
                    <div class="alert alert-success">
                        <i class="fa-solid fa-circle-check"></i> Cleanup process completed! Check the log below for details.
                    </div>
                <?php endif; ?>
                
                <?php if (isset($_GET['cleared'])): ?>
                    <div class="alert alert-info">
                        <i class="fa-solid fa-circle-info"></i> Log file cleared successfully.
                    </div>
                <?php endif; ?>
                
                <div class="info-box">
                    <h4><i class="fa-solid fa-circle-info"></i> How it works</h4>
                    <p>This tool automatically removes images older than 6 hours from the uploads directory. 
                    The cleanup runs daily via cronjob, but you can also run it manually here to remove images older than 10 minutes.</p>
                </div>
                

                
                <div class="actions">
                    <a href="?action=run" class="btn btn-primary" onclick="return confirm('Run cleanup now? This will remove images older than 10 minutes.')">
                        <i class="fa-solid fa-broom"></i> Run Cleanup Now
                    </a>
                    <button type="button" class="btn btn-secondary" onclick="forceRefresh()">
                        <i class="fa-solid fa-arrows-rotate"></i> Refresh
                    </button>
                    <a href="?action=clear" class="btn btn-danger" onclick="return confirm('Clear the log file? This action cannot be undone.')">
                        <i class="fa-solid fa-trash"></i> Clear Log
                    </a>
                </div>
                
                <div class="log-section">
                    <div class="log-header">
                        <h3><i class="fa-solid fa-clipboard-list"></i> Cleanup Log (<?php echo $logSize; ?>)</h3>
                        <small>Last updated: <?php echo date('Y-m-d H:i:s') . ' (Amsterdam)'; ?></small>
                        <?php 
                        if (file_exists($logFile)) {
                            $allLines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                            $totalLines = count($allLines);
                            if ($totalLines > 100) {
                                echo '<br><small style="color: #666;">Showing last 100 of ' . $totalLines . ' total entries</small>';
                            }
                        }
                        ?>
                    </div>
                    <div class="log-content">
                        <?php echo htmlspecialchars($logContent ?: 'No log entries yet.'); ?>
                    </div>
                </div>
                
                <div class="footer">
                    <a href="#" class="privacy-link" onclick="showPrivacyModal(); return false;">Privacy Policy</a>
                </div>
            </div>
        </div>
        
        <!-- Privacy Modal -->
        <div id="privacyModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fa-solid fa-shield-halved"></i> Privacy Policy</h2>
                    <span class="close" onclick="closePrivacyModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <h3>Image Storage & Processing</h3>
                    <p>When you upload an image to our service, we temporarily store it on our server to process and deliver it to you.</p>
                    
                    <h3>Automatic Deletion</h3>
                    <p>All uploaded images are automatically deleted after <strong>6 hours</strong> to protect your privacy and free up server space.</p>
                    
                    <h3>Manual Deletion</h3>
                    <p>If you want to delete your images faster, you can visit <strong><a target="_blank" href="cleanup_images.php">cleanup manager</a></strong> to run a manual cleanup. <strong>Note:</strong> Images must be at least 10 minutes old before they can be deleted to prevent interference with other users' uploads.</p>
                    
                        
                    <h3>Data Security</h3>
                <p>We do not share, sell, or use your images for any purpose other than processing and delivering them to you. Your privacy is our priority.</p>
                <p>I am just one person with no financial win in this tool, just made this with AI as a fun project for myself and others to save time. </p>
                </div>
            </div>
        </div>
        
        <script>
            // Auto-refresh every 30 seconds with cache busting
            setTimeout(function() {
                window.location.href = '?action=view&t=' + Date.now();
            }, 30000);
            
            // Force refresh function that bypasses all caching
            function forceRefresh() {
                // Clear browser cache for this page
                if (window.caches) {
                    caches.keys().then(function(names) {
                        for (let name of names) {
                            caches.delete(name);
                        }
                    });
                }
                // Force reload with cache busting
                window.location.href = '?action=view&t=' + Date.now() + '&force=1';
            }
            
            // Privacy modal functions
            function showPrivacyModal() {
                document.getElementById('privacyModal').style.display = 'block';
            }
            
            function closePrivacyModal() {
                document.getElementById('privacyModal').style.display = 'none';
            }
            
            // Close modal when clicking outside of it
            window.onclick = function(event) {
                var modal = document.getElementById('privacyModal');
                if (event.target == modal) {
                    modal.style.display = 'none';
                }
            }
        </script>
        <script src="https://kit.fontawesome.com/9be6112feb.js" crossorigin="anonymous"></script>
    </body>
    </html>
    <?php
    exit;
}

// Command line execution (original functionality)
// Check if uploads directory exists
if (!is_dir($uploadsDir)) {
    logMessage("ERROR: Uploads directory does not exist: $uploadsDir");
    exit(1);
}

// Calculate cutoff time (6 hours ago for automatic cleanup)
$cutoffTime = time() - ($maxAgeHours * 3600);
logMessage("Starting automatic cleanup - removing files older than " . date('Y-m-d H:i:s', $cutoffTime) . " (Amsterdam) (6 hours)");

$totalRemoved = 0;
$totalSize = 0;

// Function to clean a directory
function cleanDirectory($dir, $cutoffTime) {
    global $totalRemoved, $totalSize;
    
    if (!is_dir($dir)) {
        return;
    }
    
    $files = scandir($dir);
    
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }
        
        $filePath = $dir . '/' . $file;
        
        if (is_dir($filePath)) {
            // Recursively clean subdirectories (but don't remove the directories themselves)
            cleanDirectory($filePath, $cutoffTime);
        } else {
            // Check if it's an image file
            $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'];
            
            if (in_array($extension, $imageExtensions)) {
                $fileTime = filemtime($filePath);
                
                if ($fileTime < $cutoffTime) {
                    $fileSize = filesize($filePath);
                    
                    if (unlink($filePath)) {
                        $totalRemoved++;
                        $totalSize += $fileSize;
                        logMessage("Removed old image: $filePath (size: " . formatBytes($fileSize) . ", age: " . formatAge(time() - $fileTime) . ")");
                    } else {
                        logMessage("ERROR: Failed to remove file: $filePath");
                    }
                }
            }
        }
    }
}

// Helper function to format age
function formatAge($seconds) {
    if ($seconds < 60) {
        return $seconds . ' seconds';
    } elseif ($seconds < 3600) {
        return round($seconds / 60, 1) . ' minutes';
    } elseif ($seconds < 86400) {
        return round($seconds / 3600, 1) . ' hours';
    } else {
        return round($seconds / 86400, 1) . ' days';
    }
}

// Start cleanup
try {
    // Clean uploads directory
    logMessage("Cleaning uploads directory: $uploadsDir");
    cleanDirectory($uploadsDir, $cutoffTime);
    
    // Summary
    logMessage("Cleanup completed successfully!");
    logMessage("Total files removed: $totalRemoved");
    logMessage("Total space freed: " . formatBytes($totalSize));
    logMessage("----------------------------------------");
    
} catch (Exception $e) {
    logMessage("ERROR: Exception occurred: " . $e->getMessage());
    exit(1);
}

// Exit successfully
exit(0);
?> 