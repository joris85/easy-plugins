<?php

/**
 * Normalize EXIF orientation into display-ready pixels (browser-aligned).
 * MAMP Imagick may lack autoOrientImage(); uses manual transforms.
 */
class OrientationNormalizer {
    private const ORIENT_TOPLEFT = 1;
    private const ORIENT_TOPRIGHT = 2;
    private const ORIENT_BOTTOMRIGHT = 3;
    private const ORIENT_BOTTOMLEFT = 4;
    private const ORIENT_LEFTTOP = 5;
    private const ORIENT_RIGHTTOP = 6;
    private const ORIENT_RIGHTBOTTOM = 7;
    private const ORIENT_LEFTBOTTOM = 8;

    private static $lastReport = null;

    public static function getLastReport() {
        return self::$lastReport;
    }

    public static function orientationLabel($value) {
        $map = [
            self::ORIENT_TOPLEFT => '1 (top-left)',
            self::ORIENT_TOPRIGHT => '2 (top-right)',
            self::ORIENT_BOTTOMRIGHT => '3 (180°)',
            self::ORIENT_LEFTTOP => '5 (left-top)',
            self::ORIENT_RIGHTTOP => '6 (90° CW)',
            self::ORIENT_RIGHTBOTTOM => '7 (right-bottom)',
            self::ORIENT_LEFTBOTTOM => '8 (90° CCW)',
        ];
        return $map[(int) $value] ?? (string) $value;
    }

    private static function supportsExifRead($sourcePath) {
        if (!$sourcePath) {
            return false;
        }

        $extension = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
        return in_array($extension, ['jpg', 'jpeg', 'tif', 'tiff'], true);
    }

    private static function readExifOrientation($sourcePath) {
        if (!self::supportsExifRead($sourcePath) || !function_exists('exif_read_data')) {
            return null;
        }

        try {
            $exif = @exif_read_data($sourcePath);
            if (is_array($exif) && !empty($exif['Orientation'])) {
                return (int) $exif['Orientation'];
            }
        } catch (Throwable $e) {
            return null;
        }

        return null;
    }

    public static function normalizeImagick(Imagick $image, $sourcePath = null) {
        $exifOrientation = self::readExifOrientation($sourcePath);

        $imagickOrientBefore = (int) $image->getImageOrientation();
        $widthBefore = (int) $image->getImageWidth();
        $heightBefore = (int) $image->getImageHeight();
        $orientation = self::readOrientation($image, $sourcePath);

        $report = [
            'file' => $sourcePath ? basename($sourcePath) : 'unknown',
            'exif_orientation' => $exifOrientation,
            'exif_orientation_label' => $exifOrientation ? self::orientationLabel($exifOrientation) : 'none',
            'imagick_orientation_before' => $imagickOrientBefore,
            'imagick_orientation_before_label' => self::orientationLabel($imagickOrientBefore),
            'orientation_used' => $orientation,
            'orientation_used_label' => self::orientationLabel($orientation),
            'dimensions_before' => "{$widthBefore}x{$heightBefore}",
            'autoOrientImage_available' => method_exists($image, 'autoOrientImage'),
            'normalize_reason' => null,
            'pixels_rotated' => false,
            'dimensions_after' => null,
            'imagick_orientation_after' => null,
        ];

        if ($orientation <= self::ORIENT_TOPLEFT) {
            $report['normalize_reason'] = 'orientation already 1 — no transform';
            self::finalizeOrientation($image);
            $report['dimensions_after'] = $image->getImageWidth() . 'x' . $image->getImageHeight();
            $report['imagick_orientation_after'] = (int) $image->getImageOrientation();
            self::$lastReport = $report;
            return $report;
        }

        self::applyPixelOrientation($image, $orientation);
        $report['pixels_rotated'] = true;
        $report['normalize_reason'] = 'baking EXIF orientation into pixels (browser-aligned)';

        self::finalizeOrientation($image);
        $report['dimensions_after'] = $image->getImageWidth() . 'x' . $image->getImageHeight();
        $report['imagick_orientation_after'] = (int) $image->getImageOrientation();

        self::$lastReport = $report;
        return $report;
    }

    private static function readOrientation(Imagick $image, $sourcePath) {
        $orientation = (int) $image->getImageOrientation();

        if ($orientation > 0) {
            return $orientation;
        }

        $exifOrientation = self::readExifOrientation($sourcePath);
        if ($exifOrientation !== null) {
            return $exifOrientation;
        }

        return self::ORIENT_TOPLEFT;
    }

    private static function applyPixelOrientation(Imagick $image, $orientation) {
        $background = new ImagickPixel('white');

        switch ($orientation) {
            case self::ORIENT_TOPRIGHT:
                $image->flopImage();
                break;
            case self::ORIENT_BOTTOMRIGHT:
                $image->rotateImage($background, 180);
                break;
            case self::ORIENT_BOTTOMLEFT:
                $image->flopImage();
                $image->rotateImage($background, 180);
                break;
            case self::ORIENT_LEFTTOP:
                $image->flopImage();
                $image->rotateImage($background, -90);
                break;
            case self::ORIENT_RIGHTTOP:
                $image->rotateImage($background, 90);
                break;
            case self::ORIENT_RIGHTBOTTOM:
                $image->flopImage();
                $image->rotateImage($background, 90);
                break;
            case self::ORIENT_LEFTBOTTOM:
                $image->rotateImage($background, -90);
                break;
            default:
                break;
        }
    }

    private static function finalizeOrientation(Imagick $image) {
        if (defined('Imagick::ORIENTATION_TOPLEFT')) {
            $image->setImageOrientation(Imagick::ORIENTATION_TOPLEFT);
        }

        if (method_exists($image, 'setImagePage')) {
            $image->setImagePage(0, 0, 0, 0);
        }
    }
}
