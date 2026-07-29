<?php
require_once __DIR__ . '/src/security.php';
easyImageSendSecurityHeaders();

$imagickAvailable = extension_loaded('imagick') && class_exists('Imagick', false);

easyImageSendJson([
    'available' => $imagickAvailable,
    'formats' => easyImageSupportedFormats(),
]);
