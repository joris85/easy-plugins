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

        $resourceLimits = [
            'memory' => 512 * 1024 * 1024,
            'map' => 512 * 1024 * 1024,
            'disk' => 1024 * 1024 * 1024,
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

    public function resize($width = null, $height = null, $applySharpen = true) {
        if (!$this->imagick) {
            throw new Exception('No image loaded');
        }

        try {
            if ($width && $height) {
                $this->imagick->resizeImage($width, $height, Imagick::FILTER_LANCZOS, 1);
            } elseif ($width) {
                $this->imagick->resizeImage($width, 0, Imagick::FILTER_LANCZOS, 1);
            } elseif ($height) {
                $this->imagick->resizeImage(0, $height, Imagick::FILTER_LANCZOS, 1);
            }

            if ($applySharpen && ($width || $height)) {
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
                            $this->imagick->modulateImage(100, 100, $value);
                        }
                        break;
                    case 'contrast':
                        if ($value != 100) {
                            $this->imagick->modulateImage($value, 100, 100);
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

    private function prepareForOutput($format) {
        $format = strtolower($format);

        switch ($format) {
            case 'webp':
                $this->imagick->setImageFormat('webp');
                $this->imagick->setOption('webp:method', '6');

                if ($this->qualityTier === 'lossless') {
                    $this->imagick->setOption('webp:lossless', 'true');
                } elseif ($this->qualityTier === 'near-lossless') {
                    $this->imagick->setOption('webp:near-lossless', '90');
                    $this->imagick->setImageCompressionQuality($this->quality);
                } else {
                    $this->imagick->setImageCompressionQuality($this->quality);
                }

                if ($this->imagick->getImageAlphaChannel()) {
                    $this->activateAlphaChannelIfAvailable();
                }
                break;

            case 'jpg':
            case 'jpeg':
                $this->imagick->setImageFormat('jpeg');
                $this->imagick->setImageCompressionQuality($this->quality);
                if ($this->quality >= 90) {
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

            default:
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

    public function destroy() {
        $this->clearImage();
    }
}
