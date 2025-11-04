<?php

class ImageProcessor {
    private $imagickAvailable;
    private $imagick;
    private $currentImage;
    
    public function __construct() {
        // Check if Imagick is available
        if (!extension_loaded('imagick')) {
            // Don't throw exception in constructor, check in methods instead
            $this->imagickAvailable = false;
        } else {
            $this->imagickAvailable = true;
        }
    }
    
    public function loadImage($imagePath) {
        if (!$this->imagickAvailable) {
            throw new Exception('Imagick extension is not loaded');
        }
        
        try {
            $this->imagick = new Imagick($imagePath);
            $this->currentImage = $imagePath;
            return true;
        } catch (Exception $e) {
            throw new Exception('Failed to load image: ' . $e->getMessage());
        }
    }
    
    public function resize($width = null, $height = null) {
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
            return true;
        } catch (Exception $e) {
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
            
            if ($cropData) {
                // Manual crop with specific coordinates
                $x = $cropData['x'] ?? 0;
                $y = $cropData['y'] ?? 0;
            } else {
                // Automatic crop with alignment
                $x = 0;
                $y = 0;
                
                if ($alignment) {
                    switch ($alignment) {
                        case 'top-left':
                            $x = 0;
                            $y = 0;
                            break;
                        case 'top-center':
                            $x = ($originalWidth - $width) / 2;
                            $y = 0;
                            break;
                        case 'top-right':
                            $x = $originalWidth - $width;
                            $y = 0;
                            break;
                        case 'left-middle':
                            $x = 0;
                            $y = ($originalHeight - $height) / 2;
                            break;
                        case 'center-middle':
                            $x = ($originalWidth - $width) / 2;
                            $y = ($originalHeight - $height) / 2;
                            break;
                        case 'right-middle':
                            $x = $originalWidth - $width;
                            $y = ($originalHeight - $height) / 2;
                            break;
                        case 'bottom-left':
                            $x = 0;
                            $y = $originalHeight - $height;
                            break;
                        case 'bottom-center':
                            $x = ($originalWidth - $width) / 2;
                            $y = $originalHeight - $height;
                            break;
                        case 'bottom-right':
                            $x = $originalWidth - $width;
                            $y = $originalHeight - $height;
                            break;
                    }
                }
            }
            
            // Ensure crop area is within image bounds
            $x = max(0, min($x, $originalWidth - $width));
            $y = max(0, min($y, $originalHeight - $height));
            $width = min($width, $originalWidth - $x);
            $height = min($height, $originalHeight - $y);
            
            $this->imagick->cropImage($width, $height, $x, $y);
            return true;
        } catch (Exception $e) {
            throw new Exception('Crop failed: ' . $e->getMessage());
        }
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
                            $this->imagick->blurImage($value, $value);
                        }
                        break;
                    case 'sharpen':
                        if ($value > 0) {
                            $this->imagick->sharpenImage($value, $value);
                        }
                        break;
                    case 'brightness':
                        // Only apply brightness if value is not 100 (normal)
                        if ($value != 100) {
                            // Convert percentage to brightness adjustment
                            // 100% = normal (no change), 0% = very dark, 200% = very bright
                            $brightnessValue = $value; // Direct percentage value
                            $this->imagick->modulateImage(100, 100, $brightnessValue);
                        }
                        break;
                    case 'contrast':
                        // Only apply contrast if value is not 100 (normal)
                        if ($value != 100) {
                            // Convert percentage to contrast adjustment
                            // 100% = normal (no change), 0% = no contrast, 200% = double contrast
                            $contrastValue = $value; // Direct percentage value
                            $this->imagick->modulateImage($contrastValue, 100, 100);
                        }
                        break;
                    case 'saturation':
                        // Only apply saturation if value is not 100 (normal)
                        if ($value != 100) {
                            // Convert percentage to saturation adjustment
                            // 100% = normal (no change), 0% = grayscale, 200% = double saturation
                            $saturationValue = $value; // Direct percentage value
                            $this->imagick->modulateImage(100, $saturationValue, 100);
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
        } catch (Exception $e) {
            throw new Exception('Effect application failed: ' . $e->getMessage());
        }
    }
    
    public function setQuality($quality) {
        if (!$this->imagick) {
            throw new Exception('No image loaded');
        }
        
        try {
            $this->imagick->setImageCompressionQuality($quality);
            return true;
        } catch (Exception $e) {
            throw new Exception('Quality setting failed: ' . $e->getMessage());
        }
    }
    
    public function save($outputPath, $format = 'jpg') {
        if (!$this->imagick) {
            throw new Exception('No image loaded');
        }
        
        try {
            // Set format
            switch (strtolower($format)) {
                case 'jpg':
                case 'jpeg':
                    $this->imagick->setImageFormat('jpeg');
                    break;
                case 'png':
                    $this->imagick->setImageFormat('png');
                    break;
                case 'webp':
                    $this->imagick->setImageFormat('webp');
                    break;
                default:
                    $this->imagick->setImageFormat('jpeg');
            }
            
            $this->imagick->writeImage($outputPath);
            return true;
        } catch (Exception $e) {
            throw new Exception('Save failed: ' . $e->getMessage());
        }
    }
    
    public function destroy() {
        if ($this->imagick) {
            $this->imagick->destroy();
            $this->imagick = null;
        }
    }
}
