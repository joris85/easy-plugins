<?php
/**
 * Image Cleanup Script (CLI only)
 * Removes images older than 10 minutes from all uploads subdirectories.
 *
 * Usage: php cleanup_images.php
 * Cron: every 30 minutes via run_cleanup.sh
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('Forbidden');
}

date_default_timezone_set('Europe/Amsterdam');

$uploadsDir = __DIR__ . '/uploads/';
$maxAgeMinutes = 30;
$logFile = __DIR__ . '/cleanup_log.txt';

function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s') . ' (Amsterdam)';
    $logEntry = "[$timestamp] $message" . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    echo $logEntry;
}

function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    return round($bytes, $precision) . ' ' . $units[$i];
}

function countRemainingImages($dir, $cutoffTime) {
    $count = 0;
    if (!is_dir($dir)) {
        return $count;
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if (!$file->isFile()) {
            continue;
        }
        $extension = strtolower(pathinfo($file->getFilename(), PATHINFO_EXTENSION));
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'];
        if (in_array($extension, $imageExtensions, true) && $file->getMTime() >= $cutoffTime) {
            $count++;
        }
    }

    return $count;
}

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
            cleanDirectory($filePath, $cutoffTime);
            continue;
        }

        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'];
        if (!in_array($extension, $imageExtensions, true)) {
            continue;
        }

        if (filemtime($filePath) < $cutoffTime) {
            $fileSize = filesize($filePath);
            if (unlink($filePath)) {
                $totalRemoved++;
                $totalSize += $fileSize;
            } else {
                logMessage('ERROR: Failed to remove an image file');
            }
        }
    }
}

if (!is_dir($uploadsDir)) {
    logMessage('ERROR: Uploads directory does not exist');
    exit(1);
}

$cutoffTime = time() - ($maxAgeMinutes * 60);
logMessage('Starting automatic cleanup - removing files older than ' . date('Y-m-d H:i:s', $cutoffTime) . " (Amsterdam) ($maxAgeMinutes minutes)");

$totalRemoved = 0;
$totalSize = 0;

try {
    logMessage('Starting cleanup process...');
    cleanDirectory($uploadsDir, $cutoffTime);
    $remainingImages = countRemainingImages($uploadsDir, $cutoffTime);
    logMessage('Cleanup completed successfully!');
    logMessage('Cleaned images: Removed ' . $totalRemoved . ' images, ' . formatBytes($totalSize) . ' freed');
    logMessage('Remaining images: ' . $remainingImages . ' images still on server (newer than ' . $maxAgeMinutes . ' minutes)');
    logMessage('----------------------------------------');
} catch (Throwable $e) {
    logMessage('ERROR: Exception occurred: ' . $e->getMessage());
    exit(1);
}

exit(0);
