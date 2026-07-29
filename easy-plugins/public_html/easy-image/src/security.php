<?php

if (!function_exists('easyImageSendJson')) {
    function easyImageSendJson(array $data, int $status = 200, int $extraFlags = 0, bool $exit = false): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json');
        }

        $flags = JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | $extraFlags;
        $json = json_encode($data, $flags);
        if ($json === false) {
            $json = json_encode([
                'success' => false,
                'error' => 'Failed to encode response',
            ], JSON_UNESCAPED_UNICODE);
        }

        echo $json;

        if ($exit) {
            exit;
        }
    }
}

if (!function_exists('easyImageSendSecurityHeaders')) {
    function easyImageSendSecurityHeaders() {
        if (headers_sent()) {
            return;
        }
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: strict-origin-when-cross-origin');
    }
}

if (!function_exists('easyImageIsDebugEnabled')) {
    function easyImageIsDebugEnabled() {
        $flag = getenv('EASY_IMAGE_DEBUG');
        return $flag === '1' || $flag === 'true';
    }
}

if (!function_exists('easyImageNormalizeHost')) {
    function easyImageNormalizeHost($host) {
        $host = strtolower(trim((string) $host));
        if ($host === '') {
            return '';
        }
        if (preg_match('/^\[([^\]]+)\](?::\d+)?$/', $host, $matches)) {
            return $matches[1];
        }
        $colonPos = strrpos($host, ':');
        if ($colonPos !== false && strpos($host, ':') === $colonPos && strpos($host, ']') === false) {
            return substr($host, 0, $colonPos);
        }
        return $host;
    }
}

if (!function_exists('easyImageHostsEquivalent')) {
    function easyImageHostsEquivalent($a, $b) {
        $a = easyImageNormalizeHost($a);
        $b = easyImageNormalizeHost($b);
        if ($a === '' || $b === '') {
            return false;
        }
        if ($a === $b) {
            return true;
        }
        return $a === 'www.' . $b || $b === 'www.' . $a;
    }
}

if (!function_exists('easyImageGetRequestHost')) {
    function easyImageGetRequestHost() {
        $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? '';
        if (strpos($host, ',') !== false) {
            $host = trim(explode(',', $host)[0]);
        }
        return easyImageNormalizeHost($host);
    }
}

if (!function_exists('easyImageIsAllowedRequestHost')) {
    function easyImageIsAllowedRequestHost($valueHost, $requestHost) {
        $valueHost = easyImageNormalizeHost($valueHost);
        if ($valueHost === '') {
            return false;
        }

        if ($requestHost !== '' && easyImageHostsEquivalent($valueHost, $requestHost)) {
            return true;
        }

        $knownHosts = [
            'easy-plugins.com',
            'www.easy-plugins.com',
            'localhost',
            '127.0.0.1',
        ];
        if (in_array($valueHost, $knownHosts, true)) {
            return true;
        }

        if (strlen($valueHost) > 18 && substr($valueHost, -18) === '.easy-plugins.com') {
            return true;
        }

        return false;
    }
}

if (!function_exists('easyImageValidatePostOrigin')) {
    function easyImageValidatePostOrigin() {
        $requestHost = easyImageGetRequestHost();
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $referer = $_SERVER['HTTP_REFERER'] ?? '';

        if ($origin === '' && $referer === '') {
            return true;
        }

        foreach ([$origin, $referer] as $value) {
            if ($value === '' || strtolower($value) === 'null') {
                continue;
            }

            $parsed = parse_url($value);
            $valueHost = $parsed['host'] ?? '';
            if ($valueHost === '') {
                continue;
            }

            if (easyImageIsAllowedRequestHost($valueHost, $requestHost)) {
                return true;
            }
        }

        if (function_exists('logSecurityEvent')) {
            logSecurityEvent(sprintf(
                'Origin check failed (request host: %s, origin: %s, referer: %s)',
                $requestHost,
                $origin,
                $referer
            ));
        }

        return false;
    }
}

if (!function_exists('easyImageClientError')) {
    function easyImageClientError($internalMessage, $publicMessage = 'An error occurred while processing your request.') {
        if (function_exists('logSecurityEvent')) {
            logSecurityEvent($internalMessage);
        }
        return $publicMessage;
    }
}

if (!function_exists('easyImageParseIniSize')) {
    function easyImageParseIniSize($size) {
        $size = trim((string) $size);
        if ($size === '') {
            return 0;
        }
        $unit = strtolower(substr($size, -1));
        $number = (float) $size;
        switch ($unit) {
            case 'g':
                return (int) round($number * 1024 * 1024 * 1024);
            case 'm':
                return (int) round($number * 1024 * 1024);
            case 'k':
                return (int) round($number * 1024);
            default:
                return (int) round($number);
        }
    }
}

if (!function_exists('easyImageCheckRateLimit')) {
    function easyImageCheckRateLimit($ip, $imageCount = 1) {
        // Each uploaded image is typically one HTTP request (multi-image jobs are sequential).
        // Limit by images processed per hour; request cap is a loose burst guard only.
        $maxImages = 500;
        $maxRequests = 600;
        $windowSeconds = 3600;
        $dataDir = dirname(__DIR__) . '/data';
        $file = $dataDir . '/rate_limits.json';

        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }

        $now = time();
        $key = hash('sha256', $ip);
        $store = [];

        $handle = fopen($file, 'c+');
        if (!$handle) {
            return true;
        }

        if (flock($handle, LOCK_EX)) {
            $raw = stream_get_contents($handle);
            $store = json_decode($raw, true);
            if (!is_array($store)) {
                $store = [];
            }

            if (!isset($store[$key]) || ($now - (int) ($store[$key]['window_start'] ?? 0)) >= $windowSeconds) {
                $store[$key] = [
                    'window_start' => $now,
                    'requests' => 0,
                    'images' => 0,
                ];
            }

            $store[$key]['requests'] = (int) ($store[$key]['requests'] ?? 0) + 1;
            $store[$key]['images'] = (int) ($store[$key]['images'] ?? 0) + max(1, (int) $imageCount);

            $allowed = $store[$key]['images'] <= $maxImages
                && $store[$key]['requests'] <= $maxRequests;

            foreach ($store as $entryKey => $entry) {
                if (($now - (int) ($entry['window_start'] ?? 0)) >= $windowSeconds * 2) {
                    unset($store[$entryKey]);
                }
            }

            ftruncate($handle, 0);
            rewind($handle);
            $encoded = json_encode($store, JSON_INVALID_UTF8_SUBSTITUTE);
            if ($encoded !== false) {
                fwrite($handle, $encoded);
            }
            fflush($handle);
            flock($handle, LOCK_UN);
            fclose($handle);

            return $allowed;
        }

        fclose($handle);
        return true;
    }
}

if (!function_exists('easyImageValidatePixelBudget')) {
    function easyImageValidatePixelBudget($width, $height, $fileSize) {
        $maxPixels = 50_000_000;
        $pixels = $width * $height;
        if ($pixels > $maxPixels) {
            return false;
        }
        $minBytes = (int) max(1, $pixels * 0.005);
        if ($fileSize > 0 && $fileSize < $minBytes) {
            return false;
        }
        return true;
    }
}

if (!function_exists('easyImageNormalizeEffects')) {
    function easyImageNormalizeEffects($effects) {
        if (!is_array($effects)) {
            return [];
        }

        $allowedBools = ['normalize', 'equalize', 'enhance', 'emboss', 'edge', 'charcoal'];
        $normalized = [];

        // Auto-enhance first: manual adjustments then build on the corrected base
        if (!empty($effects['autoEnhance'])) {
            $normalized['autoEnhance'] = true;
            if (isset($effects['autoEnhanceStrength'])) {
                // 100 = the full adaptive recipe; above that the blend extrapolates
                $normalized['autoEnhanceStrength'] = max(10, min(400, (int) $effects['autoEnhanceStrength']));
            }
        }

        if (isset($effects['blur'])) {
            $normalized['blur'] = max(0, min(100, (int) $effects['blur']));
        }
        if (isset($effects['sharpen'])) {
            $normalized['sharpen'] = max(0, min(100, (int) $effects['sharpen']));
        }
        if (isset($effects['brightness'])) {
            $normalized['brightness'] = max(50, min(150, (int) $effects['brightness']));
        }
        if (isset($effects['contrast'])) {
            $normalized['contrast'] = max(50, min(150, (int) $effects['contrast']));
        }
        if (isset($effects['saturation'])) {
            $normalized['saturation'] = max(50, min(150, (int) $effects['saturation']));
        }
        foreach ($allowedBools as $key) {
            if (!empty($effects[$key])) {
                $normalized[$key] = true;
            }
        }

        return $normalized;
    }
}

if (!function_exists('easyImageGenerateOutputToken')) {
    function easyImageGenerateOutputToken() {
        return bin2hex(random_bytes(4));
    }
}

if (!function_exists('easyImageSupportedFormats')) {
    /**
     * What the server's ImageMagick build can actually do. HEIC/AVIF need
     * delegate libraries that some builds (e.g. MAMP) lack, so the features
     * they power are switched on per-server at runtime.
     */
    function easyImageSupportedFormats() {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }

        $cached = ['heicInput' => false, 'avifOutput' => false];
        if (!extension_loaded('imagick') || !class_exists('Imagick', false)) {
            return $cached;
        }

        try {
            $known = Imagick::queryFormats();
            $cached['heicInput'] = in_array('HEIC', $known, true) || in_array('HEIF', $known, true);

            if (in_array('AVIF', $known, true)) {
                // Coder listed is not always writable — do a tiny write test
                try {
                    $probe = new Imagick();
                    $probe->newImage(4, 4, 'red');
                    $probe->setImageFormat('avif');
                    $cached['avifOutput'] = strlen($probe->getImageBlob()) > 0;
                    $probe->destroy();
                } catch (Throwable $e) {
                    $cached['avifOutput'] = false;
                }
            }
        } catch (Throwable $e) {
            // Leave defaults
        }

        return $cached;
    }
}

if (!function_exists('easyImagePingDimensions')) {
    /**
     * Image dimensions via Imagick ping (header-only read) for formats
     * getimagesize() cannot parse, like HEIC.
     */
    function easyImagePingDimensions($path) {
        try {
            $ping = new Imagick();
            $ping->pingImage($path);
            $dims = [(int) $ping->getImageWidth(), (int) $ping->getImageHeight()];
            $ping->destroy();
            if ($dims[0] > 0 && $dims[1] > 0) {
                return $dims;
            }
        } catch (Throwable $e) {
            // fall through
        }
        return null;
    }
}

if (!function_exists('easyImageLazyCleanup')) {
    /**
     * Fallback for when the cleanup cron is not installed: occasionally sweep
     * old output files during a processing request. Cheap (one pass, marker
     * file throttles it to once per interval) and safe to run alongside the
     * cron version.
     */
    function easyImageLazyCleanup($baseDir, $maxAgeMinutes = 30, $minIntervalSeconds = 60) {
        // Cleanup must never break a processing request (process.php promotes
        // even suppressed warnings to exceptions), so everything is guarded.
        try {
            $uploadsDir = rtrim($baseDir, '/') . '/uploads';
            if (!is_dir($uploadsDir)) {
                return;
            }

            $marker = $uploadsDir . '/.last-lazy-cleanup';
            $now = time();
            if (is_file($marker)) {
                $last = filemtime($marker);
                if ($last !== false && ($now - $last) < $minIntervalSeconds) {
                    return;
                }
            }
            // Touch first so concurrent requests skip while this one sweeps
            touch($marker);

            $cutoff = $now - ($maxAgeMinutes * 60);
            foreach (['resize', 'crop', 'optimize', 'custom'] as $subdir) {
                $dir = $uploadsDir . '/' . $subdir;
                if (!is_dir($dir)) {
                    continue;
                }
                $entries = scandir($dir);
                if ($entries === false) {
                    continue;
                }
                foreach ($entries as $entry) {
                    if ($entry === '.' || $entry === '..' || $entry === '.htaccess') {
                        continue;
                    }
                    $path = $dir . '/' . $entry;
                    try {
                        if (is_file($path) && filemtime($path) < $cutoff) {
                            unlink($path);
                        }
                    } catch (Throwable $e) {
                        // File vanished mid-sweep; ignore
                    }
                }
            }
        } catch (Throwable $e) {
            // Never let cleanup interfere with the actual request
        }
    }
}

if (!function_exists('easyImageScheduleCleanup')) {
    /**
     * Background variant: registered as soon as a request starts, the sweep
     * runs after the response is finished so the user never waits for it.
     */
    function easyImageScheduleCleanup($baseDir) {
        register_shutdown_function(function () use ($baseDir) {
            try {
                // Under PHP-FPM this releases the connection before sweeping
                if (function_exists('fastcgi_finish_request')) {
                    fastcgi_finish_request();
                }
            } catch (Throwable $e) {
                // Response is already complete; ignore
            }
            easyImageLazyCleanup($baseDir);
        });
    }
}
