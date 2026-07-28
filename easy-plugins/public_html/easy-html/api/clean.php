<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

function sendJsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false) {
        $json = json_encode(['success' => false, 'error' => 'Failed to encode response']);
    }
    echo $json;
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['html'])) {
    sendJsonResponse(['success' => false, 'error' => 'No HTML content provided'], 400);
}

$html = $input['html'];
$options = $input['options'] ?? [];

// Debug: Log the received options
error_log('Received options: ' . json_encode($options));
error_log('removeInlineStyles value: ' . ($options['removeInlineStyles'] ?? 'not set'));

try {
    $cleanedHtml = cleanHtml($html, $options);
    sendJsonResponse(['success' => true, 'cleanedHtml' => $cleanedHtml]);
} catch (Throwable $e) {
    error_log('HTML clean error: ' . $e->getMessage());
    sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}

function cleanHtml($html, $options) {
    // Only clean what's explicitly checked - no default cleaning!
    
    // STEP 0: PROTECT ALL URLs - URLs must NEVER be modified
    // Extract and protect URLs in href attributes and as plain text
    $urlPlaceholders = [];
    $urlIndex = 0;
    
    // First, fix any already-truncated URLs with ellipsis patterns
    // This handles URLs that were truncated before reaching the cleaning function
    $html = preg_replace_callback(
        '/(https?:\/\/[^\s<>"\'\)]*)\[%E2%80%A6\]([^\s<>"\'\)]*)/i',
        function($matches) {
            // Try to reconstruct the URL by removing the ellipsis
            // Note: We can't fully restore truncated URLs, but we can remove the ellipsis marker
            return $matches[1] . $matches[2];
        },
        $html
    );
    $html = preg_replace('/(https?:\/\/[^\s<>"\'\)]*)…([^\s<>"\'\)]*)/iu', '$1$2', $html);
    $html = preg_replace('/(https?:\/\/[^\s<>"\'\)]*)\[\.\.\.\]([^\s<>"\'\)]*)/i', '$1$2', $html);
    
    // Pattern to match complete URLs (http, https, ftp, mailto, etc.)
    // More precise pattern that matches full URLs
    $urlPattern = '/(https?:\/\/[^\s<>"\'\)\]\[]+|ftp:\/\/[^\s<>"\'\)\]\[]+|mailto:[^\s<>"\'\)\]\[]+)/i';
    
    // First, protect URLs in href attributes (most important - these must be preserved exactly)
    $html = preg_replace_callback(
        '/href\s*=\s*["\']([^"\']+)["\']/i',
        function($matches) use (&$urlPlaceholders, &$urlIndex) {
            $url = $matches[1];
            // Remove any ellipsis patterns that might be in the URL
            $url = preg_replace('/\[%E2%80%A6\]/', '', $url);
            $url = preg_replace('/…/u', '', $url);
            $url = preg_replace('/\[\.\.\.\]/', '', $url);
            
            $placeholder = '___URL_PLACEHOLDER_' . $urlIndex . '___';
            $urlPlaceholders[$urlIndex] = $url;
            $urlIndex++;
            return 'href="' . $placeholder . '"';
        },
        $html
    );
    
    // Then, protect URLs as plain text (in text content between tags)
    // Split HTML into tags and text content, only process text content
    $parts = preg_split('/(<[^>]+>)/', $html, -1, PREG_SPLIT_DELIM_CAPTURE);
    $processedParts = [];
    foreach ($parts as $part) {
        // If it's a tag, keep it as-is
        if (preg_match('/^<[^>]+>$/', $part)) {
            $processedParts[] = $part;
        } else {
            // It's text content - protect URLs here
            $processedPart = preg_replace_callback(
                $urlPattern,
                function($matches) use (&$urlPlaceholders, &$urlIndex) {
                    $url = $matches[0];
                    // Skip if this is already a placeholder
                    if (strpos($url, '___URL_PLACEHOLDER_') !== false) {
                        return $url;
                    }
                    // Remove any ellipsis patterns
                    $url = preg_replace('/\[%E2%80%A6\]/', '', $url);
                    $url = preg_replace('/…/u', '', $url);
                    $url = preg_replace('/\[\.\.\.\]/', '', $url);
                    
                    $placeholder = '___URL_PLACEHOLDER_' . $urlIndex . '___';
                    $urlPlaceholders[$urlIndex] = $url;
                    $urlIndex++;
                    return $placeholder;
                },
                $part
            );
            $processedParts[] = $processedPart;
        }
    }
    $html = implode('', $processedParts);
    
    // Convert Google Docs bold styling to <strong> tags (FIRST OPERATION)
    // EXCLUDES heading elements (h1-h6) to preserve their semantic meaning
    if (isset($options['convertGoogleBold']) && $options['convertGoogleBold'] === true) {
        error_log('CONVERTING Google Docs bold to <strong> - option is true');
        
        // Use a simpler approach: first protect headings, then convert spans, then restore headings
        
        // Step 1: Protect all headings by replacing them with placeholders
        $headingPlaceholders = [];
        $html = preg_replace_callback(
            '/<h[1-6][^>]*>.*?<\/h[1-6]>/i',
            function($matches) use (&$headingPlaceholders) {
                $placeholder = '___HEADING_PLACEHOLDER_' . count($headingPlaceholders) . '___';
                $headingPlaceholders[] = $matches[0];
                return $placeholder;
            },
            $html
        );
        
        // Step 2: Convert spans with font-weight: bold to <strong> (now safe since headings are protected)
        $html = preg_replace_callback(
            '/<span[^>]*style\s*=\s*["\'][^"\']*font-weight\s*:\s*bold[^"\']*["\'][^>]*>(.*?)<\/span>/i',
            function($matches) {
                $content = $matches[1];
                return "<strong>$content</strong>";
            },
            $html
        );
        
        // Step 3: Convert spans with font-weight:bold (no space)
        $html = preg_replace_callback(
            '/<span[^>]*style\s*=\s*["\'][^"\']*font-weight:bold[^"\']*["\'][^>]*>(.*?)<\/span>/i',
            function($matches) {
                $content = $matches[1];
                return "<strong>$content</strong>";
            },
            $html
        );
        
        // Step 4: Convert spans with font-weight: 700 (bold equivalent)
        $html = preg_replace_callback(
            '/<span[^>]*style\s*=\s*["\'][^"\']*font-weight\s*:\s*700[^"\']*["\'][^>]*>(.*?)<\/span>/i',
            function($matches) {
                $content = $matches[1];
                return "<strong>$content</strong>";
            },
            $html
        );
        
        // Step 5: Convert spans with font-weight:bold; (with semicolon)
        $html = preg_replace_callback(
            '/<span[^>]*style\s*=\s*["\'][^"\']*font-weight:bold;[^"\']*["\'][^>]*>(.*?)<\/span>/i',
            function($matches) {
                $content = $matches[1];
                return "<strong>$content</strong>";
            },
            $html
        );
        
        // Step 6: Restore all headings (unchanged)
        foreach ($headingPlaceholders as $index => $heading) {
            $html = str_replace('___HEADING_PLACEHOLDER_' . $index . '___', $heading, $html);
        }
        
        error_log('Google Docs bold conversion completed (excluding headings)');
        
        // Step 7: Remove trailing <br> tags in list items (Google Docs cleanup)
        // This handles cases like: <li><p>Content<br><br></p></li> -> <li><p>Content</p></li>
        // Also handles: <li><p>Content<span><br><br></span></p></li> -> <li><p>Content</p></li>
        
        // First, remove multiple consecutive <br> tags anywhere in the HTML
        $html = preg_replace('/(<br\s*\/?>\s*){2,}/', '', $html);
        
        // Then process list items specifically
        $html = preg_replace_callback(
            '/<li[^>]*>(.*?)<\/li>/i',
            function($matches) {
                $content = $matches[1];
                
                // Remove any trailing <br> tags (single or multiple)
                $content = preg_replace('/<br\s*\/?>\s*$/', '', $content);
                $content = preg_replace('/(<br\s*\/?>\s*)+$/', '', $content);
                
                // Remove spans that contain only <br> tags
                $content = preg_replace('/<span[^>]*>\s*(<br\s*\/?>\s*)+<\/span>/', '', $content);
                
                // Remove empty spans
                $content = preg_replace('/<span[^>]*>\s*<\/span>/', '', $content);
                
                // Final cleanup: remove any remaining trailing <br> tags
                $content = preg_replace('/<br\s*\/?>\s*$/', '', $content);
                $content = preg_replace('/(<br\s*\/?>\s*)+$/', '', $content);
                
                return '<li>' . $content . '</li>';
            },
            $html
        );
        
        error_log('Google Docs trailing <br> removal completed');
    }
    
    // Remove HTML comments
    if (isset($options['removeComments']) && $options['removeComments'] === true) {
        $html = preg_replace('/<!--.*?-->/s', '', $html);
    }
    
    // Remove inline styles
    if (isset($options['removeInlineStyles']) && $options['removeInlineStyles'] === true) {
        error_log('REMOVING inline styles - option is true');
        error_log('HTML before removing inline styles: ' . substr($html, 0, 200));
        $html = preg_replace('/\s*style\s*=\s*["\'][^"\']*["\']/', '', $html);
        error_log('HTML after removing inline styles: ' . substr($html, 0, 200));
    } else {
        error_log('NOT removing inline styles - option is: ' . ($options['removeInlineStyles'] ?? 'not set'));
    }
    
    // Remove classes and IDs
    if (isset($options['removeClasses']) && $options['removeClasses'] === true) {
        $html = preg_replace('/\s*class\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*id\s*=\s*["\'][^"\']*["\']/', '', $html);
        
        // Remove other styling attributes but keep semantic tags
        // Remove font-related attributes
        $html = preg_replace('/\s*font-family\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*font-size\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*font-weight\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*color\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*background-color\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*text-align\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*margin\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*padding\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*border\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*width\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*height\s*=\s*["\'][^"\']*["\']/', '', $html);
        
        // Remove accessibility and direction attributes
        $html = preg_replace('/\s*role\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*dir\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*aria-\w+\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*tabindex\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*data-\w+\s*=\s*["\'][^"\']*["\']/', '', $html);
    }
    
    // Remove span tags (keep content)
    if (isset($options['removeSpans']) && $options['removeSpans'] === true) {
        // Remove opening span tags
        $html = preg_replace('/<span[^>]*>/i', '', $html);
        // Remove closing span tags
        $html = preg_replace('/<\/span>/i', '', $html);
    }
    
    // Remove div tags (keep content)
    if (isset($options['removeDivs']) && $options['removeDivs'] === true) {
        $html = preg_replace('/<\/?div[^>]*>/i', '', $html);
    }
    
    // Remove empty tags (but preserve structure)
    if (isset($options['removeEmptyTags']) && $options['removeEmptyTags'] === true) {
        error_log('REMOVING empty tags - option is true');
        
        // Count bold tags before removal
        $bCountBefore = substr_count($html, '<b');
        $strongCountBefore = substr_count($html, '<strong');
        
        // Remove empty tags (including p, div, span, b, i, etc.)
        $beforeCount = substr_count($html, '<p>');
        
        // Pattern 1: Empty tags with no content <p></p>
        $html = preg_replace('/<(p|div|span|b|i|strong|em|h[1-6]|li|td|th)[^>]*>\s*<\/\1>/i', '', $html);
        
        // Pattern 2: Tags with only whitespace <p> </p>
        $html = preg_replace('/<(p|div|span|b|i|strong|em|h[1-6]|li|td|th)[^>]*>\s+<\/\1>/i', '', $html);
        
        // Pattern 3: Tags with only &nbsp; <p>&nbsp;</p>
        $html = preg_replace('/<(p|div|span|b|i|strong|em|h[1-6]|li|td|th)[^>]*>\s*&nbsp;\s*<\/\1>/i', '', $html);
        
        // Pattern 4: Tags with only multiple &nbsp; <p>&nbsp;&nbsp;</p>
        $html = preg_replace('/<(p|div|span|b|i|strong|em|h[1-6]|li|td|th)[^>]*>\s*&nbsp;+\s*<\/\1>/i', '', $html);
        
        // Count bold tags after removal
        $bCountAfter = substr_count($html, '<b');
        $strongCountAfter = substr_count($html, '<strong');
        
        $afterCount = substr_count($html, '<p>');
        error_log("Empty tags removal: Found $beforeCount <p> tags, $afterCount remaining");
        error_log("Bold tags before empty removal: <b>=$bCountBefore, <strong>=$strongCountBefore");
        error_log("Bold tags after empty removal: <b>=$bCountAfter, <strong>=$strongCountAfter");
        
        error_log('Empty tags removal completed');
    } else {
        error_log('NOT removing empty tags - option is: ' . ($options['removeEmptyTags'] ?? 'not set'));
    }
    
    // Remove successive &nbsp;s
    if (isset($options['removeSuccessiveSpaces']) && $options['removeSuccessiveSpaces'] === true) {
        error_log('REMOVING successive &nbsp;s - option is true');
        
        // Count before processing
        $beforeCount = substr_count($html, '&nbsp;&nbsp;');
        error_log("Found $beforeCount instances of consecutive &nbsp;s");
        
        // Remove multiple consecutive &nbsp; entities
        $html = preg_replace('/(&nbsp;){2,}/', '&nbsp;', $html);
        
        // Remove multiple regular spaces
        $html = preg_replace('/\s{2,}/', ' ', $html);
        
        // Remove mixed &nbsp; and spaces
        $html = preg_replace('/(&nbsp;\s*){2,}/', '&nbsp;', $html);
        
        // Remove spaces followed by &nbsp; followed by spaces
        $html = preg_replace('/\s+&nbsp;\s+/', '&nbsp;', $html);
        
        // Count after processing
        $afterCount = substr_count($html, '&nbsp;&nbsp;');
        error_log("After processing: $afterCount instances of consecutive &nbsp;s remaining");
        
        error_log('Successive &nbsp;s removal completed');
    } else {
        error_log('NOT removing successive &nbsp;s - option is: ' . ($options['removeSuccessiveSpaces'] ?? 'not set'));
    }
    
    // Convert <b> to <strong>, <i> to <em> (but keep the tags)
    if (isset($options['convertTags']) && $options['convertTags'] === true) {
        error_log('CONVERTING tags - option is true');
        error_log('HTML before converting tags: ' . substr($html, 0, 200));
        
        // Count <b> tags before conversion
        $bCountBefore = substr_count($html, '<b');
        $strongCountBefore = substr_count($html, '<strong');
        
        $html = preg_replace('/<b\b([^>]*)>/i', '<strong$1>', $html);
        $html = preg_replace('/<\/b>/i', '</strong>', $html);
        $html = preg_replace('/<i\b([^>]*)>/i', '<em$1>', $html);
        $html = preg_replace('/<\/i>/i', '</em>', $html);
        
        // Count <b> and <strong> tags after conversion
        $bCountAfter = substr_count($html, '<b');
        $strongCountAfter = substr_count($html, '<strong');
        
        error_log("Bold tags before: <b>=$bCountBefore, <strong>=$strongCountBefore");
        error_log("Bold tags after: <b>=$bCountAfter, <strong>=$strongCountAfter");
        error_log('HTML after converting tags: ' . substr($html, 0, 200));
    } else {
        error_log('NOT converting tags - option is: ' . ($options['convertTags'] ?? 'not set'));
    }
    
    // Remove images
    if (isset($options['removeImages']) && $options['removeImages'] === true) {
        $html = preg_replace('/<img[^>]*>/i', '', $html);
    }
    
    // Remove links (keep content)
    if (isset($options['removeLinks']) && $options['removeLinks'] === true) {
        $html = preg_replace('/<a[^>]*>(.*?)<\/a>/i', '$1', $html);
    }
    
    // Remove tables
    if (isset($options['removeTables']) && $options['removeTables'] === true) {
        $html = preg_replace('/<table[^>]*>.*?<\/table>/is', '', $html);
    }
    
    // Replace table tags with divs
    if (isset($options['replaceTablesWithDivs']) && $options['replaceTablesWithDivs'] === true) {
        $html = preg_replace('/<table[^>]*>/i', '<div>', $html);
        $html = preg_replace('/<\/table>/i', '</div>', $html);
        $html = preg_replace('/<tr[^>]*>/i', '<div>', $html);
        $html = preg_replace('/<\/tr>/i', '</div>', $html);
        $html = preg_replace('/<td[^>]*>/i', '<div>', $html);
        $html = preg_replace('/<\/td>/i', '</div>', $html);
        $html = preg_replace('/<th[^>]*>/i', '<div>', $html);
        $html = preg_replace('/<\/th>/i', '</div>', $html);
    }
    
    // Replace div tags with paragraphs
    if (isset($options['replaceDivsWithP']) && $options['replaceDivsWithP'] === true) {
        $html = preg_replace('/<div[^>]*>/i', '<p>', $html);
        $html = preg_replace('/<\/div>/i', '</p>', $html);
    }
    
    // DON'T encode special characters - keep HTML readable
    if (isset($options['encodeSpecialChars']) && $options['encodeSpecialChars'] === true) {
        $html = htmlspecialchars_decode($html, ENT_QUOTES);
        $html = htmlentities($html, ENT_QUOTES, 'UTF-8');
    }
    
    // FINAL STEP: Restore all protected URLs (in reverse order to avoid conflicts)
    for ($i = $urlIndex - 1; $i >= 0; $i--) {
        $placeholder = '___URL_PLACEHOLDER_' . $i . '___';
        $originalUrl = $urlPlaceholders[$i];
        $html = str_replace($placeholder, $originalUrl, $html);
    }
    
    return $html;
}
