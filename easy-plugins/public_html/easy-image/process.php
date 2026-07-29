<?php
// Prevent any output before JSON response
ob_start();

// Enable error reporting but don't display errors
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

define('PROCESS_DEBUG', false);

@ini_set('memory_limit', '512M');
@set_time_limit(300);

// Define base path (only if not already defined)
if (!defined('BASE_PATH')) {
    define('BASE_PATH', __DIR__);
}

// Include initialization
require_once BASE_PATH . '/init.php';
require_once BASE_PATH . '/src/security.php';

easyImageSendSecurityHeaders();

// Sweep files older than 30 minutes, in the background after this response
easyImageScheduleCleanup(BASE_PATH);

// Set error handler (deprecations are logged, not promoted to exceptions)
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if ($errno === E_DEPRECATED || $errno === E_USER_DEPRECATED) {
        error_log("PHP Deprecated [$errno]: $errstr in $errfile on line $errline");
        return true;
    }
    error_log("PHP Error [$errno]: $errstr in $errfile on line $errline");
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

if (!function_exists('logSecurityEvent')) {
    function logSecurityEvent($message) {
        $entry = sprintf("[%s] %s\n", date('Y-m-d H:i:s'), $message);
        file_put_contents(__DIR__ . '/logs/security.log', $entry, FILE_APPEND | LOCK_EX);
    }
}

if (!function_exists('logProcessDebug')) {
    function logProcessDebug($message) {
        if (!PROCESS_DEBUG) {
            return;
        }
        $logFile = __DIR__ . '/logs/process_debug.log';
        file_put_contents($logFile, date('Y-m-d H:i:s') . ' - ' . $message . "\n", FILE_APPEND | LOCK_EX);
    }
}

if (!function_exists('throwValidationError')) {
    function throwValidationError($message, $fileName = null) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $details = $message;
        if ($fileName !== null) {
            $details .= " | file: " . $fileName;
        }
        logSecurityEvent("Upload blocked (IP: {$ip}) - {$details}");
        throw new Exception($message);
    }
}

if (!function_exists('getCropDataForFile')) {
    function getCropDataForFile($settings, $fileIndex) {
        if (isset($_POST['cropData'][$fileIndex])) {
            $decoded = json_decode($_POST['cropData'][$fileIndex], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        if (isset($settings['cropData'][$fileIndex]) && is_array($settings['cropData'][$fileIndex])) {
            return $settings['cropData'][$fileIndex];
        }

        if (isset($settings['cropData'][(string) $fileIndex]) && is_array($settings['cropData'][(string) $fileIndex])) {
            return $settings['cropData'][(string) $fileIndex];
        }

        return null;
    }
}

if (!function_exists('detectUploadedImageMime')) {
    function detectUploadedImageMime($tmpName, $originalName) {
        $allowed = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/bmp',
        ];

        // HEIC can't be parsed by getimagesize; detect via finfo + Imagick ping
        $finfoEarly = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfoEarly) {
            $earlyMime = strtolower(finfo_file($finfoEarly, $tmpName) ?: '');
            if (in_array($earlyMime, ['image/heic', 'image/heif', 'image/heic-sequence'], true)) {
                if (!easyImageSupportedFormats()['heicInput']) {
                    return null;
                }
                return easyImagePingDimensions($tmpName) !== null ? 'image/heic' : null;
            }
        }

        $imageInfo = @getimagesize($tmpName);
        if (!$imageInfo || empty($imageInfo[0]) || empty($imageInfo[1])) {
            return null;
        }

        $mimeType = '';
        if (!empty($imageInfo['mime'])) {
            $mimeType = strtolower($imageInfo['mime']);
        }

        if ($mimeType === 'image/x-webp') {
            $mimeType = 'image/webp';
        }

        $mimeFromFinfo = '';
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo) {
            $detected = finfo_file($finfo, $tmpName) ?: '';
            $mimeFromFinfo = strtolower($detected);
            if ($mimeFromFinfo === 'image/x-webp') {
                $mimeFromFinfo = 'image/webp';
            }
        }

        if (!in_array($mimeType, $allowed, true)) {
            if (in_array($mimeFromFinfo, $allowed, true)) {
                $mimeType = $mimeFromFinfo;
            } else {
                return null;
            }
        }

        if ($mimeFromFinfo !== '' && !in_array($mimeFromFinfo, $allowed, true)) {
            return null;
        }

        if ($mimeFromFinfo !== '' && $mimeType !== '' && $mimeFromFinfo !== $mimeType) {
            return null;
        }

        return $mimeType;
    }
}

if (!function_exists('sanitizeFileBase')) {
    function sanitizeFileBase($baseName) {
        $sanitized = preg_replace('/[^A-Za-z0-9_\-]/', '-', $baseName);
        $sanitized = preg_replace('/-+/', '-', $sanitized);
        $sanitized = trim($sanitized, '-_');
        if ($sanitized === '') {
            $sanitized = 'image';
        }
        return substr($sanitized, 0, 60);
    }
}

if (!function_exists('clampCropDataToBounds')) {
    function clampCropDataToBounds($cropData, $imageWidth, $imageHeight) {
        $x = max(0, (int) round($cropData['x'] ?? 0));
        $y = max(0, (int) round($cropData['y'] ?? 0));
        $width = max(1, (int) round($cropData['width'] ?? 1));
        $height = max(1, (int) round($cropData['height'] ?? 1));

        $width = min($width, $imageWidth);
        $height = min($height, $imageHeight);

        if ($x + $width > $imageWidth) {
            $x = max(0, $imageWidth - $width);
        }
        if ($y + $height > $imageHeight) {
            $y = max(0, $imageHeight - $height);
        }

        return [
            'x' => $x,
            'y' => $y,
            'width' => $width,
            'height' => $height
        ];
    }
}

if (!function_exists('isPreCroppedFile')) {
    function isPreCroppedFile($settings, $fileIndex) {
        if (!empty($settings['preCropped'][$fileIndex])) {
            return true;
        }
        return !empty($settings['preCropped'][(string) $fileIndex]);
    }
}

if (!function_exists('scaleCropDataToSource')) {
    function scaleCropDataToSource($cropData) {
        if (!is_array($cropData)) {
            return $cropData;
        }

        if (!empty($cropData['sourceSpace'])) {
            $sourceWidth = (int) ($cropData['sourceWidth'] ?? 0);
            $sourceHeight = (int) ($cropData['sourceHeight'] ?? 0);
            if ($sourceWidth > 0 && $sourceHeight > 0) {
                $cropData = clampCropDataToBounds($cropData, $sourceWidth, $sourceHeight);
            }
            return $cropData;
        }

        $previewScale = isset($cropData['previewScale']) ? (float) $cropData['previewScale'] : 1.0;
        if ($previewScale > 0 && $previewScale < 1) {
            $factor = 1 / $previewScale;
            $cropData['x'] = (int) round(($cropData['x'] ?? 0) * $factor);
            $cropData['y'] = (int) round(($cropData['y'] ?? 0) * $factor);
            $cropData['width'] = (int) round(($cropData['width'] ?? 0) * $factor);
            $cropData['height'] = (int) round(($cropData['height'] ?? 0) * $factor);
        }

        $sourceWidth = (int) ($cropData['sourceWidth'] ?? 0);
        $sourceHeight = (int) ($cropData['sourceHeight'] ?? 0);
        if ($sourceWidth > 0 && $sourceHeight > 0) {
            $cropData = clampCropDataToBounds($cropData, $sourceWidth, $sourceHeight);
        }

        return $cropData;
    }
}

if (!function_exists('validateSourceDimensions')) {
    function validateSourceDimensions(ImageProcessor $processor, $cropData, $originalName) {
        if (!is_array($cropData)) {
            return;
        }

        $expectedW = (int) ($cropData['sourceWidth'] ?? 0);
        $expectedH = (int) ($cropData['sourceHeight'] ?? 0);
        if ($expectedW <= 0 || $expectedH <= 0) {
            return;
        }

        $actualW = $processor->getImageWidth();
        $actualH = $processor->getImageHeight();
        $tolerance = 2;

        if (abs($actualW - $expectedW) > $tolerance || abs($actualH - $expectedH) > $tolerance) {
            logProcessDebug(
                'Source dimension mismatch for ' . $originalName .
                ': expected ' . $expectedW . 'x' . $expectedH .
                ', got ' . $actualW . 'x' . $actualH
            );
            throw new Exception(
                'Image dimension mismatch for ' . $originalName .
                '. Please re-crop this image or resize it below 5000px before processing.'
            );
        }
    }
}

// Always load our ImageProcessor (avoid a stale class from another include path).
try {
    require_once BASE_PATH . '/src/models/ImageProcessor.php';
} catch (Throwable $e) {
    if (!class_exists('ImageProcessor')) {
        ob_end_clean();
        easyImageSendJson([
            'success' => false,
            'error' => 'Image processing is temporarily unavailable. Please try again later.'
        ], 500, 0, true);
    }
}

// Ensure we're sending JSON
header('Content-Type: application/json');

try {
    ob_clean();

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        throw new Exception('Invalid request method');
    }

    if (!easyImageValidatePostOrigin()) {
        logSecurityEvent('Upload blocked (IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . ') - invalid origin');
        easyImageSendJson([
            'success' => false,
            'error' => 'Request not allowed from this origin.'
        ], 403, 0, true);
    }

    if (!isset($_POST['settings']) || !isset($_FILES['images'])) {
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 0 && empty($_POST) && empty($_FILES)) {
            throw new Exception(
                'Upload too large for server limits. Try fewer or smaller images.'
            );
        }
        throw new Exception('Missing required parameters');
    }

    logProcessDebug('Received settings: ' . $_POST['settings']);

    $settings = json_decode($_POST['settings'], true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid settings. Please refresh the page and try again.');
    }

    logProcessDebug('Decoded settings: ' . print_r($settings, true));

    if (!isset($settings['mode'])) {
        throw new Exception('Mode is required in settings');
    }

    $allowedModes = ['resize', 'crop', 'optimize', 'custom'];
    if (!in_array($settings['mode'], $allowedModes, true)) {
        throwValidationError('Unsupported processing mode requested');
    }

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

    $maxFileSize = 50 * 1024 * 1024;
    $maxTotalSize = 256 * 1024 * 1024;
    $maxImages = 100;
    $maxDimension = 12000;
    $maxPixelCount = 50_000_000;
    $maxRequestSeconds = 300;
    $requestStartTime = microtime(true);
    $serverFormats = easyImageSupportedFormats();
    $allowedInputMime = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/bmp',
    ];
    if ($serverFormats['heicInput']) {
        $allowedInputMime[] = 'image/heic';
        $allowedInputMime[] = 'image/heif';
    }
    $allowedOutputFormats = ['jpg', 'jpeg', 'png', 'webp'];
    if ($serverFormats['avifOutput']) {
        $allowedOutputFormats[] = 'avif';
    }
    $allowedQualityTiers = ['lossy', 'near-lossless', 'lossless'];

    $fileCount = is_array($_FILES['images']['tmp_name']) ? count($_FILES['images']['tmp_name']) : 0;
    if ($fileCount === 0) {
        throwValidationError('No images were uploaded for processing');
    }
    if ($fileCount > $maxImages) {
        throwValidationError('Too many images uploaded. Maximum allowed per batch is ' . $maxImages);
    }

    $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (!easyImageCheckRateLimit($clientIp, $fileCount)) {
        logSecurityEvent('Upload blocked (IP: ' . $clientIp . ') - rate limit exceeded');
        easyImageSendJson([
            'success' => false,
            'error' => 'Too many requests. Please wait a while and try again.'
        ], 429, 0, true);
    }

    $totalUploadSize = 0;
    $validatedFiles = [];

    foreach ($_FILES['images']['tmp_name'] as $index => $tmpName) {
        $originalName = $_FILES['images']['name'][$index] ?? 'unknown';
        $errorCode = $_FILES['images']['error'][$index] ?? UPLOAD_ERR_NO_FILE;

        if ($errorCode !== UPLOAD_ERR_OK) {
            throwValidationError('File upload error (code ' . $errorCode . ')', $originalName);
        }

        if (!is_uploaded_file($tmpName)) {
            throwValidationError('Potential file upload attack detected', $originalName);
        }

        $size = (int)($_FILES['images']['size'][$index] ?? 0);
        $totalUploadSize += $size;

        if ($size <= 0) {
            throwValidationError('Uploaded file is empty or unreadable', $originalName);
        }

        if ($size > $maxFileSize) {
            throwValidationError('File exceeds maximum allowed size of 50MB', $originalName);
        }

        if ($totalUploadSize > $maxTotalSize) {
            throwValidationError('Total upload exceeds maximum allowed size of 256MB');
        }

        $mimeType = detectUploadedImageMime($tmpName, $originalName);
        if ($mimeType === null || !in_array($mimeType, $allowedInputMime, true)) {
            throwValidationError('Unsupported or potentially dangerous file type uploaded', $originalName);
        }

        if ($mimeType === 'image/heic' || $mimeType === 'image/heif') {
            $dims = easyImagePingDimensions($tmpName);
            if ($dims === null) {
                throwValidationError('Uploaded file is not a valid image', $originalName);
            }
            [$width, $height] = $dims;
        } else {
            $imageInfo = @getimagesize($tmpName);
            if (!$imageInfo || empty($imageInfo[0]) || empty($imageInfo[1])) {
                throwValidationError('Uploaded file is not a valid image', $originalName);
            }
            $width = (int)$imageInfo[0];
            $height = (int)$imageInfo[1];
        }
        if ($width > $maxDimension || $height > $maxDimension || ($width * $height) > $maxPixelCount) {
            throwValidationError('Image dimensions are too large to process safely', $originalName);
        }

        if (!easyImageValidatePixelBudget($width, $height, $size)) {
            throwValidationError('Image file appears invalid or too complex to process safely', $originalName);
        }

        $sanitizedBase = sanitizeFileBase(pathinfo($originalName, PATHINFO_FILENAME));

        $validatedFiles[] = [
            'index' => $index,
            'tmp_name' => $tmpName,
            'original_name' => $originalName,
            'size' => $size,
            'sanitized_base' => $sanitizedBase,
            'mime' => $mimeType,
            'width' => $width,
            'height' => $height
        ];
    }

    $selectedFormat = isset($settings['format']) ? strtolower($settings['format']) : 'webp';
    if ($selectedFormat === 'jpeg') {
        $selectedFormat = 'jpg';
    }
    if (!in_array($selectedFormat, $allowedOutputFormats, true)) {
        throwValidationError('Unsupported output format requested');
    }
    $settings['format'] = $selectedFormat;

    if (isset($settings['cropMode']) && !in_array($settings['cropMode'], ['auto', 'manual'], true)) {
        $settings['cropMode'] = 'manual';
    }

    if (isset($settings['resizeMode']) && !in_array($settings['resizeMode'], ['width', 'height', 'fit'], true)) {
        $settings['resizeMode'] = null;
    }

    if (isset($settings['alignment'])) {
        $allowedAlignments = [
            'top-left', 'top-center', 'top-right',
            'left-middle', 'center-middle', 'right-middle',
            'bottom-left', 'bottom-center', 'bottom-right'
        ];
        if (!in_array($settings['alignment'], $allowedAlignments, true)) {
            $settings['alignment'] = 'center-middle';
        }
    }

    if (array_key_exists('width', $settings) && $settings['width'] !== null) {
        $settings['width'] = max(0, min($maxDimension, (int)$settings['width']));
    }
    if (array_key_exists('height', $settings) && $settings['height'] !== null) {
        $settings['height'] = max(0, min($maxDimension, (int)$settings['height']));
    }

    if (isset($settings['quality'])) {
        $settings['quality'] = max(1, min(100, (int)$settings['quality']));
    } else {
        $settings['quality'] = 70;
    }

    $targetBytes = 0;
    if (!empty($settings['targetKB'])) {
        $targetKB = max(10, min(10240, (int) $settings['targetKB']));
        // Only lossy formats can hit a byte target by adjusting quality
        if (in_array($selectedFormat, ['jpg', 'jpeg', 'webp', 'avif'], true)) {
            $targetBytes = $targetKB * 1024;
        }
    }

    $qualityTier = $settings['qualityTier'] ?? 'lossy';
    if (!in_array($qualityTier, $allowedQualityTiers, true)) {
        $qualityTier = 'lossy';
    }
    $settings['qualityTier'] = $qualityTier;

    if (isset($settings['effects'])) {
        $settings['effects'] = easyImageNormalizeEffects($settings['effects']);
    }

    $metricsFile = BASE_PATH . '/data/metrics.json';
    if (!is_dir(dirname($metricsFile))) {
        mkdir(dirname($metricsFile), 0755, true);
    }
    $defaultMetrics = [
        'totalImages' => 0,
        'totalBytesProcessed' => 0,
        'totalBytesSaved' => 0,
        'lastUpdated' => time()
    ];
    if (!file_exists($metricsFile)) {
        $encodedDefaults = json_encode($defaultMetrics, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($encodedDefaults !== false) {
            file_put_contents($metricsFile, $encodedDefaults);
        }
    }

    $processor = new ImageProcessor();
    if (!$processor->isImagickAvailable()) {
        throw new Exception('Image processing is temporarily unavailable. Please try again later.');
    }
    $processedImages = [];
    $debugOrientation = easyImageIsDebugEnabled();

    if (!class_exists('OrientationDebug')) {
        require_once BASE_PATH . '/src/models/OrientationDebug.php';
    }
    OrientationDebug::setEnabled($debugOrientation);
    OrientationDebug::resetSession();

    $targetSubdir = 'resize';
    if ($settings['mode'] === 'crop') {
        $targetSubdir = 'crop';
    } elseif ($settings['mode'] === 'optimize') {
        $targetSubdir = 'optimize';
    } elseif ($settings['mode'] === 'custom') {
        $targetSubdir = 'custom';
    }

    $uploadDir = BASE_PATH . '/uploads/' . $targetSubdir;
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }
    }

    $batchUploadBytes = 0;
    $batchOutputBytes = 0;
    $errors = [];

    foreach ($validatedFiles as $fileData) {
        if ((microtime(true) - $requestStartTime) > $maxRequestSeconds) {
            logSecurityEvent('Request wall-clock limit reached for IP: ' . $clientIp);
            $errors[] = 'Processing stopped: request time limit reached. Try fewer images per batch.';
            break;
        }

        $tmpName = $fileData['tmp_name'];
        $originalName = $fileData['original_name'];
        $sanitizedBase = $fileData['sanitized_base'];
        $batchUploadBytes += $fileData['size'];

        $outputFormat = $settings['format'];
        $outputToken = easyImageGenerateOutputToken();
        $outputName = $outputToken . '-' . $sanitizedBase . '.' . $outputFormat;
        $uniqueCounter = 1;
        while (file_exists($uploadDir . '/' . $outputName)) {
            $outputName = $outputToken . '-' . $sanitizedBase . '-' . $uniqueCounter . '.' . $outputFormat;
            $uniqueCounter++;
        }

        try {
            @set_time_limit(300);

            logProcessDebug('Processing image: ' . $originalName . ' | format: ' . $outputFormat);

            $processor->loadImage($tmpName);

            if (isPreCroppedFile($settings, $fileData['index'])) {
                $loadedW = $processor->getImageWidth();
                $loadedH = $processor->getImageHeight();
                if ($loadedW <= 0 || $loadedH <= 0) {
                    throw new Exception('Invalid pre-cropped image dimensions');
                }
                if ($loadedW > $maxDimension || $loadedH > $maxDimension || ($loadedW * $loadedH) > $maxPixelCount) {
                    throw new Exception('Pre-cropped image dimensions exceed allowed limits');
                }
            }

            $orientDebug = $processor->getLastOrientationDebug() ?: [];
            $orientDebug['original_name'] = $originalName;
            $orientDebug['mode'] = $settings['mode'];
            $orientDebug['output_format'] = $outputFormat;
            $processor->setQualityTier($settings['qualityTier']);

            if ($settings['mode'] === 'resize') {
                $noUpscale = !empty($settings['noUpscale']);
                if (($settings['resizeMode'] ?? '') === 'fit'
                    && !empty($settings['width']) && !empty($settings['height'])) {
                    $processor->resizeFit($settings['width'], $settings['height'], $noUpscale);
                } elseif (isset($settings['width']) && $settings['width']) {
                    $processor->resize($settings['width'], null, true, $noUpscale);
                } elseif (isset($settings['height']) && $settings['height']) {
                    $processor->resize(null, $settings['height'], true, $noUpscale);
                }
            } elseif ($settings['mode'] === 'crop') {
                if (isPreCroppedFile($settings, $fileData['index'])) {
                    // Cropped client-side via Cropper.getCroppedCanvas — encode only
                } elseif ($settings['cropMode'] === 'auto') {
                    $processor->crop($settings['width'], $settings['height'], $settings['alignment']);
                } else {
                    $cropData = getCropDataForFile($settings, $fileData['index']);
                    if (!$cropData) {
                        throw new Exception('Manual crop coordinates are required for ' . $originalName);
                    }
                    validateSourceDimensions($processor, $cropData, $originalName);
                    $cropData = scaleCropDataToSource($cropData);
                    $cropWidth = (int) round($cropData['width'] ?? 0);
                    $cropHeight = (int) round($cropData['height'] ?? 0);
                    if ($cropWidth <= 0 || $cropHeight <= 0) {
                        throw new Exception('Invalid manual crop coordinates for ' . $originalName);
                    }
                    $cropData = clampCropDataToBounds(
                        $cropData,
                        $processor->getImageWidth(),
                        $processor->getImageHeight()
                    );
                    $cropWidth = (int) $cropData['width'];
                    $cropHeight = (int) $cropData['height'];
                    $processor->crop($cropWidth, $cropHeight, null, $cropData);
                    if (!empty($settings['width']) && !empty($settings['height'])) {
                        $processor->resize($settings['width'], $settings['height']);
                    }
                }
            } elseif ($settings['mode'] === 'custom') {
                if (isPreCroppedFile($settings, $fileData['index'])) {
                    // Trimmed client-side via Cropper.getCroppedCanvas — encode only
                } else {
                $cropData = getCropDataForFile($settings, $fileData['index']);
                if (!$cropData) {
                    throw new Exception('Custom trim coordinates are required');
                }
                validateSourceDimensions($processor, $cropData, $originalName);
                $cropData = scaleCropDataToSource($cropData);
                $cropWidth = (int) round($cropData['width'] ?? 0);
                $cropHeight = (int) round($cropData['height'] ?? 0);
                if ($cropWidth <= 0 || $cropHeight <= 0) {
                    throw new Exception('Invalid custom trim coordinates');
                }
                $cropData = clampCropDataToBounds(
                    $cropData,
                    $processor->getImageWidth(),
                    $processor->getImageHeight()
                );
                $cropWidth = (int) $cropData['width'];
                $cropHeight = (int) $cropData['height'];
                $processor->crop($cropWidth, $cropHeight, null, $cropData);
                }
            }

            if (isset($settings['effects'])) {
                $processor->applyEffects($settings['effects']);
            }

            $processor->setQuality($settings['quality']);

            $outputPath = $uploadDir . '/' . $outputName;
            $targetSizeMissed = false;
            if ($targetBytes > 0) {
                $achievedQuality = $processor->saveWithTargetSize($outputPath, $outputFormat, $targetBytes);
                $targetSizeMissed = $achievedQuality === null;
            } else {
                $processor->save($outputPath, $outputFormat);
            }

            if (is_file($outputPath)) {
                try {
                    $outIm = new Imagick($outputPath);
                    $orientDebug['output_dimensions'] = $outIm->getImageWidth() . 'x' . $outIm->getImageHeight();
                    $orientDebug['output_orientation'] = (int) $outIm->getImageOrientation();
                    $orientDebug['output_orientation_label'] = class_exists('OrientationNormalizer')
                        ? OrientationNormalizer::orientationLabel($orientDebug['output_orientation'])
                        : (string) $orientDebug['output_orientation'];
                    $orientDebug['output_url'] = 'uploads/' . $targetSubdir . '/' . $outputName;
                    $orientDebug['output_bytes'] = filesize($outputPath);
                    $outIm->destroy();
                } catch (Throwable $debugException) {
                    $orientDebug['output_debug_error'] = $debugException->getMessage();
                }
                if ($debugOrientation) {
                    OrientationDebug::record($orientDebug);
                }
            }

            $outputBytes = filesize($outputPath);
            $processedImages[] = [
                'url' => 'uploads/' . $targetSubdir . '/' . $outputName,
                'name' => $outputName,
                'originalName' => $originalName,
                'index' => $fileData['index'],
                'width' => $processor->getImageWidth(),
                'height' => $processor->getImageHeight(),
                'bytes' => $outputBytes,
                'targetSizeMissed' => $targetSizeMissed
            ];
            if ($targetSizeMissed) {
                $errors[] = $originalName . ': Could not reach the target size even at minimum quality; smallest possible file was saved.';
            }
            $batchOutputBytes += $outputBytes;
            $processor->clearImage();

            if ($fileData['size'] > 5 * 1024 * 1024) {
                gc_collect_cycles();
            }
        } catch (Throwable $e) {
            logProcessDebug('Error processing ' . $originalName . ': ' . $e->getMessage());
            logSecurityEvent('Processing failed for ' . $originalName . ' (IP: ' . $clientIp . '): ' . $e->getMessage());
            $errors[] = $originalName . ': Processing failed';

            try {
                $processor->clearImage();
            } catch (Throwable $cleanupException) {
                // Ignore cleanup errors
            }
        }
    }

    if (empty($processedImages)) {
        throw new Exception(
            'No images were processed successfully. Please try again with smaller images or fewer files at once.'
        );
    }

    if (!empty($errors)) {
        logProcessDebug('Partial failures: ' . implode('; ', $errors));
    }

    $metricsHandle = fopen($metricsFile, 'c+');
    if ($metricsHandle) {
        if (flock($metricsHandle, LOCK_EX)) {
            $metricsData = stream_get_contents($metricsHandle);
            $metrics = json_decode($metricsData, true);
            if (!is_array($metrics)) {
                $metrics = [
                    'totalImages' => 0,
                    'totalBytesProcessed' => 0,
                    'totalBytesSaved' => 0,
                    'lastUpdated' => time()
                ];
            }
            $metrics['totalImages'] = (int)$metrics['totalImages'] + count($processedImages);
            $metrics['totalBytesProcessed'] = (int)($metrics['totalBytesProcessed'] ?? 0) + $batchUploadBytes;
            $savedBytes = max(0, $batchUploadBytes - $batchOutputBytes);
            $metrics['totalBytesSaved'] = (int)($metrics['totalBytesSaved'] ?? 0) + $savedBytes;
            $metrics['lastUpdated'] = time();

            ftruncate($metricsHandle, 0);
            rewind($metricsHandle);
            $encodedMetrics = json_encode($metrics, JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
            if ($encodedMetrics !== false) {
                fwrite($metricsHandle, $encodedMetrics);
            }
            fflush($metricsHandle);
            flock($metricsHandle, LOCK_UN);
        }
        fclose($metricsHandle);
    }

    ob_clean();
    $response = [
        'success' => true,
        'images' => $processedImages,
        'errors' => $errors,
        'processedCount' => count($processedImages),
        'requestedCount' => count($validatedFiles)
    ];

    if ($debugOrientation) {
        $response['orientationDebug'] = OrientationDebug::getSessionReports();
        $response['orientationLogFile'] = 'logs/orientation_debug.log';
    }

    easyImageSendJson($response);

} catch (Throwable $e) {
    ob_clean();
    logProcessDebug('Image processing error: ' . $e->getMessage());

    $msg = $e->getMessage();
    $publicError = 'An error occurred while processing your images. Please try again.';
    $safePrefixes = [
        'Missing required',
        'Upload too large',
        'Too many images',
        'No images were processed',
        'Invalid settings',
        'Unsupported',
        'File exceeds',
        'Total upload',
        'Image dimensions',
        'Image file appears',
        'Unsupported processing',
        'Unsupported output',
        'Width and height',
        'Crop mode',
        'Alignment is',
        'Manual crop',
        'Custom trim',
        'Invalid manual',
        'Invalid custom',
        'No images were uploaded',
        'File upload error',
        'Uploaded file',
        'Potential file upload',
        'Image processing is temporarily',
    ];
    foreach ($safePrefixes as $prefix) {
        if (stripos($msg, $prefix) !== false) {
            $publicError = $msg;
            break;
        }
    }

    if ($publicError === 'An error occurred while processing your images. Please try again.') {
        logSecurityEvent('Processing error (IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '): ' . $msg);
    }

    easyImageSendJson([
        'success' => false,
        'error' => $publicError
    ], 500);
} finally {
    if (isset($processor)) {
        $processor->destroy();
    }
    ob_end_flush();
}
