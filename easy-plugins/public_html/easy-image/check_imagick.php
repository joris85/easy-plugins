<?php
header('Content-Type: application/json');

echo json_encode([
    'available' => extension_loaded('imagick')
]); 