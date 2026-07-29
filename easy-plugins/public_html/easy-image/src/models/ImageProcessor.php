<?php

class ImageProcessor {
    private $imagickAvailable;
    private $imagick;
    private $currentImage;
    private $qualityTier = 'lossy';
    private $quality = 70;
    private $lastOrientationDebug = null;

    public function getLastOrientationDebug() {
        return $this->lastOrientationDebug;
    }

    public function __construct() {
        $this->imagickAvailable = extension_loaded('imagick') && class_exists('Imagick', false);
    }

    public function isImagickAvailable() {
        return $this->imagickAvailable;
    }

    private function setResourceLimits() {
        if (!class_exists('Imagick')) {
            return;
        }

        // Sized for the 50MP upload cap: Q16-HDRI needs ~16 bytes/pixel (~800MB
        // at 50MP). A lower memory limit silently spills the pixel cache to
        // disk, which makes large images 10x slower and trips server timeouts.
        $resourceLimits = [
            'memory' => 1024 * 1024 * 1024,
            'map' => 2048 * 1024 * 1024,
            'disk' => 4096 * 1024 * 1024,
            'pixels' => 500000000
        ];

        if (defined('Imagick::RESOURCETYPE_MEMORY')) {
            Imagick::setResourceLimit(Imagick::RESOURCETYPE_MEMORY, $resourceLimits['memory']);
        }
        if (defined('Imagick::RESOURCETYPE_MAP')) {
            Imagick::setResourceLimit(Imagick::RESOURCETYPE_MAP, $resourceLimits['map']);
        }
        if (defined('Imagick::RESOURCETYPE_DISK')) {
            Imagick::setResourceLimit(Imagick::RESOURCETYPE_DISK, $resourceLimits['disk']);
        }
        if (defined('Imagick::RESOURCETYPE_PIXEL_CACHE')) {
            Imagick::setResourceLimit(Imagick::RESOURCETYPE_PIXEL_CACHE, $resourceLimits['pixels']);
        } elseif (defined('Imagick::RESOURCETYPE_PIXELS')) {
            Imagick::setResourceLimit(Imagick::RESOURCETYPE_PIXELS, $resourceLimits['pixels']);
        }
    }

    public function clearImage() {
        if ($this->imagick) {
            $this->imagick->clear();
            $this->imagick->destroy();
            $this->imagick = null;
        }
    }

    public function getImageWidth() {
        return $this->imagick ? (int) $this->imagick->getImageWidth() : 0;
    }

    public function getImageHeight() {
        return $this->imagick ? (int) $this->imagick->getImageHeight() : 0;
    }

    public function loadImage($imagePath) {
        $this->imagickAvailable = extension_loaded('imagick') && class_exists('Imagick', false);
        if (!$this->imagickAvailable) {
            throw new Exception(
                'Imagick extension is not loaded for this PHP process. ' .
                'Verify with check_imagick.php in the same folder as process.php.'
            );
        }

        try {
            $this->clearImage();
            $this->setResourceLimits();
            $this->imagick = new Imagick($imagePath);
            $frameCount = $this->imagick->getNumberImages();
            if ($frameCount > 1) {
                if ($frameCount > 100) {
                    $this->imagick->setIteratorIndex(0);
                    $firstFrame = $this->imagick->getImage();
                    $this->imagick->clear();
                    $this->imagick->destroy();
                    $this->imagick = $firstFrame;
                } else {
                    try {
                        $this->imagick = $this->imagick->coalesceImages();
                    } catch (Throwable $e) {
                        $this->imagick->setIteratorIndex(0);
                    }
                }
            }
            if (!class_exists('OrientationDebug')) {
                require_once __DIR__ . '/OrientationDebug.php';
            }
            if (!class_exists('OrientationNormalizer')) {
                require_once __DIR__ . '/OrientationNormalizer.php';
            }
            $this->lastOrientationDebug = OrientationNormalizer::normalizeImagick($this->imagick, $imagePath);
            $this->currentImage = $imagePath;
            return true;
        } catch (Throwable $e) {
            $this->clearImage();
            throw new Exception('Failed to load image: ' . $e->getMessage());
        }
    }

    public function resize($width = null, $height = null, $applySharpen = true, $noUpscale = false) {
        if (!$this->imagick) {
            throw new Exception('No image loaded');
        }

        try {
            $originalWidth = $this->imagick->getImageWidth();
            $originalHeight = $this->imagick->getImageHeight();

            if ($noUpscale) {
                if ($width && !$height && $width >= $originalWidth) {
                    return true;
                }
                if ($height && !$width && $height >= $originalHeight) {
                    return true;
                }
                if ($width && $height && $width >= $originalWidth && $height >= $originalHeight) {
                    return true;
                }
            }

            if ($width && $height) {
                $this->imagick->resizeImage($width, $height, Imagick::FILTER_LANCZOS, 1);
            } elseif ($width) {
                $this->imagick->resizeImage($width, 0, Imagick::FILTER_LANCZOS, 1);
            } elseif ($height) {
                $this->imagick->resizeImage(0, $height, Imagick::FILTER_LANCZOS, 1);
            }

            // Unsharp only on downscale; sharpening an upscale amplifies artifacts
            $isUpscale = $this->imagick->getImageWidth() > $originalWidth
                || $this->imagick->getImageHeight() > $originalHeight;
            if ($applySharpen && !$isUpscale && ($width || $height)) {
                $this->imagick->unsharpMaskImage(0.5, 0.5, 1.0, 0.05);
            }

            return true;
        } catch (Throwable $e) {
            throw new Exception('Resize failed: ' . $e->getMessage());
        }
    }

    /**
     * Scale to fit within a width x height box, keeping proportions.
     */
    public function resizeFit($maxWidth, $maxHeight, $noUpscale = true, $applySharpen = true) {
        if (!$this->imagick) {
            throw new Exception('No image loaded');
        }

        if ($maxWidth <= 0 || $maxHeight <= 0) {
            throw new Exception('Fit box dimensions must be greater than 0');
        }

        try {
            $originalWidth = $this->imagick->getImageWidth();
            $originalHeight = $this->imagick->getImageHeight();

            $fitsAlready = $originalWidth <= $maxWidth && $originalHeight <= $maxHeight;
            if ($noUpscale && $fitsAlready) {
                return true;
            }

            // bestfit=true keeps the aspect ratio within the box
            $this->imagick->resizeImage($maxWidth, $maxHeight, Imagick::FILTER_LANCZOS, 1, true);

            $isUpscale = $this->imagick->getImageWidth() > $originalWidth
                || $this->imagick->getImageHeight() > $originalHeight;
            if ($applySharpen && !$isUpscale) {
                $this->imagick->unsharpMaskImage(0.5, 0.5, 1.0, 0.05);
            }

            return true;
        } catch (Throwable $e) {
            throw new Exception('Resize failed: ' . $e->getMessage());
        }
    }

    public function crop($width, $height, $alignment = null, $cropData = null) {
        if (!$this->imagick) {
            throw new Exception('No image loaded');
        }

        try {
            $originalWidth = $this->imagick->getImageWidth();
            $originalHeight = $this->imagick->getImageHeight();

            if ($width <= 0 || $height <= 0) {
                throw new Exception('Crop dimensions must be greater than 0');
            }

            if (!$cropData && ($width > $originalWidth || $height > $originalHeight)) {
                $scaleX = $originalWidth / $width;
                $scaleY = $originalHeight / $height;
                $scale = min($scaleX, $scaleY);

                $newWidth = (int)($originalWidth / $scale);
                $newHeight = (int)($originalHeight / $scale);
                $this->imagick->resizeImage($newWidth, $newHeight, Imagick::FILTER_LANCZOS, 1);

                $originalWidth = $this->imagick->getImageWidth();
                $originalHeight = $this->imagick->getImageHeight();
            }

            if ($cropData) {
                $x = (int)round($cropData['x'] ?? 0);
                $y = (int)round($cropData['y'] ?? 0);
                $cropWidth = (int)round($cropData['width'] ?? $width);
                $cropHeight = (int)round($cropData['height'] ?? $height);
            } else {
                $x = 0;
                $y = 0;
                $cropWidth = $width;
                $cropHeight = $height;

                if ($alignment) {
                    switch ($alignment) {
                        case 'top-left':
                            $x = 0;
                            $y = 0;
                            break;
                        case 'top-center':
                            $x = (int)(($originalWidth - $width) / 2);
                            $y = 0;
                            break;
                        case 'top-right':
                            $x = (int)($originalWidth - $width);
                            $y = 0;
                            break;
                        case 'left-middle':
                            $x = 0;
                            $y = (int)(($originalHeight - $height) / 2);
                            break;
                        case 'center-middle':
                            $x = (int)(($originalWidth - $width) / 2);
                            $y = (int)(($originalHeight - $height) / 2);
                            break;
                        case 'right-middle':
                            $x = (int)($originalWidth - $width);
                            $y = (int)(($originalHeight - $height) / 2);
                            break;
                        case 'bottom-left':
                            $x = 0;
                            $y = (int)($originalHeight - $height);
                            break;
                        case 'bottom-center':
                            $x = (int)(($originalWidth - $width) / 2);
                            $y = (int)($originalHeight - $height);
                            break;
                        case 'bottom-right':
                            $x = (int)($originalWidth - $width);
                            $y = (int)($originalHeight - $height);
                            break;
                    }
                }
            }

            $x = max(0, min($x, $originalWidth - 1));
            $y = max(0, min($y, $originalHeight - 1));
            $cropWidth = (int) min($cropWidth, $originalWidth - $x);
            $cropHeight = (int) min($cropHeight, $originalHeight - $y);

            if ($cropWidth <= 0 || $cropHeight <= 0) {
                throw new Exception('Calculated crop area is invalid: width=' . $cropWidth . ', height=' . $cropHeight);
            }

            $this->imagick->cropImage($cropWidth, $cropHeight, (int) $x, (int) $y);
            $this->imagick->setImagePage(0, 0, 0, 0);
            return true;
        } catch (Throwable $e) {
            throw new Exception('Crop failed: ' . $e->getMessage());
        }
    }

    /**
     * Adaptive auto-enhance, chosen by a measured shootout on real photos.
     *
     * Why not autoLevelImage: it does nothing when a photo contains even one
     * pure black and one pure white pixel, which almost every real photo does
     * (the "I never see a difference" problem). linearStretchImage clips a
     * small percentile of outliers instead, so it visibly improves nearly any
     * photo. On top of that, an S-curve is added only when the photo measures
     * flat, and saturation is lifted only as much as the photo is dull.
     * autoGamma stays banned: it re-exposes photos (measured +/-40 luma).
     */
    private function applyAutoEnhance($strength = 100) {
        $strength = max(0, min(400, (int)$strength));
        if ($strength === 0) {
            return;
        }
        // Away from 100 the full recipe is blended with the original, so the
        // slider behaves linearly; above 100 the blend extrapolates past it
        $original = $strength !== 100 ? clone $this->imagick : null;

        $quantum = Imagick::getQuantum();

        // Measure BEFORE adjusting so strengths adapt to this photo
        $std = 60.0;
        $sat = 30.0;
        try {
            $channelStats = $this->imagick->getImageChannelStatistics();
            $all = $channelStats[Imagick::CHANNEL_ALL] ?? reset($channelStats);
            if (!empty($all['standardDeviation'])) {
                $std = ($all['standardDeviation'] / $quantum) * 255;
            }
        } catch (Throwable $e) {
            // Defaults keep the recipe safe
        }
        try {
            $hsl = clone $this->imagick;
            $hsl->transformImageColorspace(Imagick::COLORSPACE_HSL);
            $satMean = $hsl->getImageChannelMean(Imagick::CHANNEL_GREEN);
            $hsl->clear();
            $hsl->destroy();
            if (!empty($satMean['mean'])) {
                $sat = ($satMean['mean'] / $quantum) * 100;
            }
        } catch (Throwable $e) {
            // Defaults keep the recipe safe
        }

        // Percentile contrast stretch: clip 1% darkest, 0.5% brightest
        $pixels = $this->imagick->getImageWidth() * $this->imagick->getImageHeight();
        $this->imagick->linearStretchImage(0.010 * $pixels, 0.005 * $pixels);

        // S-curve only when the photo measures flat
        if ($std < 48) {
            $this->imagick->sigmoidalContrastImage(true, 3.0, 0.5 * $quantum);
        } elseif ($std < 62) {
            $this->imagick->sigmoidalContrastImage(true, 2.0, 0.5 * $quantum);
        }

        // Color lift scaled to how dull the photo is
        if ($sat < 20) {
            $this->imagick->modulateImage(100, 112, 100);
        } elseif ($sat < 30) {
            $this->imagick->modulateImage(100, 107, 100);
        } else {
            $this->imagick->modulateImage(100, 103, 100);
        }

        if ($original) {
            $this->imagick->setImageArtifact('compose:args', (string)(100 - $strength));
            $this->imagick->compositeImage($original, Imagick::COMPOSITE_BLEND, 0, 0);
            $original->clear();
            $original->destroy();
        }
    }

    private function mapEffectRadius($value) {
        return max(0.1, min(5.0, ((float)$value) / 20.0));
    }

    public function applyEffects($effects) {
        if (!$this->imagick) {
            throw new Exception('No image loaded');
        }

        try {
            foreach ($effects as $effect => $value) {
                switch ($effect) {
                    case 'autoEnhance':
                        if ($value) {
                            $this->applyAutoEnhance($effects['autoEnhanceStrength'] ?? 100);
                        }
                        break;
                    case 'blur':
                        if ($value > 0) {
                            $radius = $this->mapEffectRadius($value);
                            $this->imagick->blurImage($radius, $radius);
                        }
                        break;
                    case 'sharpen':
                        if ($value > 0) {
                            $radius = $this->mapEffectRadius($value);
                            $this->imagick->sharpenImage($radius, $radius);
                        }
                        break;
                    case 'brightness':
                        if ($value != 100) {
                            // modulateImage(brightness, saturation, hue)
                            $this->imagick->modulateImage($value, 100, 100);
                        }
                        break;
                    case 'contrast':
                        if ($value != 100) {
                            // brightnessContrastImage expects -100..100
                            $this->imagick->brightnessContrastImage(0, $value - 100);
                        }
                        break;
                    case 'saturation':
                        if ($value != 100) {
                            $this->imagick->modulateImage(100, $value, 100);
                        }
                        break;
                    case 'normalize':
                        if ($value) {
                            $this->imagick->normalizeImage();
                        }
                        break;
                    case 'equalize':
                        if ($value) {
                            $this->imagick->equalizeImage();
                        }
                        break;
                    case 'enhance':
                        if ($value) {
                            $this->imagick->enhanceImage();
                        }
                        break;
                    case 'emboss':
                        if ($value) {
                            $this->imagick->embossImage(1, 1);
                        }
                        break;
                    case 'edge':
                        if ($value) {
                            $this->imagick->edgeImage(1);
                        }
                        break;
                    case 'charcoal':
                        if ($value) {
                            $this->imagick->charcoalImage(1, 1);
                        }
                        break;
                }
            }
            return true;
        } catch (Throwable $e) {
            throw new Exception('Effect application failed: ' . $e->getMessage());
        }
    }

    public function setQuality($quality) {
        if (!$this->imagick) {
            throw new Exception('No image loaded');
        }

        $this->quality = max(1, min(100, (int)$quality));

        try {
            $this->imagick->setImageCompressionQuality($this->quality);
            return true;
        } catch (Throwable $e) {
            throw new Exception('Quality setting failed: ' . $e->getMessage());
        }
    }

    public function setQualityTier($tier) {
        $allowed = ['lossy', 'near-lossless', 'lossless'];
        $this->qualityTier = in_array($tier, $allowed, true) ? $tier : 'lossy';
    }

    private function activateAlphaChannelIfAvailable() {
        if (!$this->imagick || !$this->imagick->getImageAlphaChannel()) {
            return;
        }

        try {
            if (defined('Imagick::ALPHACHANNEL_ACTIVATE')) {
                $this->imagick->setImageAlphaChannel(Imagick::ALPHACHANNEL_ACTIVATE);
            } elseif (defined('Imagick::ALPHACHANNEL_ON')) {
                $this->imagick->setImageAlphaChannel(Imagick::ALPHACHANNEL_ON);
            }
        } catch (Throwable $e) {
            // Alpha not supported for this image type
        }
    }

    /**
     * Normalize color for RGB output formats and drop metadata.
     * - CMYK sources are converted to sRGB (raw CMYK channels render wrong in webp/png/jpeg).
     * - Wide-gamut RGB sources keep their ICC profile so colors stay correct.
     * - EXIF/XMP/GPS metadata is stripped (orientation is already baked into pixels).
     */
    private function normalizeColorAndMetadata() {
        try {
            $colorspace = $this->imagick->getImageColorspace();
            $isCmyk = defined('Imagick::COLORSPACE_CMYK') && $colorspace === Imagick::COLORSPACE_CMYK;

            $iccProfile = null;
            if (!$isCmyk) {
                try {
                    $profiles = $this->imagick->getImageProfiles('icc', true);
                    if (!empty($profiles['icc'])) {
                        $iccProfile = $profiles['icc'];
                    }
                } catch (Throwable $e) {
                    $iccProfile = null;
                }
            }

            if ($isCmyk && defined('Imagick::COLORSPACE_SRGB')) {
                $this->imagick->transformImageColorspace(Imagick::COLORSPACE_SRGB);
            }

            $this->imagick->stripImage();

            if ($iccProfile !== null) {
                // setImageProfile, not profileImage: the latter silently drops the
                // profile on ImageMagick 7 after a strip
                $this->imagick->setImageProfile('icc', $iccProfile);
            }
        } catch (Throwable $e) {
            // Best-effort: saving proceeds with the image as-is
        }
    }

    private function flattenAlphaForJpeg() {
        if (!$this->imagick->getImageAlphaChannel()) {
            return;
        }

        try {
            $this->imagick->setImageBackgroundColor(new ImagickPixel('#ffffff'));
            if (defined('Imagick::ALPHACHANNEL_REMOVE')) {
                $this->imagick->setImageAlphaChannel(Imagick::ALPHACHANNEL_REMOVE);
            }
        } catch (Throwable $e) {
            // JPEG writer will drop alpha on its own if this fails
        }
    }

    /**
     * WebP encode effort by output size. Methods >= 3 enable extra optimization
     * passes whose cost explodes on large images (measured on a 40MP photo:
     * method 2 = 17s, method 3/4 = ~198s, method 6 = 322s) and trip server
     * timeouts, while the payoff is only ~5% file size at identical visual
     * quality (PSNR 44dB between method 2 and 4 at the same q). Keep maximum
     * effort for small images where it is cheap.
     */
    private function webpMethodForSize() {
        $pixels = $this->imagick->getImageWidth() * $this->imagick->getImageHeight();
        if ($pixels > 12_000_000) {
            return '1';
        }
        if ($pixels > 2_000_000) {
            return '2';
        }
        return '6';
    }

    private function prepareForOutput($format) {
        $format = strtolower($format);

        $this->normalizeColorAndMetadata();

        switch ($format) {
            case 'webp':
                $this->imagick->setImageFormat('webp');
                $this->imagick->setOption('webp:method', $this->webpMethodForSize());

                if ($this->qualityTier === 'lossless') {
                    $this->imagick->setOption('webp:lossless', 'true');
                } elseif ($this->qualityTier === 'near-lossless') {
                    $this->imagick->setOption('webp:near-lossless', '90');
                    $this->imagick->setImageCompressionQuality($this->quality);
                } else {
                    $this->imagick->setImageCompressionQuality($this->quality);
                }

                if ($this->imagick->getImageAlphaChannel()) {
                    $this->imagick->setOption('webp:alpha-quality', '100');
                    $this->activateAlphaChannelIfAvailable();
                }
                break;

            case 'jpg':
            case 'jpeg':
                $this->flattenAlphaForJpeg();
                $this->imagick->setImageFormat('jpeg');
                $this->imagick->setImageCompressionQuality($this->quality);
                if ($this->quality >= 85) {
                    $this->imagick->setOption('jpeg:sampling-factor', '4:4:4');
                }
                if (defined('Imagick::INTERLACE_PLANE')) {
                    $this->imagick->setInterlaceScheme(Imagick::INTERLACE_PLANE);
                }
                break;

            case 'png':
                $this->imagick->setImageFormat('png');
                $this->imagick->setOption('png:compression-level', '9');
                $this->activateAlphaChannelIfAvailable();
                break;

            case 'avif':
                $this->imagick->setImageFormat('avif');
                $this->imagick->setImageCompressionQuality($this->quality);
                if ($this->imagick->getImageAlphaChannel()) {
                    $this->activateAlphaChannelIfAvailable();
                }
                break;

            default:
                $this->flattenAlphaForJpeg();
                $this->imagick->setImageFormat('jpeg');
                $this->imagick->setImageCompressionQuality($this->quality);
        }
    }

    public function save($outputPath, $format = 'jpg') {
        if (!$this->imagick) {
            throw new Exception('No image loaded');
        }

        try {
            $this->prepareForOutput($format);
            $this->imagick->writeImage($outputPath);
            return true;
        } catch (Throwable $e) {
            throw new Exception('Save failed: ' . $e->getMessage());
        }
    }

    /**
     * Encode aiming for a maximum file size by binary-searching the quality
     * (lossy formats only). Returns the quality used, or null when the target
     * could not be met even at the minimum quality — the smallest result is
     * written in that case.
     */
    public function saveWithTargetSize($outputPath, $format, $targetBytes) {
        if (!$this->imagick) {
            throw new Exception('No image loaded');
        }

        $format = strtolower($format);
        if ($targetBytes <= 0 || !in_array($format, ['jpg', 'jpeg', 'webp', 'avif'], true)) {
            $this->save($outputPath, $format);
            return $this->quality;
        }

        try {
            $low = 20;
            $high = 95;
            $bestQuality = null;
            $bestBlob = null;
            $smallestBlob = null;

            for ($i = 0; $i < 7 && $low <= $high; $i++) {
                $q = (int) floor(($low + $high) / 2);
                $this->quality = $q;
                $this->prepareForOutput($format);
                $blob = $this->imagick->getImageBlob();
                $size = strlen($blob);

                if ($smallestBlob === null || $size < strlen($smallestBlob)) {
                    $smallestBlob = $blob;
                }

                if ($size <= $targetBytes) {
                    // Fits — try a higher quality
                    $bestQuality = $q;
                    $bestBlob = $blob;
                    $low = $q + 1;
                } else {
                    $high = $q - 1;
                }
            }

            if ($bestBlob !== null) {
                file_put_contents($outputPath, $bestBlob);
                return $bestQuality;
            }

            // Target unreachable: write the smallest attempt
            file_put_contents($outputPath, $smallestBlob);
            return null;
        } catch (Throwable $e) {
            throw new Exception('Save failed: ' . $e->getMessage());
        }
    }

    public function destroy() {
        $this->clearImage();
    }
}
