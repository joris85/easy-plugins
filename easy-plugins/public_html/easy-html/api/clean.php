<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

const MAX_BODY_BYTES = 1048576; // 1MB of pasted HTML is plenty

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

// Same-origin only: the tool's own frontend never sends a cross-site Origin
function validateRequestOrigin(): bool
{
    $requestHost = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $requestHost = preg_replace('/:\d+$/', '', $requestHost);

    foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $key) {
        $value = $_SERVER[$key] ?? '';
        if ($value === '' || strtolower($value) === 'null') {
            continue;
        }
        $host = strtolower((string) (parse_url($value, PHP_URL_HOST) ?? ''));
        if ($host === '') {
            continue;
        }
        $stripped = preg_replace('/^www\./', '', $host);
        $requestStripped = preg_replace('/^www\./', '', $requestHost);
        if ($stripped !== $requestStripped) {
            return false;
        }
    }

    return true;
}

function checkRateLimit(string $ip): bool
{
    $maxRequests = 120; // per hour per IP
    $windowSeconds = 3600;
    $dataDir = __DIR__ . '/data';
    $file = $dataDir . '/rate_limits.json';

    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    $htaccess = $dataDir . '/.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "Require all denied\n");
    }

    $handle = fopen($file, 'c+');
    if (!$handle) {
        return true;
    }

    $allowed = true;
    if (flock($handle, LOCK_EX)) {
        $now = time();
        $key = hash('sha256', $ip);
        $store = json_decode(stream_get_contents($handle) ?: '', true);
        if (!is_array($store)) {
            $store = [];
        }

        if (!isset($store[$key]) || ($now - (int) ($store[$key]['window_start'] ?? 0)) >= $windowSeconds) {
            $store[$key] = ['window_start' => $now, 'requests' => 0];
        }
        $store[$key]['requests'] = (int) ($store[$key]['requests'] ?? 0) + 1;
        $allowed = $store[$key]['requests'] <= $maxRequests;

        foreach ($store as $entryKey => $entry) {
            if (($now - (int) ($entry['window_start'] ?? 0)) >= $windowSeconds * 2) {
                unset($store[$entryKey]);
            }
        }

        ftruncate($handle, 0);
        rewind($handle);
        $encoded = json_encode($store);
        if ($encoded !== false) {
            fwrite($handle, $encoded);
        }
        fflush($handle);
        flock($handle, LOCK_UN);
    }
    fclose($handle);

    return $allowed;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    sendJsonResponse(['success' => false, 'error' => 'Invalid request method'], 405);
}

if (!validateRequestOrigin()) {
    sendJsonResponse(['success' => false, 'error' => 'Request not allowed from this origin.'], 403);
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > MAX_BODY_BYTES) {
    sendJsonResponse(['success' => false, 'error' => 'Content too large. Maximum is 1MB.'], 413);
}

if (!checkRateLimit($_SERVER['REMOTE_ADDR'] ?? 'unknown')) {
    sendJsonResponse(['success' => false, 'error' => 'Too many requests. Please wait a while and try again.'], 429);
}

$rawBody = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
if ($rawBody !== false && strlen($rawBody) > MAX_BODY_BYTES) {
    sendJsonResponse(['success' => false, 'error' => 'Content too large. Maximum is 1MB.'], 413);
}

$input = json_decode((string) $rawBody, true);

if (!$input || !isset($input['html'])) {
    sendJsonResponse(['success' => false, 'error' => 'No HTML content provided'], 400);
}

$html = $input['html'];
$options = $input['options'] ?? [];

try {
    $cleanedHtml = cleanHtml($html, $options);
    sendJsonResponse(['success' => true, 'cleanedHtml' => $cleanedHtml]);
} catch (Throwable $e) {
    sendJsonResponse(['success' => false, 'error' => 'An error occurred while cleaning the HTML.'], 500);
}

function cleanHtml($html, $options) {
    // DOM-based cleaning understands real HTML (quotes in attributes, nesting,
    // malformed input); the old regex pipeline stays as a safety net
    try {
        return cleanHtmlDom($html, $options);
    } catch (Throwable $e) {
        return cleanHtmlLegacy($html, $options);
    }
}

function cleanHtmlDom($html, $options) {
    $on = function ($key) use ($options) {
        return isset($options[$key]) && $options[$key] === true;
    };

    // Repair ellipsis-truncated URLs in the raw input (legacy behavior)
    $html = preg_replace('/(https?:\/\/[^\s<>"\'\)]*)\[%E2%80%A6\]([^\s<>"\'\)]*)/i', '$1$2', $html);
    $html = preg_replace('/(https?:\/\/[^\s<>"\'\)]*)…([^\s<>"\'\)]*)/iu', '$1$2', $html);
    $html = preg_replace('/(https?:\/\/[^\s<>"\'\)]*)\[\.\.\.\]([^\s<>"\'\)]*)/i', '$1$2', $html);

    $doc = new DOMDocument('1.0', 'UTF-8');
    $doc->substituteEntities = false;
    $previousErrors = libxml_use_internal_errors(true);
    $loaded = $doc->loadHTML(
        '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body>' . $html . '</body></html>',
        LIBXML_NONET
    );
    libxml_clear_errors();
    libxml_use_internal_errors($previousErrors);
    if (!$loaded) {
        throw new RuntimeException('HTML parse failed');
    }
    $body = $doc->getElementsByTagName('body')->item(0);
    if (!$body) {
        throw new RuntimeException('No body after parse');
    }
    $xpath = new DOMXPath($doc);

    $unwrap = function (DOMNode $node) {
        while ($node->firstChild) {
            $node->parentNode->insertBefore($node->firstChild, $node);
        }
        $node->parentNode->removeChild($node);
    };
    $rename = function (DOMElement $node, $newName) use ($doc) {
        $new = $doc->createElement($newName);
        foreach (iterator_to_array($node->attributes) as $attr) {
            $new->setAttribute($attr->name, $attr->value);
        }
        while ($node->firstChild) {
            $new->appendChild($node->firstChild);
        }
        $node->parentNode->replaceChild($new, $node);
        return $new;
    };
    $nodeList = function ($query) use ($xpath, $body) {
        // Materialize: live lists break when the tree is modified mid-walk
        return iterator_to_array($xpath->query($query, $body));
    };

    // Always: unwrap Word/Office namespace leftovers (<o:p> and friends) and
    // drop scripts — pasted content should never carry executable code
    foreach ($nodeList('.//*[contains(name(), ":")]') as $node) {
        $unwrap($node);
    }
    foreach ($nodeList('.//script') as $node) {
        $node->parentNode->removeChild($node);
    }

    // Convert Google Docs bold spans to <strong> (never inside headings)
    if ($on('convertGoogleBold')) {
        foreach ($nodeList('.//span[@style]') as $span) {
            $style = strtolower($span->getAttribute('style'));
            if (!preg_match('/font-weight\s*:\s*(bold|[5-9]00)/', $style)) {
                continue;
            }
            if ($xpath->query('ancestor::h1|ancestor::h2|ancestor::h3|ancestor::h4|ancestor::h5|ancestor::h6', $span)->length > 0) {
                continue;
            }
            $rename($span, 'strong')->removeAttribute('style');
        }
        // Google Docs list cleanup: drop trailing <br> runs inside <li>
        foreach ($nodeList('.//li') as $li) {
            while ($li->lastChild) {
                $last = $li->lastChild;
                $isTrailingBr = ($last->nodeType === XML_ELEMENT_NODE && strtolower($last->nodeName) === 'br')
                    || ($last->nodeType === XML_TEXT_NODE && trim($last->textContent) === '');
                $isBrOnlySpan = $last->nodeType === XML_ELEMENT_NODE
                    && strtolower($last->nodeName) === 'span'
                    && trim(str_replace("\u{00a0}", '', $last->textContent)) === ''
                    && $xpath->query('.//*[not(self::br) and not(self::span)]', $last)->length === 0;
                if ($isTrailingBr || $isBrOnlySpan) {
                    $li->removeChild($last);
                    continue;
                }
                break;
            }
        }
    }

    if ($on('removeComments')) {
        foreach ($nodeList('.//comment()') as $node) {
            $node->parentNode->removeChild($node);
        }
    }

    if ($on('removeInlineStyles')) {
        foreach ($nodeList('.//*[@style]') as $node) {
            $node->removeAttribute('style');
        }
        // Pasted <style> blocks are inline styling too
        foreach ($nodeList('.//style') as $node) {
            $node->parentNode->removeChild($node);
        }
    }

    if ($on('removeClasses')) {
        $dropExact = ['class', 'id', 'role', 'dir', 'tabindex', 'lang',
            'align', 'valign', 'bgcolor', 'color', 'face', 'size', 'border',
            'cellpadding', 'cellspacing', 'width', 'height',
            'font-family', 'font-size', 'font-weight', 'background-color', 'text-align', 'margin', 'padding'];
        foreach ($nodeList('.//*') as $node) {
            if (!$node->hasAttributes()) {
                continue;
            }
            foreach (iterator_to_array($node->attributes) as $attr) {
                $name = strtolower($attr->name);
                if (in_array($name, $dropExact, true)
                    || strpos($name, 'aria-') === 0
                    || strpos($name, 'data-') === 0
                    || strpos($name, 'on') === 0) {
                    $node->removeAttribute($attr->name);
                }
            }
        }
    }

    if ($on('removeSpans')) {
        foreach ($nodeList('.//span') as $node) {
            $unwrap($node);
        }
    }

    if ($on('removeDivs')) {
        foreach ($nodeList('.//div') as $node) {
            $unwrap($node);
        }
    }

    if ($on('removeEmptyTags')) {
        $emptyable = ['p', 'div', 'span', 'b', 'i', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th'];
        // Repeat: removing an inner empty tag can leave its parent empty
        do {
            $removed = 0;
            foreach ($nodeList('.//*') as $node) {
                if (!in_array(strtolower($node->nodeName), $emptyable, true)) {
                    continue;
                }
                if ($xpath->query('.//img|.//br|.//hr|.//input|.//iframe|.//video|.//audio|.//table', $node)->length > 0) {
                    continue;
                }
                if (trim(str_replace("\u{00a0}", '', $node->textContent)) === '') {
                    $node->parentNode->removeChild($node);
                    $removed++;
                }
            }
        } while ($removed > 0);
    }

    if ($on('convertNbspToSpace')) {
        foreach ($nodeList('.//text()') as $textNode) {
            $textNode->nodeValue = str_replace("\u{00a0}", ' ', $textNode->nodeValue);
        }
    }

    if ($on('convertSmartQuotes')) {
        foreach ($nodeList('.//text()') as $textNode) {
            $textNode->nodeValue = cleanerStraightenQuotes($textNode->nodeValue);
        }
    }

    if ($on('removeTrackingParams')) {
        foreach ($nodeList('.//a[@href]') as $link) {
            $link->setAttribute('href', cleanerStripTrackingParams($link->getAttribute('href')));
        }
    }

    if ($on('removeSuccessiveSpaces')) {
        foreach ($nodeList('.//text()') as $textNode) {
            $value = $textNode->nodeValue;
            $value = preg_replace('/\x{00a0}{2,}/u', "\u{00a0}", $value);
            $value = preg_replace('/(\x{00a0}\s*){2,}/u', "\u{00a0}", $value);
            $value = preg_replace('/\s+\x{00a0}\s+/u', "\u{00a0}", $value);
            $value = preg_replace('/[ \t]{2,}/', ' ', $value);
            $textNode->nodeValue = $value;
        }
    }

    if ($on('convertTags')) {
        foreach ($nodeList('.//b') as $node) {
            $rename($node, 'strong');
        }
        foreach ($nodeList('.//i') as $node) {
            $rename($node, 'em');
        }
    }

    if ($on('removeImages')) {
        foreach ($nodeList('.//img|.//picture') as $node) {
            $node->parentNode->removeChild($node);
        }
    }

    if ($on('removeLinks')) {
        foreach ($nodeList('.//a') as $node) {
            $unwrap($node);
        }
    }

    if ($on('removeTables')) {
        foreach ($nodeList('.//table') as $node) {
            $node->parentNode->removeChild($node);
        }
    }

    if ($on('replaceTablesWithDivs')) {
        foreach ($nodeList('.//thead|.//tbody|.//tfoot') as $node) {
            $unwrap($node);
        }
        foreach ($nodeList('.//table|.//tr|.//td|.//th') as $node) {
            $rename($node, 'div');
        }
    }

    if ($on('replaceDivsWithP')) {
        foreach ($nodeList('.//div') as $node) {
            $rename($node, 'p');
        }
    }

    // Search & replace on TEXT only (never inside tags), after all cleaning.
    // A space in the search also matches the non-breaking spaces that email
    // and editor pastes are full of.
    $pairs = cleanerSearchReplacePairs($options);
    if ($pairs) {
        foreach ($nodeList('.//text()') as $textNode) {
            $textNode->nodeValue = cleanerApplySearchReplace($textNode->nodeValue, $pairs);
        }
    }

    // Serialize only the body content (the input was a fragment)
    $result = '';
    foreach ($body->childNodes as $child) {
        $result .= $doc->saveHTML($child);
    }

    // Normalize entities: decode whatever libxml encoded back to plain UTF-8
    // (é stays é), while protecting the structural entities, and always write
    // non-breaking spaces as a visible &nbsp;
    $protect = [
        '&lt;' => "\x01LT\x01",
        '&gt;' => "\x01GT\x01",
        '&quot;' => "\x01QT\x01",
        '&amp;' => "\x01AMP\x01",
        '&nbsp;' => "\x01NB\x01",
    ];
    $result = strtr($result, $protect);
    $result = html_entity_decode($result, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $result = strtr($result, array_flip($protect));
    $result = str_replace("\u{00a0}", '&nbsp;', $result);

    if ($on('encodeSpecialChars')) {
        $parts = preg_split('/(<[^>]+>)/', $result, -1, PREG_SPLIT_DELIM_CAPTURE);
        $encodedParts = [];
        foreach ($parts as $part) {
            if (preg_match('/^<[^>]+>$/', $part)) {
                $encodedParts[] = $part;
            } else {
                $encodedParts[] = htmlentities(html_entity_decode($part, ENT_QUOTES | ENT_HTML5, 'UTF-8'), ENT_QUOTES, 'UTF-8', false);
            }
        }
        $result = implode('', $encodedParts);
    }

    return $result;
}

function cleanerStraightenQuotes($text) {
    return strtr($text, [
        "\u{2019}" => "'", "\u{2018}" => "'", "\u{201A}" => "'", "\u{2032}" => "'",
        "\u{201C}" => '"', "\u{201D}" => '"', "\u{201E}" => '"', "\u{2033}" => '"',
    ]);
}

function cleanerStripTrackingParams($url) {
    $parts = parse_url($url);
    if ($parts === false || empty($parts['query'])) {
        return $url;
    }
    parse_str($parts['query'], $params);
    $trackers = ['fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'wbraid', 'gbraid',
        'mc_cid', 'mc_eid', 'igshid', 'twclid', 'ttclid', 'yclid',
        '_hsenc', '_hsmi', 'vero_id', 'oly_anon_id', 'oly_enc_id', 'mkt_tok'];
    $filtered = [];
    foreach ($params as $key => $value) {
        $lower = strtolower((string) $key);
        if (strpos($lower, 'utm_') === 0 || in_array($lower, $trackers, true)) {
            continue;
        }
        $filtered[$key] = $value;
    }
    $query = http_build_query($filtered);
    $rebuilt = '';
    if (isset($parts['scheme'])) {
        $rebuilt .= $parts['scheme'] . '://';
    }
    if (isset($parts['user'])) {
        $rebuilt .= $parts['user'] . (isset($parts['pass']) ? ':' . $parts['pass'] : '') . '@';
    }
    $rebuilt .= ($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : '') . ($parts['path'] ?? '');
    if ($query !== '') {
        $rebuilt .= '?' . $query;
    }
    if (isset($parts['fragment'])) {
        $rebuilt .= '#' . $parts['fragment'];
    }
    return $rebuilt !== '' ? $rebuilt : $url;
}

function cleanerSearchReplacePairs($options) {
    if (!isset($options['searchReplace']) || !is_array($options['searchReplace'])) {
        return [];
    }
    $pairs = [];
    foreach (array_slice($options['searchReplace'], 0, 20) as $rule) {
        if (!is_array($rule)) {
            continue;
        }
        $search = (string) ($rule[0] ?? '');
        $replace = (string) ($rule[1] ?? '');
        if ($search === '' || strlen($search) > 500 || strlen($replace) > 500) {
            continue;
        }
        $pairs[] = [$search, $replace];
    }
    return $pairs;
}

function cleanerApplySearchReplace($text, $pairs) {
    foreach ($pairs as [$search, $replace]) {
        $pattern = '/' . str_replace(' ', '[ \x{00a0}]', preg_quote($search, '/')) . '/u';
        $replaced = preg_replace($pattern, strtr($replace, ['\\' => '\\\\', '$' => '\\$']), $text);
        if ($replaced !== null) {
            $text = $replaced;
        }
    }
    return $text;
}

function cleanHtmlLegacy($html, $options) {
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
        '/href\s*=\s*(?|"([^"]+)"|\'([^\']+)\')/i',
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
            '/<span[^>]*style\s*=\s*(?:"[^"]*font-weight\s*:\s*bold[^"]*"|\'[^\']*font-weight\s*:\s*bold[^\']*\')[^>]*>(.*?)<\/span>/i',
            function($matches) {
                $content = $matches[1];
                return "<strong>$content</strong>";
            },
            $html
        );
        
        // Step 3: Convert spans with font-weight:bold (no space)
        $html = preg_replace_callback(
            '/<span[^>]*style\s*=\s*(?:"[^"]*font-weight:bold[^"]*"|\'[^\']*font-weight:bold[^\']*\')[^>]*>(.*?)<\/span>/i',
            function($matches) {
                $content = $matches[1];
                return "<strong>$content</strong>";
            },
            $html
        );
        
        // Step 4: Convert spans with font-weight: 700 (bold equivalent)
        $html = preg_replace_callback(
            '/<span[^>]*style\s*=\s*(?:"[^"]*font-weight\s*:\s*700[^"]*"|\'[^\']*font-weight\s*:\s*700[^\']*\')[^>]*>(.*?)<\/span>/i',
            function($matches) {
                $content = $matches[1];
                return "<strong>$content</strong>";
            },
            $html
        );
        
        // Step 5: Convert spans with font-weight:bold; (with semicolon)
        $html = preg_replace_callback(
            '/<span[^>]*style\s*=\s*(?:"[^"]*font-weight:bold;[^"]*"|\'[^\']*font-weight:bold;[^\']*\')[^>]*>(.*?)<\/span>/i',
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
        
        // Step 7: Remove trailing <br> tags in list items (Google Docs cleanup)
        // This handles cases like: <li><p>Content<br><br></p></li> -> <li><p>Content</p></li>
        // Also handles: <li><p>Content<span><br><br></span></p></li> -> <li><p>Content</p></li>
        // NOTE: only inside <li> — a document-wide <br><br> removal would merge
        // paragraphs in Gmail/Outlook paste, which uses <br><br> as paragraph breaks.

        // Process list items specifically
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
    }
    
    // Remove HTML comments
    if (isset($options['removeComments']) && $options['removeComments'] === true) {
        $html = preg_replace('/<!--.*?-->/s', '', $html);
    }
    
    // Remove inline styles
    if (isset($options['removeInlineStyles']) && $options['removeInlineStyles'] === true) {
        $html = preg_replace('/\s*style\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
    } else {
    }
    
    // Remove classes and IDs
    if (isset($options['removeClasses']) && $options['removeClasses'] === true) {
        $html = preg_replace('/\s*class\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*id\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        
        // Remove other styling attributes but keep semantic tags
        // Remove font-related attributes
        $html = preg_replace('/\s*font-family\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*font-size\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*font-weight\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*color\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*background-color\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*text-align\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*margin\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*padding\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*border\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*width\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*height\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        
        // Remove accessibility and direction attributes
        $html = preg_replace('/\s*role\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*dir\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*aria-\w+\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*tabindex\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
        $html = preg_replace('/\s*data-\w+\s*=\s*("[^"]*"|\'[^\']*\')/', '', $html);
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
    } else {
    }
    
    // Convert non-breaking spaces to normal spaces
    if (isset($options['convertNbspToSpace']) && $options['convertNbspToSpace'] === true) {
        $html = str_replace(['&nbsp;', "\u{00a0}"], ' ', $html);
    }

    // Straighten smart quotes
    if (isset($options['convertSmartQuotes']) && $options['convertSmartQuotes'] === true) {
        $html = cleanerStraightenQuotes($html);
    }

    // Strip tracking parameters from link URLs
    if (isset($options['removeTrackingParams']) && $options['removeTrackingParams'] === true) {
        $html = preg_replace_callback(
            '/href\s*=\s*(?|"([^"]+)"|\'([^\']+)\')/i',
            function ($matches) {
                return 'href="' . cleanerStripTrackingParams($matches[1]) . '"';
            },
            $html
        );
    }

    // Remove successive &nbsp;s
    if (isset($options['removeSuccessiveSpaces']) && $options['removeSuccessiveSpaces'] === true) {
        
        // Count before processing
        $beforeCount = substr_count($html, '&nbsp;&nbsp;');
        
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
    } else {
    }
    
    // Convert <b> to <strong>, <i> to <em> (but keep the tags)
    if (isset($options['convertTags']) && $options['convertTags'] === true) {
        
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
    } else {
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
    
    // Encode special characters in TEXT only — running htmlentities over the
    // whole document would escape the tags themselves and destroy the markup
    if (isset($options['encodeSpecialChars']) && $options['encodeSpecialChars'] === true) {
        $parts = preg_split('/(<[^>]+>)/', $html, -1, PREG_SPLIT_DELIM_CAPTURE);
        $encodedParts = [];
        foreach ($parts as $part) {
            if (preg_match('/^<[^>]+>$/', $part)) {
                // Tag: leave untouched
                $encodedParts[] = $part;
            } else {
                // Text: normalize then encode (double_encode=false keeps existing entities intact)
                $encodedParts[] = htmlentities($part, ENT_QUOTES, 'UTF-8', false);
            }
        }
        $html = implode('', $encodedParts);
    }
    
    // FINAL STEP: Restore all protected URLs (in reverse order to avoid conflicts)
    for ($i = $urlIndex - 1; $i >= 0; $i--) {
        $placeholder = '___URL_PLACEHOLDER_' . $i . '___';
        $originalUrl = $urlPlaceholders[$i];
        $html = str_replace($placeholder, $originalUrl, $html);
    }

    // Search & replace on text segments only
    $pairs = cleanerSearchReplacePairs($options);
    if ($pairs) {
        $parts = preg_split('/(<[^>]+>)/', $html, -1, PREG_SPLIT_DELIM_CAPTURE);
        foreach ($parts as $i => $part) {
            if (!preg_match('/^<[^>]+>$/', $part)) {
                $parts[$i] = cleanerApplySearchReplace($part, $pairs);
            }
        }
        $html = implode('', $parts);
    }

    return $html;
}
