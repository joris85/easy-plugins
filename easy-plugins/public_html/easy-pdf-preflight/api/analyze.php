<?php
// Easy PDF Preflight - Server-side Analysis API

header('Content-Type: application/json');

// Prevent any output before JSON response
ob_start();

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
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Check if file was uploaded
if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
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
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Please upload a PDF file.']);
    exit;
}

// Validate file size (max 50MB)
$maxSize = 50 * 1024 * 1024; // 50MB
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File size exceeds 50MB limit']);
    exit;
}

// Validate it's actually a PDF (check first bytes)
$handle = fopen($tmpPath, 'rb');
$header = fread($handle, 4);
fclose($handle);

if ($header !== '%PDF') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File is not a valid PDF']);
    exit;
}

try {
    $analysis = analyzePDF($tmpPath);
    
    // Ensure all required fields are present
    if (!isset($analysis['fonts']) || !is_array($analysis['fonts'])) {
        $analysis['fonts'] = [];
    }
    if (!isset($analysis['images']) || !is_array($analysis['images'])) {
        $analysis['images'] = [];
    }
    if (!isset($analysis['metadata']) || !is_array($analysis['metadata'])) {
        $analysis['metadata'] = [];
    }
    if (!isset($analysis['numPages'])) {
        $analysis['numPages'] = 0;
    }
    if (!isset($analysis['pdfVersion'])) {
        $analysis['pdfVersion'] = 'N/A';
    }
    
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'data' => $analysis
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Analysis failed: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Analysis failed: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Analyze PDF file
 */
function analyzePDF($filePath) {
    $defaults = [
        'numPages' => 0,
        'pdfVersion' => 'N/A',
        'metadata' => [],
        'fonts' => [],
        'images' => []
    ];

    if (class_exists('Smalot\PdfParser\Parser')) {
        try {
            $analysis = array_merge($defaults, analyzeWithPdfParser($filePath));
            $analysis = enrichAnalysisWithDpi($filePath, $analysis);
            if (commandExists('pdfinfo')) {
                $analysis = mergePopplerEnrichment($analysis, analyzeWithPoppler($filePath));
            }
            return normalizeAnalysis($analysis);
        } catch (\Exception $e) {
            error_log('PDF Parser Error: ' . $e->getMessage());
        }
    }

    if (commandExists('pdfinfo')) {
        return normalizeAnalysis(analyzeWithPoppler($filePath));
    }

    $autoloadPath = __DIR__ . '/../vendor/autoload.php';
    if (!file_exists($autoloadPath) && !commandExists('pdfinfo')) {
        throw new Exception('PDF parser library not found. Please run: composer install in the easy-pdf-preflight directory');
    }

    return normalizeAnalysis(analyzeWithPHP($filePath));
}

function normalizeAnalysis($analysis) {
    if (!isset($analysis['fonts']) || !is_array($analysis['fonts'])) {
        $analysis['fonts'] = [];
    }
    if (!isset($analysis['images']) || !is_array($analysis['images'])) {
        $analysis['images'] = [];
    }
    if (!isset($analysis['metadata']) || !is_array($analysis['metadata'])) {
        $analysis['metadata'] = [];
    }
    if (!isset($analysis['numPages'])) {
        $analysis['numPages'] = 0;
    }
    if (!isset($analysis['pdfVersion'])) {
        $analysis['pdfVersion'] = 'N/A';
    }
    return $analysis;
}

function enrichAnalysisWithDpi($filePath, $analysis) {
    if (empty($analysis['images']) || ($analysis['numPages'] ?? 0) <= 0) {
        return $analysis;
    }

    $ppiData = calculatePPIWithPdfParser($filePath, $analysis['images'], $analysis['numPages']);
    foreach ($analysis['images'] as &$image) {
        $imageName = $image['name'] ?? '';
        if ($imageName && isset($ppiData[$imageName])) {
            $image = array_merge($image, $ppiData[$imageName]);
        }
    }
    unset($image);

    return $analysis;
}

function mergePopplerEnrichment($analysis, $popplerResult) {
    if (empty($popplerResult)) {
        return $analysis;
    }

    if (($analysis['numPages'] ?? 0) <= 0 && !empty($popplerResult['numPages'])) {
        $analysis['numPages'] = $popplerResult['numPages'];
    }
    if (($analysis['pdfVersion'] ?? 'N/A') === 'N/A' && !empty($popplerResult['pdfVersion'])) {
        $analysis['pdfVersion'] = $popplerResult['pdfVersion'];
    }
    if (empty($analysis['metadata']) && !empty($popplerResult['metadata'])) {
        $analysis['metadata'] = $popplerResult['metadata'];
    }

    if (empty($analysis['fonts']) && !empty($popplerResult['fonts'])) {
        $analysis['fonts'] = $popplerResult['fonts'];
    }

    if (!empty($popplerResult['images'])) {
        $popplerByKey = [];
        foreach ($popplerResult['images'] as $img) {
            $key = ($img['page'] ?? 0) . '-' . ($img['width'] ?? 0) . 'x' . ($img['height'] ?? 0);
            $popplerByKey[$key] = $img;
        }
        foreach ($analysis['images'] as &$image) {
            $key = ($image['page'] ?? 0) . '-' . ($image['width'] ?? 0) . 'x' . ($image['height'] ?? 0);
            if (isset($popplerByKey[$key])) {
                $popplerImage = $popplerByKey[$key];
                if (!empty($popplerImage['dpi'])) {
                    $image['dpi'] = $popplerImage['dpi'];
                    $image['resolution'] = $popplerImage['resolution'];
                }
                if (($image['format'] ?? 'Unknown') === 'Unknown' && !empty($popplerImage['format'])) {
                    $image['format'] = $popplerImage['format'];
                }
            }
        }
        unset($image);

        if (empty($analysis['images'])) {
            $analysis['images'] = $popplerResult['images'];
        }
    }

    return $analysis;
}

/**
 * Analyze PDF using smalot/pdfparser library
 */
function analyzeWithPdfParser($filePath) {
    $result = [
        'numPages' => 0,
        'pdfVersion' => 'N/A',
        'metadata' => [],
        'fonts' => [],
        'images' => []
    ];
    
    if (!class_exists('Smalot\PdfParser\Parser')) {
        return $result;
    }
    
    try {
        // Create parser instance
        $parser = new \Smalot\PdfParser\Parser();
        
        // Parse the PDF file
        if (!file_exists($filePath)) {
            throw new \Exception("PDF file not found: {$filePath}");
        }
        
        $pdf = $parser->parseFile($filePath);
        
        if (!$pdf) {
            throw new \Exception("Failed to parse PDF file");
        }
        
        $pages = $pdf->getPages();
        
        if (empty($pages)) {
            // PDF parsed but no pages found - still return basic info
            return $result;
        }
        
        // Get PDF version
        $header = $pdf->getHeader();
        if ($header) {
            $version = $header->getVersion();
            if ($version) {
                $result['pdfVersion'] = $version;
            }
        }
        
        // Get page count
        $result['numPages'] = count($pages);
        
        // Get metadata
        $details = $pdf->getDetails();
        if ($details) {
            // Map various possible field names to our standard keys
            $metadataMapping = [
                'title' => ['Title', 'dc:title'],
                'author' => ['Author', 'dc:creator'],
                'subject' => ['Subject', 'dc:subject'],
                'creator' => ['Creator'],
                'producer' => ['Producer', 'pdf:producer'],
                'creationDate' => ['CreationDate', 'CreatedOn', 'dc:date'],
                'modificationDate' => ['ModDate', 'ModifiedOn']
            ];
            
            foreach ($metadataMapping as $key => $possibleFields) {
                foreach ($possibleFields as $field) {
                    if (isset($details[$field])) {
                        $value = $details[$field];
                        // Handle date fields
                        if (strpos($key, 'Date') !== false) {
                            $value = formatPDFDate($value);
                        }
                        $result['metadata'][$key] = $value;
                        break; // Use first match
                    }
                }
            }
        }
        
        // Extract fonts and images from each page
        $fontMap = []; // Track unique fonts by name
        $imageMap = []; // Track unique images by name
        
        foreach ($pages as $pageIndex => $page) {
            $pageNumber = $pageIndex + 1;
            
            // Extract fonts from this page
            try {
                $fonts = $page->getFonts();
                if (!empty($fonts)) {
                    foreach ($fonts as $fontId => $font) {
                        if (!($font instanceof \Smalot\PdfParser\Font)) {
                            continue;
                        }
                        
                        // Get font name (avoid duplicates)
                        $fontName = null;
                        $fontType = 'Unknown';
                        $isEmbedded = false;
                        $isSubset = false;
                        
                        try {
                            // Get font name - try multiple methods
                            $fontName = $font->getName();
                            if ($fontName === '[Unknown]' || empty($fontName)) {
                                $fontDetails = $font->getDetails();
                                if (isset($fontDetails['BaseFont'])) {
                                    $fontName = $fontDetails['BaseFont'];
                                } elseif (isset($fontDetails['Name'])) {
                                    $fontName = $fontDetails['Name'];
                                } elseif (isset($fontDetails['FontName'])) {
                                    $fontName = $fontDetails['FontName'];
                                }
                            }
                            
                            // Check for subset prefix (6 uppercase letters + +)
                            if ($fontName && preg_match('/^[A-Z]{6}\+(.+)$/', $fontName, $matches)) {
                                $isSubset = true;
                                $isEmbedded = true;
                                $fontName = $matches[1];
                            }
                            
                            // Get font type
                            $fontType = $font->getType();
                            if (empty($fontType) || $fontType === 'Unknown') {
                                $fontDetails = $font->getDetails();
                                if (isset($fontDetails['Subtype'])) {
                                    $subtype = $fontDetails['Subtype'];
                                    $fontType = is_object($subtype) ? $subtype->getContent() : $subtype;
                                }
                            }
                            
                            // Check if embedded - comprehensive check
                            // Method 1: Check font header directly
                            if ($font->has('FontFile') || $font->has('FontFile2') || $font->has('FontFile3')) {
                                $isEmbedded = true;
                            } else {
                                // Method 2: Check font details
                                $fontDetails = $font->getDetails();
                                if (isset($fontDetails['FontFile']) || isset($fontDetails['FontFile2']) || isset($fontDetails['FontFile3'])) {
                                    $isEmbedded = true;
                                } else {
                                    // Method 3: Check FontDescriptor
                                    try {
                                        if ($font->has('FontDescriptor')) {
                                            $fontDescriptor = $font->get('FontDescriptor');
                                            if ($fontDescriptor) {
                                                // Check FontDescriptor header
                                                if (method_exists($fontDescriptor, 'has')) {
                                                    if ($fontDescriptor->has('FontFile') || $fontDescriptor->has('FontFile2') || $fontDescriptor->has('FontFile3')) {
                                                        $isEmbedded = true;
                                                    }
                                                }
                                                // Check FontDescriptor details
                                                if (!$isEmbedded) {
                                                    $descriptorDetails = $fontDescriptor->getDetails();
                                                    if (isset($descriptorDetails['FontFile']) || isset($descriptorDetails['FontFile2']) || isset($descriptorDetails['FontFile3'])) {
                                                        $isEmbedded = true;
                                                    }
                                                }
                                            }
                                        }
                                    } catch (\Exception $e) {
                                        // FontDescriptor might not exist, continue
                                    }
                                }
                            }
                            
                            // Add font if we have a valid name and haven't seen it before
                            if ($fontName && $fontName !== '[Unknown]' && !empty($fontName)) {
                                // Use normalized name as key (remove subset prefix if present)
                                $normalizedName = preg_replace('/^[A-Z]{6}\+/', '', $fontName);
                                if (!isset($fontMap[$normalizedName])) {
                                    $fontMap[$normalizedName] = true;
                                    $result['fonts'][] = [
                                        'name' => $fontName,
                                        'type' => $fontType ?: 'Unknown',
                                        'embedded' => (bool)$isEmbedded,
                                        'subset' => (bool)$isSubset
                                    ];
                                }
                            }
                        } catch (\Exception $e) {
                            // Skip this font if we can't process it
                            continue;
                        }
                    }
                }
            } catch (\Exception $e) {
                // Continue if font extraction fails for this page
            }
            
            // Extract images from this page
            try {
                $xObjects = $page->getXObjects();
                if (!empty($xObjects)) {
                    $imageIndex = 0;
                    foreach ($xObjects as $xObjectName => $xObject) {
                        // Create unique key per page to allow same image name on different pages
                        $imageKey = "{$pageNumber}-{$xObjectName}";
                        if (isset($imageMap[$imageKey])) {
                            continue;
                        }
                        
                        try {
                            // Check if it's an Image XObject
                            $isImage = false;
                            
                            // Method 1: Check using instanceof (preferred)
                            if ($xObject instanceof \Smalot\PdfParser\XObject\Image) {
                                $isImage = true;
                            } else {
                                // Method 2: Check Subtype property
                                if (method_exists($xObject, 'get')) {
                                    $subtype = $xObject->get('Subtype');
                                    if ($subtype) {
                                        $subtypeContent = is_object($subtype) ? $subtype->getContent() : $subtype;
                                        if (strtolower($subtypeContent) === 'image') {
                                            $isImage = true;
                                        }
                                    }
                                }
                            }
                            
                            if ($isImage) {
                                $imageMap[$imageKey] = true;
                                $imageIndex++;
                                
                                $imageDetails = $xObject->getDetails();
                                $width = isset($imageDetails['Width']) ? (int)$imageDetails['Width'] : null;
                                $height = isset($imageDetails['Height']) ? (int)$imageDetails['Height'] : null;
                                
                                // Get format from Filter
                                $format = 'Unknown';
                                if (isset($imageDetails['Filter'])) {
                                    $filter = $imageDetails['Filter'];
                                    $filterName = null;
                                    
                                    // Handle different filter formats
                                    if (is_object($filter)) {
                                        $filterName = $filter->getContent();
                                    } elseif (is_array($filter)) {
                                        // Get first filter if array
                                        $filterName = isset($filter[0]) ? (is_object($filter[0]) ? $filter[0]->getContent() : $filter[0]) : null;
                                    } else {
                                        $filterName = $filter;
                                    }
                                    
                                    // Map filter names to formats
                                    if ($filterName === 'DCTDecode' || $filterName === '/DCTDecode') {
                                        $format = 'JPEG';
                                    } elseif ($filterName === 'CCITTFaxDecode' || $filterName === '/CCITTFaxDecode') {
                                        $format = 'CCITT';
                                    } elseif ($filterName === 'JBIG2Decode' || $filterName === '/JBIG2Decode') {
                                        $format = 'JBIG2';
                                    } elseif ($filterName === 'JPXDecode' || $filterName === '/JPXDecode') {
                                        $format = 'JPEG2000';
                                    } elseif ($filterName) {
                                        // Remove leading slash if present
                                        $format = ltrim($filterName, '/');
                                    }
                                }
                                
                                // Get color space
                                $colorSpace = 'Unknown';
                                if (isset($imageDetails['ColorSpace'])) {
                                    $cs = $imageDetails['ColorSpace'];
                                    if (is_object($cs)) {
                                        $colorSpace = $cs->getContent();
                                    } elseif (is_array($cs) && isset($cs[0])) {
                                        $colorSpace = is_object($cs[0]) ? $cs[0]->getContent() : $cs[0];
                                    } else {
                                        $colorSpace = $cs;
                                    }
                                    // Remove leading slash if present
                                    if (is_string($colorSpace)) {
                                        $colorSpace = ltrim($colorSpace, '/');
                                    }
                                }
                                
                                // Create image name
                                $imageName = "img-{$pageNumber}-{$imageIndex}";
                                
                                $result['images'][] = [
                                    'page' => $pageNumber,
                                    'name' => $imageName,
                                    'width' => $width,
                                    'height' => $height,
                                    'dpi' => null, // Will be calculated separately if needed
                                    'resolution' => 'N/A',
                                    'format' => $format ?: 'Unknown',
                                    'colorSpace' => $colorSpace ?: 'Unknown'
                                ];
                            }
                        } catch (\Exception $e) {
                            // Skip this XObject if we can't process it
                            continue;
                        }
                    }
                }
            } catch (\Exception $e) {
                // Continue if image extraction fails for this page
            }
        }
        
        // Ensure arrays are always set
        if (!isset($result['fonts'])) {
            $result['fonts'] = [];
        }
        if (!isset($result['images'])) {
            $result['images'] = [];
        }
        if (!isset($result['metadata'])) {
            $result['metadata'] = [];
        }
        
        return $result;
    } catch (\Throwable $e) {
        throw new \Exception('Failed to parse PDF: ' . $e->getMessage(), 0, $e);
    }
}

/**
 * Calculate PPI from PDF using smalot/pdfparser library
 * This parses content streams to find transformation matrices
 */
function calculatePPIWithPdfParser($filePath, $imageList, $numPages) {
    $ppiData = [];
    
    if (empty($imageList) || $numPages <= 0 || !class_exists('Smalot\PdfParser\Parser')) {
        return $ppiData;
    }
    
    try {
        $parser = new \Smalot\PdfParser\Parser();
        $pdf = $parser->parseFile($filePath);
        $pages = $pdf->getPages();
        
        // Limit to first 10 pages for performance
        $maxPages = min(10, $numPages, count($pages));
        
        // Build image lookup by dimensions (more reliable than name matching)
        $imageLookup = [];
        foreach ($imageList as $img) {
            $key = ($img['width'] ?? 0) . 'x' . ($img['height'] ?? 0);
            if (!isset($imageLookup[$key])) {
                $imageLookup[$key] = [];
            }
            $imageLookup[$key][] = $img;
        }
        
        // For each page, get content and find transformation matrices
        for ($pageIndex = 0; $pageIndex < $maxPages; $pageIndex++) {
            $page = $pages[$pageIndex];
            $pageNumber = $pageIndex + 1;
            
            try {
                // Get page text with transformation matrices
                // The library's getDataTm() gives us transformation matrices
                $dataTm = $page->getDataTm();
                
                // Also try to get raw content stream to find image Do operators
                $content = $page->get('Contents');
                if ($content) {
                    // Get decompressed content
                    $contentText = '';
                    if (is_array($content)) {
                        foreach ($content as $contentObj) {
                            if (method_exists($contentObj, 'getContent')) {
                                $contentText .= $contentObj->getContent() . "\n";
                            }
                        }
                    } elseif (method_exists($content, 'getContent')) {
                        $contentText = $content->getContent();
                    }
                    
                    // Look for transformation matrices followed by Do operator
                    // Pattern: [a b c d e f] cm ... /ImageName Do
                    // Or: a b c d e f cm ... /ImageName Do
                    if (preg_match_all('/(?:\[)?\s*([\d.\-\s]+)\s*(?:\])?\s+cm\s+.*?\/\s*([A-Za-z0-9]+)\s+Do/s', $contentText, $matches, PREG_SET_ORDER)) {
                        foreach ($matches as $match) {
                            $matrixStr = trim($match[1]);
                            $imageName = trim($match[2]);
                            
                            // Parse matrix values
                            $matrixValues = preg_split('/\s+/', $matrixStr);
                            if (count($matrixValues) >= 6) {
                                $a = (float)$matrixValues[0];
                                $b = (float)$matrixValues[1];
                                $c = (float)$matrixValues[2];
                                $d = (float)$matrixValues[3];
                                
                                // Calculate scale factors
                                $scaleX = sqrt($a * $a + $b * $b);
                                $scaleY = sqrt($c * $c + $d * $d);
                                
                                // Try to match this to an image by name or dimensions
                                foreach ($imageList as $img) {
                                    $imgName = $img['name'] ?? '';
                                    $imgWidth = $img['width'] ?? 0;
                                    $imgHeight = $img['height'] ?? 0;
                                    
                                    // Match by name or check if dimensions could match
                                    if (strpos($imgName, $imageName) !== false || 
                                        (strpos($imgName, "img-{$pageNumber}") !== false)) {
                                        
                                        if ($imgWidth > 0 && $imgHeight > 0) {
                                            // Calculate display size in points
                                            $displayWidthPoints = $scaleX * $imgWidth;
                                            $displayHeightPoints = $scaleY * $imgHeight;
                                            
                                            // Validate reasonable sizes
                                            if ($displayWidthPoints > 1 && $displayWidthPoints < 2000 && 
                                                $displayHeightPoints > 1 && $displayHeightPoints < 2000) {
                                                
                                                // Convert points to inches (1 inch = 72 points)
                                                $displayWidthInches = $displayWidthPoints / 72.0;
                                                $displayHeightInches = $displayHeightPoints / 72.0;
                                                
                                                // Calculate PPI
                                                $xPpi = $imgWidth / $displayWidthInches;
                                                $yPpi = $imgHeight / $displayHeightInches;
                                                
                                                // Average PPI
                                                $effectivePPI = ($xPpi + $yPpi) / 2;
                                                
                                                // Validate PPI (reasonable range)
                                                if ($effectivePPI >= 10 && $effectivePPI <= 10000) {
                                                    $ppiData[$imgName] = [
                                                        'xPpi' => $xPpi,
                                                        'yPpi' => $yPpi,
                                                        'dpi' => $effectivePPI,
                                                        'resolution' => round($effectivePPI) . ' DPI'
                                                    ];
                                                }
                                            }
                                        }
                                        break; // Found match, move to next
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (\Exception $e) {
                // Continue if this page fails
                continue;
            }
        }
    } catch (\Exception $e) {
        // Return empty on error
        return $ppiData;
    }
    
    return $ppiData;
}

/**
 * Analyze PDF using poppler-utils (pdfinfo, pdffonts, pdfimages)
 */
function analyzeWithPoppler($filePath) {
    $result = [
        'numPages' => 0,
        'pdfVersion' => 'N/A',
        'metadata' => [],
        'fonts' => [],
        'images' => []
    ];
    
    // Get PDF info
    $infoOutput = shell_exec('pdfinfo ' . escapeshellarg($filePath) . ' 2>&1');
    if ($infoOutput) {
        // Parse pages
        if (preg_match('/Pages:\s+(\d+)/', $infoOutput, $matches)) {
            $result['numPages'] = (int)$matches[1];
        }
        
        // Parse PDF version
        if (preg_match('/PDF version:\s+([\d.]+)/', $infoOutput, $matches)) {
            $result['pdfVersion'] = $matches[1];
        }
        
        // Parse metadata
        $metadataFields = [
            'Title' => 'title',
            'Author' => 'author',
            'Subject' => 'subject',
            'Creator' => 'creator',
            'Producer' => 'producer',
            'CreationDate' => 'creationDate',
            'ModDate' => 'modificationDate'
        ];
        
        foreach ($metadataFields as $field => $key) {
            if (preg_match('/' . $field . ':\s+(.+)/', $infoOutput, $matches)) {
                $value = trim($matches[1]);
                if ($field === 'CreationDate' || $field === 'ModDate') {
                    $value = formatPDFDate($value);
                }
                $result['metadata'][$key] = $value;
            }
        }
    }
    
    // Get fonts
    $fontsOutput = shell_exec('pdffonts ' . escapeshellarg($filePath) . ' 2>&1');
    if ($fontsOutput) {
        $lines = explode("\n", trim($fontsOutput));
        // Skip header lines (first 2 lines)
        for ($i = 2; $i < count($lines); $i++) {
            $line = trim($lines[$i]);
            if (empty($line)) continue;
            
            // Parse font line: name type embedded encoding subset
            $parts = preg_split('/\s+/', $line, 5);
            if (count($parts) >= 4) {
                $result['fonts'][] = [
                    'name' => $parts[0],
                    'type' => $parts[1],
                    'embedded' => $parts[2] === 'yes',
                    'subset' => isset($parts[3]) && $parts[3] === 'yes'
                ];
            }
        }
    }
    
    // Get images
    $tempDir = sys_get_temp_dir() . '/pdf_images_' . uniqid();
    if (!file_exists($tempDir)) {
        mkdir($tempDir, 0755, true);
    }
    
    $imagesOutput = shell_exec('pdfimages -list ' . escapeshellarg($filePath) . ' 2>&1');
    if ($imagesOutput) {
        $lines = explode("\n", trim($imagesOutput));
        // Skip header line
        for ($i = 1; $i < count($lines); $i++) {
            $line = trim($lines[$i]);
            if (empty($line)) continue;
            
            // Parse image line: page num type width height color comp bpc enc interp objectID x-ppi y-ppi size ratio
            $parts = preg_split('/\s+/', $line);
            if (count($parts) >= 10) {
                $page = (int)$parts[0];
                $imageNum = isset($parts[1]) ? $parts[1] : 'N/A';
                $format = $parts[2] ?? 'N/A';
                $width = (int)$parts[3];
                $height = (int)$parts[4];
                $colorSpace = $parts[5] ?? 'N/A';
                $xPpi = isset($parts[11]) ? (float)$parts[11] : null;
                $yPpi = isset($parts[12]) ? (float)$parts[12] : null;
                $dpi = $xPpi && $yPpi ? ($xPpi + $yPpi) / 2 : null;
                
                // Create image name from page and number
                $imageName = "img-{$page}-{$imageNum}";
                
                $result['images'][] = [
                    'page' => $page,
                    'name' => $imageName,
                    'width' => $width,
                    'height' => $height,
                    'dpi' => $dpi,
                    'resolution' => $dpi ? round($dpi) . ' DPI' : 'N/A',
                    'format' => $format,
                    'colorSpace' => $colorSpace
                ];
            }
        }
    }
    
    // Cleanup temp directory
    if (file_exists($tempDir)) {
        array_map('unlink', glob("$tempDir/*"));
        rmdir($tempDir);
    }
    
    return $result;
}

/**
 * Analyze PDF using PHP (fallback when command-line tools not available)
 */
function analyzeWithPHP($filePath) {
    $result = [
        'numPages' => 0,
        'pdfVersion' => 'N/A',
        'metadata' => [],
        'fonts' => [],
        'images' => []
    ];
    
    // Read PDF file
    $content = file_get_contents($filePath);
    
    // Extract PDF version
    if (preg_match('/%PDF-([\d.]+)/', $content, $matches)) {
        $result['pdfVersion'] = $matches[1];
    }
    
    // Extract page count (count /Type /Page)
    preg_match_all('/\/Type\s*\/Page[^s]/', $content, $matches);
    $result['numPages'] = count($matches[0]);
    
    // Extract basic metadata
    $metadataFields = [
        '/Title\s*\(([^)]+)\)/' => 'title',
        '/Author\s*\(([^)]+)\)/' => 'author',
        '/Subject\s*\(([^)]+)\)/' => 'subject',
        '/Creator\s*\(([^)]+)\)/' => 'creator',
        '/Producer\s*\(([^)]+)\)/' => 'producer',
        '/CreationDate\s*\(([^)]+)\)/' => 'creationDate',
        '/ModDate\s*\(([^)]+)\)/' => 'modificationDate'
    ];
    
    foreach ($metadataFields as $pattern => $key) {
        if (preg_match($pattern, $content, $matches)) {
            $value = $matches[1];
            if (strpos($key, 'Date') !== false) {
                $value = formatPDFDate($value);
            }
            $result['metadata'][$key] = $value;
        }
    }
    
    // Extract fonts (basic - find /BaseFont entries)
    if (preg_match_all('/\/BaseFont\s*\/([^\s\/]+)/', $content, $matches)) {
        $fonts = array_unique($matches[1]);
        foreach ($fonts as $fontName) {
            $result['fonts'][] = [
                'name' => $fontName,
                'type' => 'Unknown',
                'embedded' => false, // Can't determine without deeper parsing
                'subset' => false
            ];
        }
    }
    
    // Extract images with dimensions from PDF structure
    // Look for image XObjects with Width and Height properties
    // Pattern: /Width [number] /Height [number]
    $imagePattern = '/\/Width\s+(\d+)\s+\/Height\s+(\d+)/';
    $imageIndex = 0;
    if (preg_match_all($imagePattern, $content, $matches, PREG_SET_ORDER)) {
        foreach ($matches as $match) {
            $imageIndex++;
            $width = (int)$match[1];
            $height = (int)$match[2];
            
            // Try to find image name/XObject name
            $imageName = "img-{$imageIndex}";
            $imageContext = substr($content, max(0, strpos($content, $match[0]) - 1000), 2000);
            
            // Try to find XObject name (e.g., /Im1, /X1, etc.)
            if (preg_match('/(\/[A-Za-z0-9]+\s+\d+\s+\d+\s+obj.*?\/Width\s+\d+\s+\/Height\s+\d+)/s', $imageContext, $objMatch)) {
                if (preg_match('/\/([A-Za-z0-9]+)\s+\d+\s+\d+\s+obj/', $objMatch[1], $nameMatch)) {
                    $imageName = $nameMatch[1];
                }
            }
            
            // Try to find format from filter
            $format = 'Unknown';
            if (preg_match('/\/Filter\s*\/([^\s\/]+)/', $imageContext, $filterMatch)) {
                $filterName = $filterMatch[1];
                if ($filterName === 'DCTDecode') {
                    $format = 'JPEG';
                } elseif ($filterName === 'CCITTFaxDecode') {
                    $format = 'CCITT';
                } elseif ($filterName === 'JBIG2Decode') {
                    $format = 'JBIG2';
                } elseif ($filterName === 'JPXDecode') {
                    $format = 'JPEG2000';
                } else {
                    $format = $filterName;
                }
            }
            
            // Try to find color space
            $colorSpace = 'Unknown';
            if (preg_match('/\/ColorSpace\s*\/([^\s\/]+)/', $imageContext, $csMatch)) {
                $colorSpace = $csMatch[1];
            }
            
            $result['images'][] = [
                'page' => 0, // Can't determine page without deeper parsing
                'name' => $imageName,
                'width' => $width,
                'height' => $height,
                'dpi' => null, // DPI requires page dimensions which we don't have easily
                'resolution' => 'N/A',
                'format' => $format,
                'colorSpace' => $colorSpace
            ];
        }
    }
    
    return $result;
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

/**
 * Format PDF date string
 */
function formatPDFDate($dateString) {
    if (empty($dateString)) return 'N/A';
    
    // PDF dates are in format: D:YYYYMMDDHHmmSSOHH'mm
    if (preg_match('/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/', $dateString, $matches)) {
        $year = $matches[1];
        $month = $matches[2];
        $day = $matches[3];
        $hour = $matches[4];
        $minute = $matches[5];
        $second = $matches[6];
        
        return date('Y-m-d H:i:s', mktime($hour, $minute, $second, $month, $day, $year));
    }
    
    return $dateString;
}

