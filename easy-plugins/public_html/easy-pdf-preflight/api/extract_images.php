<?php
// Easy PDF Preflight - On-Demand Image Extraction API

header('Content-Type: application/json');

// Prevent any output before JSON response
ob_start();

// Start session for image extraction tracking
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Enable error reporting but don't display errors
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Try to load Composer autoloader for PDF parser library
$composerAutoload = __DIR__ . '/../vendor/autoload.php';
if (file_exists($composerAutoload)) {
    require_once $composerAutoload;
}

// Security: Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check if file was uploaded
if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => 'No PDF file uploaded or upload error']);
    exit;
}

$file = $_FILES['pdf'];
$tmpPath = $file['tmp_name'];
$originalName = $file['name'];

// Validate file type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $tmpPath);
finfo_close($finfo);

if ($mimeType !== 'application/pdf' && !preg_match('/\.pdf$/i', $originalName)) {
    http_response_code(400);
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Please upload a PDF file.']);
    exit;
}

// Validate file size (max 50MB)
$maxSize = 50 * 1024 * 1024; // 50MB
if ($file['size'] > $maxSize) {
    http_response_code(400);
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => 'File size exceeds 50MB limit']);
    exit;
}

// Validate it's actually a PDF (check first bytes)
$handle = fopen($tmpPath, 'rb');
$header = fread($handle, 4);
fclose($handle);

if ($header !== '%PDF') {
    http_response_code(400);
    ob_end_clean();
    echo json_encode(['success' => false, 'error' => 'File is not a valid PDF']);
    exit;
}

try {
    $usePoppler = commandExists('pdfimages');
    $usePhpParser = class_exists('Smalot\PdfParser\Parser');

    if ($usePoppler) {
        $imageList = buildImageListWithPoppler($tmpPath);
        if (count($imageList) === 0) {
            ob_end_clean();
            echo json_encode([
                'success' => false,
                'error' => 'No images found in PDF',
                'errorCode' => 'NO_IMAGES'
            ]);
            exit;
        }
    } elseif ($usePhpParser) {
        // Use pure PHP PDF parser
        $parser = new \Smalot\PdfParser\Parser();
        $pdf = $parser->parseFile($tmpPath);
        $pages = $pdf->getPages();
        
        $imageList = [];
        $imageIndex = 0;
        
        foreach ($pages as $pageNum => $page) {
            $pageNumber = $pageNum + 1;
            
            try {
                // Get XObjects (images) from page using library's API
                $xObjects = $page->getXObjects();
                
                if (!empty($xObjects)) {
                    foreach ($xObjects as $xObjectName => $xObject) {
                        try {
                            // Check if it's an Image XObject
                            $subtype = $xObject->get('Subtype');
                            $isImage = false;
                            
                            // Check using instanceof (preferred method)
                            if ($xObject instanceof \Smalot\PdfParser\XObject\Image) {
                                $isImage = true;
                            } 
                            // Fallback: check Subtype property
                            elseif ($subtype) {
                                $subtypeContent = is_object($subtype) ? $subtype->getContent() : $subtype;
                                if (strtolower($subtypeContent) === 'image') {
                                    $isImage = true;
                                }
                            }
                            
                            if ($isImage) {
                                $imageIndex++;
                                
                                $xObjectDetails = $xObject->getDetails();
                                $width = isset($xObjectDetails['Width']) ? $xObjectDetails['Width'] : null;
                                $height = isset($xObjectDetails['Height']) ? $xObjectDetails['Height'] : null;
                                $colorSpace = isset($xObjectDetails['ColorSpace']) ? $xObjectDetails['ColorSpace'] : null;
                                $filter = isset($xObjectDetails['Filter']) ? $xObjectDetails['Filter'] : null;
                                
                                // Determine format from filter
                                $format = 'Unknown';
                                $fileExtension = 'jpg';
                                if ($filter) {
                                    $filterArray = is_array($filter) ? $filter : [$filter];
                                    $filterName = is_array($filterArray[0]) ? (isset($filterArray[0]['Name']) ? $filterArray[0]['Name'] : '') : (is_object($filterArray[0]) ? $filterArray[0]->getContent() : $filterArray[0]);
                                    
                                    if (stripos($filterName, 'DCTDecode') !== false) {
                                        $format = 'JPEG';
                                        $fileExtension = 'jpg';
                                    } elseif (stripos($filterName, 'JPXDecode') !== false) {
                                        $format = 'JPEG2000';
                                        $fileExtension = 'jp2';
                                    } elseif (stripos($filterName, 'CCITTFaxDecode') !== false) {
                                        $format = 'CCITT';
                                        $fileExtension = 'tiff';
                                    } elseif (stripos($filterName, 'FlateDecode') !== false) {
                                        $format = 'PNG';
                                        $fileExtension = 'png';
                                    } else {
                                        $format = ucfirst(strtolower($filterName));
                                        $fileExtension = 'jpg'; // Default
                                    }
                                }
                                
                                $colorSpaceName = 'Unknown';
                                if ($colorSpace) {
                                    if (is_array($colorSpace)) {
                                        $colorSpaceName = is_array($colorSpace[0]) ? (isset($colorSpace[0]['Name']) ? $colorSpace[0]['Name'] : '') : (is_object($colorSpace[0]) ? $colorSpace[0]->getContent() : $colorSpace[0]);
                                    } else {
                                        $colorSpaceName = is_object($colorSpace) ? $colorSpace->getContent() : $colorSpace;
                                    }
                                }
                                
                                $imageName = "img-{$pageNumber}-{$imageIndex}";
                                
                                $imageList[] = [
                                    'page' => $pageNumber,
                                    'imageNum' => $imageIndex,
                                    'format' => $format,
                                    'width' => $width ? (int)$width : null,
                                    'height' => $height ? (int)$height : null,
                                    'colorSpace' => $colorSpaceName,
                                    'dpi' => null, // PHP parser doesn't provide DPI easily
                                    'xPpi' => null,
                                    'yPpi' => null,
                                    'name' => $imageName,
                                    'xObject' => $xObject,
                                    'xObjectName' => $xObjectName,
                                    'fileExtension' => $fileExtension
                                ];
                            }
                        } catch (Exception $e) {
                            // Skip this XObject if there's an error
                            error_log('Error processing XObject ' . $xObjectName . ': ' . $e->getMessage());
                            continue;
                        }
                    }
                }
            } catch (Exception $e) {
                // Skip this page if there's an error
                error_log('Error processing page ' . $pageNumber . ': ' . $e->getMessage());
                continue;
            }
        }
        
        if (count($imageList) === 0) {
            ob_end_clean();
            echo json_encode([
                'success' => false,
                'error' => 'No images found in PDF',
                'errorCode' => 'NO_IMAGES'
            ]);
            exit;
        }

    } else {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'error' => 'PDF parser library is not installed. Please install it by running: cd ' . dirname(__DIR__) . ' && composer install',
            'errorCode' => 'LIBRARY_UNAVAILABLE',
            'installInstructions' => 'Run: composer install in the easy-pdf-preflight directory'
        ]);
        exit;
    }

    // Create session directory for extracted images
    $baseDir = __DIR__ . '/../extracted_images';
    if (!file_exists($baseDir)) {
        mkdir($baseDir, 0755, true);
        // Create .htaccess to protect directory
        $htaccessContent = "Order Deny,Allow\nDeny from all\n";
        file_put_contents($baseDir . '/.htaccess', $htaccessContent);
    }
    
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $sessionId = session_id();
    $sessionDir = $baseDir . '/' . $sessionId;
    if (!file_exists($sessionDir)) {
        mkdir($sessionDir, 0755, true);
    }
    
    // Clean up old session directories
    cleanupOldSessions($baseDir);
    
    // Extract images
    $extractedImages = [];
    
    if ($usePhpParser && !$usePoppler) {
        // Extract using PHP library
        foreach ($imageList as $index => $imageInfo) {
            $imageId = 'img_' . $sessionId . '_' . $index;
            $downloadUrl = null;
            $fileExtension = isset($imageInfo['fileExtension']) ? $imageInfo['fileExtension'] : 'jpg';
            
            try {
                $xObject = $imageInfo['xObject'];
                
                // Get image data using getContent() method (library handles stream decoding)
                $imageData = $xObject->getContent();
                
                if ($imageData && strlen($imageData) > 0) {
                    // Use file extension from image info (determined during listing)
                    $fileExtension = isset($imageInfo['fileExtension']) ? $imageInfo['fileExtension'] : 'jpg';
                    
                    // The library should handle decoding automatically
                    // For DCTDecode (JPEG), data is already in JPEG format
                    // For FlateDecode (PNG), the library decodes it
                    // For other formats, try saving as-is
                    $finalImageData = $imageData;
                    
                    // For JPEG images with DCTDecode, verify it starts with JPEG header
                    if ($fileExtension === 'jpg' && substr($finalImageData, 0, 2) !== "\xFF\xD8") {
                        // Might need to add JPEG header or handle differently
                        // Try saving as-is first
                    }
                    
                    // Save image to file
                    $newFileName = $sessionDir . '/' . $imageId . '.' . $fileExtension;
                    if (file_put_contents($newFileName, $finalImageData) !== false) {
                        $downloadUrl = 'api/extract.php?id=' . urlencode($imageId);
                    } else {
                        error_log('Failed to write image file: ' . $newFileName);
                    }
                } else {
                    error_log('Image data is empty for image ' . $index . ' (page ' . $imageInfo['page'] . ')');
                }
            } catch (Exception $e) {
                // Skip this image if extraction fails
                error_log('Failed to extract image ' . $index . ' (page ' . $imageInfo['page'] . '): ' . $e->getMessage());
            }
            
            $extractedImages[] = [
                'page' => $imageInfo['page'],
                'name' => $imageInfo['name'],
                'width' => $imageInfo['width'],
                'height' => $imageInfo['height'],
                'dpi' => $imageInfo['dpi'],
                'resolution' => $imageInfo['dpi'] ? round($imageInfo['dpi']) . ' DPI' : 'N/A',
                'format' => $imageInfo['format'],
                'colorSpace' => $imageInfo['colorSpace'],
                'downloadUrl' => $downloadUrl,
                'fileExtension' => $fileExtension,
                'imageId' => $imageId
            ];
        }
    } else {
        // Extract using poppler pdfimages
        $extractPrefix = $sessionDir . '/img';
        $extractCommand = 'pdfimages -all ' . escapeshellarg($tmpPath) . ' ' . escapeshellarg($extractPrefix) . ' 2>&1';
        $extractOutput = shell_exec($extractCommand);
        
        // Check if extraction command failed
        if ($extractOutput && (stripos($extractOutput, 'error') !== false || stripos($extractOutput, 'failed') !== false)) {
            ob_end_clean();
            echo json_encode([
                'success' => false,
                'error' => 'Image extraction failed: ' . trim($extractOutput),
                'errorCode' => 'EXTRACTION_FAILED'
            ]);
            exit;
        }
        
        // Get list of extracted files (sorted by name to match order)
        $extractedFiles = glob($extractPrefix . '*');
        sort($extractedFiles);
        
        if (empty($extractedFiles)) {
            ob_end_clean();
            echo json_encode([
                'success' => false,
                'error' => 'No images were extracted. The PDF may contain unsupported image formats.',
                'errorCode' => 'NO_FILES_EXTRACTED'
            ]);
            exit;
        }
        
        // Match extracted files with image list
        foreach ($imageList as $index => $imageInfo) {
            $imageId = 'img_' . $sessionId . '_' . $index;
            $downloadUrl = null;
            $fileExtension = 'jpg';
            
            // Determine file extension from format
            if ($imageInfo['format'] === 'jpeg' || $imageInfo['format'] === 'jpg') {
                $fileExtension = 'jpg';
            } elseif ($imageInfo['format'] === 'png') {
                $fileExtension = 'png';
            } elseif ($imageInfo['format'] === 'tiff' || $imageInfo['format'] === 'tif') {
                $fileExtension = 'tiff';
            } elseif ($imageInfo['format'] === 'jp2' || $imageInfo['format'] === 'jpx') {
                $fileExtension = 'jp2';
            } else {
                $fileExtension = 'jpg'; // Default
            }
            
            // Find the corresponding extracted file
            $extractedFile = null;
            
            // First, try to find file by expected pattern
            $expectedPatterns = [
                $extractPrefix . sprintf('-%03d', $index) . '.jpg',
                $extractPrefix . sprintf('-%03d', $index) . '.png',
                $extractPrefix . sprintf('-%03d', $index) . '.tiff',
                $extractPrefix . sprintf('-%03d', $index) . '.ppm',
                $extractPrefix . sprintf('-%03d', $index) . '.pbm',
                $extractPrefix . sprintf('-%03d', $index) . '.jp2'
            ];
            
            foreach ($expectedPatterns as $pattern) {
                if (file_exists($pattern)) {
                    $extractedFile = $pattern;
                    $fileExtension = pathinfo($pattern, PATHINFO_EXTENSION);
                    break;
                }
            }
            
            // If not found by pattern, try sequential matching from extracted files array
            if (!$extractedFile && isset($extractedFiles[$index])) {
                $extractedFile = $extractedFiles[$index];
                $fileExtension = pathinfo($extractedFile, PATHINFO_EXTENSION);
            }
            
            // If found, create download URL
            if ($extractedFile && file_exists($extractedFile)) {
                // Rename file to include image ID for easier retrieval
                $newFileName = $sessionDir . '/' . $imageId . '.' . $fileExtension;
                if (rename($extractedFile, $newFileName)) {
                    $downloadUrl = 'api/extract.php?id=' . urlencode($imageId);
                }
            }
            
            $extractedImages[] = [
                'page' => $imageInfo['page'],
                'name' => $imageInfo['name'],
                'width' => $imageInfo['width'],
                'height' => $imageInfo['height'],
                'dpi' => $imageInfo['dpi'],
                'resolution' => $imageInfo['dpi'] ? round($imageInfo['dpi']) . ' DPI' : 'N/A',
                'format' => $imageInfo['format'],
                'colorSpace' => $imageInfo['colorSpace'],
                'downloadUrl' => $downloadUrl,
                'fileExtension' => $fileExtension,
                'imageId' => $imageId
            ];
        }
    }
    
    // Validate that at least some images were extracted
    $successCount = count(array_filter($extractedImages, function($img) {
        return !empty($img['downloadUrl']);
    }));
    
    if ($successCount === 0) {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'error' => 'Images were extracted but could not be processed. Please try again.',
            'errorCode' => 'PROCESSING_FAILED'
        ]);
        exit;
    }
    
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'data' => [
            'images' => $extractedImages,
            'extractedCount' => $successCount,
            'totalCount' => count($extractedImages)
        ]
    ]);
    
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Extraction failed: ' . $e->getMessage(),
        'errorCode' => 'EXCEPTION'
    ]);
}

/**
 * Build image list using poppler pdfimages -list
 */
function buildImageListWithPoppler($filePath) {
    $imagesOutput = shell_exec('pdfimages -list ' . escapeshellarg($filePath) . ' 2>&1');
    if (!$imagesOutput) {
        throw new Exception('Could not read PDF images. The PDF may be corrupted or protected.');
    }

    $imageList = [];
    $lines = explode("\n", trim($imagesOutput));
    for ($i = 1; $i < count($lines); $i++) {
        $line = trim($lines[$i]);
        if (empty($line)) {
            continue;
        }

        $parts = preg_split('/\s+/', $line);
        if (count($parts) >= 10) {
            $page = (int)$parts[0];
            $imageNum = $parts[1] ?? 'N/A';
            $format = $parts[2] ?? 'N/A';
            $width = (int)$parts[3];
            $height = (int)$parts[4];
            $colorSpace = $parts[5] ?? 'N/A';
            $xPpi = isset($parts[11]) ? (float)$parts[11] : null;
            $yPpi = isset($parts[12]) ? (float)$parts[12] : null;
            $dpi = $xPpi && $yPpi ? ($xPpi + $yPpi) / 2 : null;

            $imageList[] = [
                'page' => $page,
                'imageNum' => $imageNum,
                'format' => $format,
                'width' => $width,
                'height' => $height,
                'colorSpace' => $colorSpace,
                'dpi' => $dpi,
                'name' => "img-{$page}-{$imageNum}"
            ];
        }
    }

    return $imageList;
}

/**
 * Clean up old session directories
 */
function cleanupOldSessions($baseDir, $maxAge = 3600) {
    // Max age in seconds (default 1 hour)
    if (!is_dir($baseDir)) {
        return;
    }
    
    $dirs = glob($baseDir . '/*', GLOB_ONLYDIR);
    $now = time();
    
    foreach ($dirs as $dir) {
        if (is_dir($dir)) {
            $mtime = filemtime($dir);
            if (($now - $mtime) > $maxAge) {
                // Delete all files in directory
                $files = glob($dir . '/*');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        @unlink($file);
                    }
                }
                // Remove directory
                @rmdir($dir);
            }
        }
    }
}

/**
 * Check if command exists
 */
function commandExists($command) {
    $whereIsCommand = (PHP_OS == 'WINNT') ? 'where' : 'which';
    $process = popen("$whereIsCommand $command", 'r');
    $result = fgets($process, 255);
    pclose($process);
    return !empty($result);
}

