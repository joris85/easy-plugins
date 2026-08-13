<?php
/**
 * Free audit library for easy-plugins.com — ported from the Easy Studio
 * (easy-image.app) audit services and stripped to a synchronous, capped,
 * no-database free tier. See FREE-AUDIT-TOOLS.md for the porting notes.
 *
 * Free-tier caps live in EpAudit::* constants. The paid product does the
 * 100-page crawl, history, monitoring and white-label PDF — the free tools
 * audit one page (three for broken links) and link to Easy Studio for more.
 */

final class EpAudit
{
    // Browser-shaped because "(compatible; …bot…)" UAs get a blanket 403 from
    // SiteGround-class WAFs (even our own homepage). The trailing token keeps
    // the crawler identifiable and blockable: "easy-plugins-audit".
    public const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 easy-plugins-audit/1.0 (+https://easy-plugins.com)';
    public const DEADLINE_SECONDS = 50;   // wall-clock budget per run
    public const MAX_LINK_PAGES = 3;      // broken-links crawls at most this many pages
    public const MAX_LINK_CHECKS = 40;    // per run, one pass, no retries
    public const MAX_IMAGES = 30;         // images measured per run
    public const IMAGE_BYTES_CAP = 10 * 1024 * 1024;
    public const HTML_BYTES_CAP = 5 * 1024 * 1024;

    // Ranges FILTER_FLAG_NO_RES_RANGE misses that still must never be reached
    // from a public tool: CGNAT (common internal fabric on shared hosting),
    // IETF benchmarking, and the "this host" /24.
    private const EXTRA_DENY_CIDRS = ['100.64.0.0/10', '198.18.0.0/15', '192.0.0.0/24'];

    /** Reject non-http(s) URLs, credentials in the URL and private/loopback hosts (SSRF guard). */
    public static function safeUrl(string $url): bool
    {
        return self::vetUrl($url) !== null;
    }

    /**
     * Resolve a URL and confirm EVERY address it maps to is public. Returns
     * ['host','port','ip','scheme'] with a single pinned IP, or null. Pinning
     * the vetted IP (via CURLOPT_RESOLVE at the call site) closes the two
     * classic bypasses: an AAAA/IPv6 loopback the A-only gethostbyname never
     * saw, and DNS rebinding where curl re-resolves to a different address
     * than the one we checked.
     */
    public static function vetUrl(string $url): ?array
    {
        $parts = parse_url($url);
        if (!is_array($parts) || !in_array($parts['scheme'] ?? '', ['http', 'https'], true) || empty($parts['host'])) {
            return null;
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            return null;
        }
        $port = isset($parts['port']) ? (int) $parts['port'] : ($parts['scheme'] === 'https' ? 443 : 80);
        if (!in_array($port, [80, 443, 8080, 8443], true)) {
            return null;
        }
        $host = $parts['host'];
        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            $ips = [trim($host, '[]')];
        } else {
            foreach ((array) @dns_get_record($host, DNS_A | DNS_AAAA) as $rec) {
                if (!empty($rec['ip'])) {
                    $ips[] = $rec['ip'];
                }
                if (!empty($rec['ipv6'])) {
                    $ips[] = $rec['ipv6'];
                }
            }
            if ($ips === []) {
                $g = gethostbyname($host); // last resort (A only)
                if ($g !== $host) {
                    $ips[] = $g;
                }
            }
        }
        if ($ips === []) {
            return null; // did not resolve
        }
        // Any single private/reserved address disqualifies the whole host.
        foreach ($ips as $ip) {
            if (!self::publicIp($ip)) {
                return null;
            }
        }
        // Pin IPv4 when available (matches CURLOPT_IPRESOLVE below).
        $pinned = $ips[0];
        foreach ($ips as $ip) {
            if (!str_contains($ip, ':')) {
                $pinned = $ip;
                break;
            }
        }
        return ['host' => $host, 'port' => $port, 'ip' => $pinned, 'scheme' => $parts['scheme']];
    }

    private static function publicIp(string $ip): bool
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return false;
        }
        foreach (self::EXTRA_DENY_CIDRS as $cidr) {
            if (self::ipInCidr($ip, $cidr)) {
                return false;
            }
        }
        return true;
    }

    private static function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $bits] = explode('/', $cidr);
        $ipLong = ip2long($ip);
        $subnetLong = ip2long($subnet);
        if ($ipLong === false || $subnetLong === false) {
            return false; // IPv4 CIDRs only; IPv6 privates are caught by the filter above
        }
        $mask = -1 << (32 - (int) $bits);
        return ($ipLong & $mask) === ($subnetLong & $mask);
    }

    /** Pin the vetted IP so curl cannot re-resolve to a different address. */
    private static function pinTo(\CurlHandle $ch, array $vet): void
    {
        curl_setopt($ch, CURLOPT_RESOLVE, ["{$vet['host']}:{$vet['port']}:{$vet['ip']}"]);
        if (!str_contains($vet['ip'], ':')) {
            curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
        }
    }

    /** A write callback that aborts once $cap bytes are buffered (bomb guard). */
    private static function capSink(int $cap): array
    {
        $buf = '';
        $over = false;
        $fn = function ($ch, string $chunk) use (&$buf, &$over, $cap): int {
            $buf .= $chunk;
            if (strlen($buf) > $cap) {
                $over = true;
                return -1; // signal curl to abort the transfer
            }
            return strlen($chunk);
        };
        // Result reader captures by reference so it sees the accumulated body.
        $result = function () use (&$buf, &$over): ?string {
            return $over ? null : $buf;
        };
        return [$fn, $result];
    }

    /**
     * curl GET with manual redirect following so every hop is re-vetted and
     * IP-pinned (a public URL redirecting to an internal address is the
     * classic SSRF bypass — automatic FOLLOWLOCATION would follow it blind).
     * The body is streamed through a size cap so a gzip bomb cannot inflate
     * past $maxBytes in memory before the check runs.
     */
    public static function fetch(string $url, int $maxBytes, int $timeout = 12, ?array &$info = null): ?string
    {
        $info = ['status' => 0, 'ttfb_ms' => 0, 'total_ms' => 0, 'final_url' => $url];
        for ($hop = 0; $hop <= 3; $hop++) {
            $vet = self::vetUrl($url);
            if ($vet === null) {
                return null;
            }
            [$sink, $result] = self::capSink($maxBytes);
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
                CURLOPT_TIMEOUT => $timeout,
                CURLOPT_CONNECTTIMEOUT => 6,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXFILESIZE => $maxBytes,
                CURLOPT_USERAGENT => self::UA,
                CURLOPT_HEADERFUNCTION => static fn ($c, $h): int => strlen($h),
                CURLOPT_WRITEFUNCTION => $sink,
            ]);
            self::pinTo($ch, $vet);
            curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $info['status'] = $status;
            $info['ttfb_ms'] = (int) round((float) curl_getinfo($ch, CURLINFO_STARTTRANSFER_TIME) * 1000);
            $info['total_ms'] = (int) round((float) curl_getinfo($ch, CURLINFO_TOTAL_TIME) * 1000);
            $info['final_url'] = $url;
            $redirect = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
            curl_close($ch);
            if ($status >= 300 && $status < 400) {
                $next = $redirect !== '' ? self::resolveUrl($url, $redirect) : '';
                if ($next !== '' && $next !== $url) {
                    $url = $next;
                    continue;
                }
                return null;
            }
            $body = $result();
            return ($status > 0 && $status < 400 && $body !== null) ? $body : null;
        }
        return null;
    }

    /** HTTP status with HEAD-then-ranged-GET fallback; 0 = network failure. Redirects are followed manually and re-vetted. */
    public static function statusOf(string $url, int $timeout = 5): int
    {
        foreach (['HEAD', 'GET'] as $method) {
            $current = $url;
            for ($hop = 0; $hop <= 5; $hop++) {
                $vet = self::vetUrl($current);
                if ($vet === null) {
                    return $hop === 0 ? 0 : 400; // an internal redirect target is "broken", not scannable
                }
                $ch = curl_init($current);
                curl_setopt_array($ch, [
                    CURLOPT_NOBODY => $method === 'HEAD',
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => false,
                    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
                    CURLOPT_TIMEOUT => $timeout,
                    CURLOPT_CONNECTTIMEOUT => 4,
                    CURLOPT_MAXFILESIZE => 65536,
                    CURLOPT_USERAGENT => self::UA,
                    CURLOPT_RANGE => $method === 'GET' ? '0-2048' : null,
                ]);
                self::pinTo($ch, $vet);
                curl_exec($ch);
                $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
                $redirect = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
                curl_close($ch);
                if ($status >= 300 && $status < 400 && $redirect !== '') {
                    $next = self::resolveUrl($current, $redirect);
                    if ($next !== '' && $next !== $current) {
                        $current = $next;
                        continue;
                    }
                }
                if ($method === 'HEAD' && in_array($status, [0, 404, 405, 501], true)) {
                    break; // HEAD-hostile server — verify with a ranged GET
                }
                return $status === 206 ? 200 : $status;
            }
        }
        return 0;
    }

    /** Content-Length of a resource via a vetted, IP-pinned HEAD (one manual redirect hop). */
    public static function contentLength(string $url): int
    {
        for ($hop = 0; $hop <= 2; $hop++) {
            $vet = self::vetUrl($url);
            if ($vet === null) {
                return 0;
            }
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_NOBODY => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
                CURLOPT_TIMEOUT => 6,
                CURLOPT_CONNECTTIMEOUT => 4,
                CURLOPT_USERAGENT => self::UA,
            ]);
            self::pinTo($ch, $vet);
            curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $redirect = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
            $len = (int) curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
            curl_close($ch);
            if ($status >= 300 && $status < 400 && $redirect !== '') {
                $next = self::resolveUrl($url, $redirect);
                if ($next !== '' && $next !== $url) {
                    $url = $next;
                    continue;
                }
            }
            return max(0, $len);
        }
        return 0;
    }

    /** Dependency-free relative-URL resolution (with the /../ loop guard). */
    public static function resolveUrl(string $base, string $src): string
    {
        $src = trim($src);
        if ($src === '' || str_starts_with($src, 'data:')) {
            return '';
        }
        if (preg_match('#^https?://#i', $src)) {
            return $src;
        }
        $p = parse_url($base);
        if (empty($p['scheme']) || empty($p['host'])) {
            return '';
        }
        $origin = $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
        if (str_starts_with($src, '//')) {
            return $p['scheme'] . ':' . $src;
        }
        if (str_starts_with($src, '/')) {
            return $origin . $src;
        }
        $dir = rtrim(dirname($p['path'] ?? '/'), '/');
        $path = $dir . '/' . $src;
        $guard = 0;
        while (str_contains($path, '/../') && $guard++ < 50) {
            $next = preg_replace('#/[^/]+/\.\./#', '/', $path, 1);
            if ($next === null || $next === $path) {
                // '/../' at the root has no segment to swallow — clamp to root
                // (this exact case once looped forever: the deschrijn.nl bug).
                $path = str_replace('/../', '/', $path);
                break;
            }
            $path = $next;
        }
        return $origin . str_replace('/./', '/', $path);
    }

    /** A bare domain typed without a scheme becomes https://… */
    public static function normalizeInput(string $url): string
    {
        $url = trim($url);
        return ($url !== '' && !preg_match('#^https?://#i', $url)) ? 'https://' . $url : $url;
    }

    public static function norm(string $url): string
    {
        return rtrim((string) strtok($url, '#'), '/') ?: $url;
    }
}

/**
 * Collect the pages to audit. Free tier: 'page' = the URL only,
 * 'few' = URL + up to (limit-1) same-host pages found via links or sitemap.
 */
final class EpAuditPages
{
    public static function collect(string $startUrl, int $limit): array
    {
        $start = EpAudit::norm($startUrl);
        if ($limit <= 1) {
            return [$start];
        }
        $host = parse_url($start, PHP_URL_HOST);
        $pages = [$start];
        $seen = [$start => true];

        $html = EpAudit::fetch($start, EpAudit::HTML_BYTES_CAP);
        if ($html !== null) {
            preg_match_all('/<a[^>]+href=["\']([^"\']+)["\']/i', $html, $m);
            foreach ($m[1] as $href) {
                $abs = EpAudit::norm(EpAudit::resolveUrl($start, html_entity_decode($href)));
                if ($abs === '' || parse_url($abs, PHP_URL_HOST) !== $host || isset($seen[$abs])) {
                    continue;
                }
                if (preg_match('/\.(pdf|zip|jpe?g|png|webp|gif|svg|mp4|docx?|xlsx?)$/i', (string) parse_url($abs, PHP_URL_PATH))
                    || !EpAudit::safeUrl($abs)) {
                    continue;
                }
                $seen[$abs] = true;
                $pages[] = $abs;
                if (count($pages) >= $limit) {
                    return $pages;
                }
            }
        }

        // JS-rendered sites have no <a> tags in raw HTML; the sitemap still
        // lists every route.
        if (count($pages) < $limit) {
            $origin = (string) parse_url($start, PHP_URL_SCHEME) . '://' . (string) $host;
            $xml = EpAudit::fetch($origin . '/sitemap.xml', 2 * 1024 * 1024);
            if (is_string($xml) && stripos($xml, '<sitemapindex') !== false) {
                preg_match_all('#<loc>\s*([^<\s]+)#i', $xml, $sm);
                $xml = '';
                foreach (array_slice($sm[1], 0, 2) as $child) {
                    $childUrl = html_entity_decode($child);
                    if (EpAudit::safeUrl($childUrl)) {
                        $xml .= EpAudit::fetch($childUrl, 2 * 1024 * 1024) ?? '';
                    }
                }
            }
            if (is_string($xml) && $xml !== '') {
                preg_match_all('#<loc>\s*([^<\s]+)#i', $xml, $m);
                foreach ($m[1] as $loc) {
                    $abs = EpAudit::norm(html_entity_decode($loc));
                    if ($abs === '' || isset($seen[$abs]) || parse_url($abs, PHP_URL_HOST) !== $host) {
                        continue;
                    }
                    if (preg_match('/\.(pdf|zip|jpe?g|png|webp|gif|svg|mp4|docx?|xlsx?|xml)$/i', (string) parse_url($abs, PHP_URL_PATH))
                        || !EpAudit::safeUrl($abs)) {
                        continue;
                    }
                    $seen[$abs] = true;
                    $pages[] = $abs;
                    if (count($pages) >= $limit) {
                        break;
                    }
                }
            }
        }
        return $pages;
    }
}

/** Broken-link check: crawl up to 3 pages, verify up to 40 unique links. */
final class EpLinkAudit
{
    private const BLOCKED_CODES = [401, 403, 429, 999];

    public static function run(string $startUrl): array
    {
        $deadline = time() + EpAudit::DEADLINE_SECONDS;
        $host = (string) parse_url($startUrl, PHP_URL_HOST);
        $pages = EpAuditPages::collect($startUrl, EpAudit::MAX_LINK_PAGES);
        $links = []; // url => ['internal' => bool, 'sources' => [page => anchor]]
        $pagesScanned = 0;

        foreach ($pages as $pageUrl) {
            if (time() >= $deadline) {
                break;
            }
            $html = EpAudit::fetch($pageUrl, EpAudit::HTML_BYTES_CAP);
            if ($html === null) {
                continue;
            }
            $pagesScanned++;
            if (!preg_match_all('/<a\b[^>]*href=["\']([^"\'#]+)["\'][^>]*>(.*?)<\/a>/is', $html, $m, PREG_SET_ORDER)) {
                continue;
            }
            foreach ($m as $match) {
                $href = html_entity_decode(trim($match[1]));
                if ($href === '' || preg_match('/^(mailto:|tel:|javascript:|data:)/i', $href)) {
                    continue;
                }
                $abs = EpAudit::resolveUrl($pageUrl, $href);
                if ($abs === '' || !EpAudit::safeUrl($abs)) {
                    continue;
                }
                $abs = EpAudit::norm($abs);
                $anchor = mb_substr(trim(strip_tags($match[2])), 0, 80) ?: '(image link)';
                $internal = parse_url($abs, PHP_URL_HOST) === $host;
                if (!isset($links[$abs])) {
                    $links[$abs] = ['internal' => $internal, 'sources' => []];
                }
                if (count($links[$abs]['sources']) < 5) {
                    $links[$abs]['sources'][$pageUrl] = $anchor;
                }
            }
        }

        $broken = [];
        $blocked = [];
        $checked = 0;
        $skipped = 0;
        foreach ($links as $url => $link) {
            if ($checked >= EpAudit::MAX_LINK_CHECKS || time() >= $deadline) {
                $skipped++;
                continue;
            }
            $status = EpAudit::statusOf($url);
            $checked++;
            $entry = [
                'url' => $url,
                'status' => $status,
                'internal' => $link['internal'],
                'sources' => array_map(
                    static fn ($page, $anchor) => ['page' => $page, 'anchor' => $anchor],
                    array_keys($link['sources']),
                    array_values($link['sources'])
                ),
            ];
            if (in_array($status, self::BLOCKED_CODES, true)) {
                $blocked[] = $entry; // bot-blocked (WAF/LinkedIn-999): probably fine, not broken
            } elseif ($status === 0 || $status >= 400) {
                $broken[] = $entry;
            }
        }

        $score = $checked === 0 ? 100
            : max(0, min(100, (int) round(100 - (count($broken) / max(1, $checked)) * 300)));

        return [
            'score' => $score,
            'summary' => [
                'pages_scanned' => $pagesScanned,
                'links_found' => count($links),
                'links_checked' => $checked,
                'links_skipped' => $skipped,
                'broken' => count($broken),
                'blocked' => count($blocked),
            ],
            'findings' => ['broken' => $broken, 'blocked' => $blocked],
        ];
    }
}

/** Image audit: one page, grade every image like Lighthouse does. */
final class EpImageAudit
{
    private const MIN_SAVING = 8 * 1024; // ignore <8 KB potential savings, like PSI

    public static function run(string $startUrl): array
    {
        $deadline = time() + EpAudit::DEADLINE_SECONDS;
        $html = EpAudit::fetch($startUrl, EpAudit::HTML_BYTES_CAP);
        if ($html === null) {
            return ['error' => 'fetch_failed'];
        }
        $images = self::imagesOnPage($html, $startUrl);

        $records = [];
        $totalBytes = 0;
        $savableBytes = 0;
        $counts = ['modern' => 0, 'legacy' => 0, 'oversized' => 0, 'no_alt' => 0, 'no_lazy' => 0];
        foreach (array_slice($images, 0, EpAudit::MAX_IMAGES) as $img) {
            if (time() >= $deadline) {
                break;
            }
            $meta = self::measure($img['url']);
            if ($meta === null) {
                continue;
            }
            $rec = self::grade($img, $meta);
            $records[] = $rec;
            $totalBytes += $rec['bytes'];
            $savableBytes += $rec['savable'];
            $ext = strtolower($rec['format']);
            if (in_array($ext, ['webp', 'avif', 'svg'], true)) {
                $counts['modern']++;
            } elseif (in_array($ext, ['jpg', 'jpeg', 'png', 'gif'], true)) {
                $counts['legacy']++;
            }
            if ($rec['oversized']) {
                $counts['oversized']++;
            }
            if ($rec['alt_missing']) {
                $counts['no_alt']++;
            }
            if (!$rec['lazy']) {
                $counts['no_lazy']++;
            }
        }
        usort($records, static fn ($a, $b) => $b['savable'] <=> $a['savable']);

        // JS-rendered page? Almost no text and no images in the raw HTML —
        // say so honestly instead of reporting a perfect empty score.
        $jsRendered = false;
        if ($records === []) {
            $text = trim((string) preg_replace('/\s+/', ' ',
                strip_tags((string) preg_replace('#<(script|style|noscript)[^>]*>.*?</\1>#is', '', $html))));
            if (mb_strlen($text) < 300
                && preg_match('/id=["\'](root|app|__next|__nuxt)["\']|__NEXT_DATA__|window\.__|data-reactroot|ng-version|framerusercontent/i', $html)) {
                $jsRendered = true;
            }
        }

        return [
            'score' => self::score($records, $counts),
            'summary' => [
                'images_found' => count($images),
                'images' => count($records),
                'js_rendered' => $jsRendered,
                'total_bytes' => $totalBytes,
                'savable_bytes' => $savableBytes,
                'savable_pct' => $totalBytes > 0 ? (int) round($savableBytes / $totalBytes * 100) : 0,
                'legacy_format' => $counts['legacy'],
                'oversized' => $counts['oversized'],
                'missing_alt' => $counts['no_alt'],
                'not_lazy' => $counts['no_lazy'],
            ],
            'findings' => ['images' => $records],
        ];
    }

    /** The biggest candidate from a srcset attribute ("url 300w, url2 1024w"). */
    private static function largestFromSrcset(string $srcset): string
    {
        $best = '';
        $bestW = -1;
        foreach (explode(',', $srcset) as $entry) {
            $parts = preg_split('/\s+/', trim($entry));
            if (!is_array($parts) || $parts[0] === '') {
                continue;
            }
            $w = 0;
            if (isset($parts[1]) && preg_match('/^([\d.]+)[wx]$/i', $parts[1], $wm)) {
                $w = (float) $wm[1];
            }
            if ($w > $bestW) {
                $bestW = $w;
                $best = $parts[0];
            }
        }
        return $best;
    }

    /**
     * Every image the page references: <img> (src, lazy-loading data-
     * attributes, largest srcset entry), <source srcset> inside <picture>,
     * and CSS background-image urls in inline styles and <style> blocks.
     * CDN images without a file extension count too — the real format is
     * read from the downloaded bytes later.
     */
    private static function imagesOnPage(string $html, string $pageUrl): array
    {
        $out = [];
        $add = static function (string $src, int $renderW, bool $altMissing, bool $lazy, bool $bg) use (&$out, $pageUrl): void {
            $abs = EpAudit::resolveUrl($pageUrl, html_entity_decode($src));
            if ($abs === '' || !preg_match('#^https?://#i', $abs) || !EpAudit::safeUrl($abs)) {
                return;
            }
            // Skip obvious non-images grabbed from CSS (fonts, svg sprites in css urls are fine to keep).
            if (preg_match('/\.(css|js|woff2?|ttf|eot|mp4|webm|pdf)(\?|$)/i', $abs)) {
                return;
            }
            if (isset($out[$abs])) {
                $out[$abs]['render_w'] = max($out[$abs]['render_w'], $renderW);
                $out[$abs]['alt_missing'] = $out[$abs]['alt_missing'] && $altMissing;
                $out[$abs]['lazy'] = $out[$abs]['lazy'] || $lazy;
                return;
            }
            $name = basename((string) parse_url($abs, PHP_URL_PATH));
            $out[$abs] = [
                'url' => $abs,
                'name' => $name !== '' ? $name : 'image',
                'render_w' => $renderW,
                'alt_missing' => $altMissing,
                'lazy' => $lazy,
                'bg' => $bg,
            ];
        };

        // <img> tags: src + the lazy-loader data attributes + largest srcset.
        if (preg_match_all('/<img\b[^>]*>/i', $html, $tags)) {
            foreach ($tags[0] as $tag) {
                $renderW = 0;
                if (preg_match('/\bwidth=["\']?(\d+)/i', $tag, $wm)) {
                    $renderW = (int) $wm[1];
                }
                // An alt attribute that is present but empty is valid: it
                // marks the image as decorative. Only a missing attribute fails.
                $altMissing = !preg_match('/\balt\s*=/i', $tag);
                $lazy = (bool) preg_match('/\bloading=["\']lazy["\']/i', $tag)
                    || (bool) preg_match('/\bdata-(?:lazy-src|ll-status)\b/i', $tag);
                $candidates = [];
                if (preg_match('/\b(?:data-lazy-src|data-src|data-original)=["\']([^"\']+)["\']/i', $tag, $sm)) {
                    $candidates[] = $sm[1];
                } elseif (preg_match('/\bsrc=["\']([^"\']+)["\']/i', $tag, $sm)) {
                    $candidates[] = $sm[1];
                }
                if (preg_match('/\b(?:srcset|data-srcset|data-lazy-srcset)=["\']([^"\']+)["\']/i', $tag, $ssm)) {
                    $largest = self::largestFromSrcset($ssm[1]);
                    if ($largest !== '') {
                        $candidates = [$largest]; // the browser would pick from srcset — grade that one
                    }
                }
                foreach ($candidates as $src) {
                    if (!str_starts_with(trim($src), 'data:')) {
                        $add($src, $renderW, $altMissing, $lazy, false);
                    }
                }
            }
        }

        // <source srcset> (picture element).
        if (preg_match_all('/<source\b[^>]*\bsrcset=["\']([^"\']+)["\'][^>]*>/i', $html, $sources)) {
            foreach ($sources[1] as $srcset) {
                $largest = self::largestFromSrcset($srcset);
                if ($largest !== '' && !str_starts_with($largest, 'data:')) {
                    $add($largest, 0, false, false, false);
                }
            }
        }

        // CSS backgrounds: inline style="" attributes and <style> blocks.
        // Hero images hide here on most page builders (WordPress/Beaver/Divi).
        if (preg_match_all('/background(?:-image)?\s*:[^;{}]*url\(\s*["\']?([^"\')\s]+)["\']?\s*\)/i', $html, $bgs)) {
            foreach ($bgs[1] as $src) {
                if (!str_starts_with($src, 'data:')) {
                    // Background images have no alt/lazy semantics — do not
                    // penalize those dimensions, only format and weight.
                    $add($src, 0, false, true, true);
                }
            }
        }

        return array_values($out);
    }

    private static function measure(string $url): ?array
    {
        $bytes = EpAudit::fetch($url, EpAudit::IMAGE_BYTES_CAP, 8);
        if ($bytes === null || $bytes === '') {
            return null;
        }
        // The real format comes from the bytes — CDN URLs often have no
        // extension, and a ".png" URL can serve WebP behind the scenes.
        $info = @getimagesizefromstring($bytes);
        $format = '';
        if (is_array($info) && isset($info['mime'])) {
            $format = strtolower((string) preg_replace('#^image/(x-)?#', '', $info['mime']));
            $format = ['jpeg' => 'jpg', 'svg+xml' => 'svg'][$format] ?? $format;
        }
        if ($format === '') {
            if (stripos(ltrim($bytes), '<svg') === 0 || stripos($bytes, '<svg') !== false && strlen($bytes) < 200000) {
                $format = 'svg';
            } else {
                $ext = strtolower((string) pathinfo((string) parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
                $format = $ext !== '' ? ($ext === 'jpeg' ? 'jpg' : $ext) : 'unknown';
            }
        }
        if (!in_array($format, ['jpg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'], true) && !is_array($info)) {
            return null; // not an image after all (html error page, video poster endpoint, …)
        }
        return [
            'bytes' => strlen($bytes),
            'width' => (int) ($info[0] ?? 0),
            'height' => (int) ($info[1] ?? 0),
            'format' => $format,
        ];
    }

    private static function grade(array $img, array $meta): array
    {
        $bytes = $meta['bytes'];
        $format = $meta['format'];
        $legacy = in_array($format, ['jpg', 'jpeg', 'png', 'gif'], true);
        // Oversizing: intrinsic width beats the rendered box by >40% (allow DPR 2).
        $oversized = false;
        $scaleSaving = 0;
        if ($img['render_w'] > 0 && $meta['width'] > $img['render_w'] * 2 * 1.4) {
            $oversized = true;
            $target = $img['render_w'] * 2;
            $areaRatio = ($target * $target) / max(1, $meta['width'] * $meta['width']);
            $scaleSaving = (int) round($bytes * (1 - $areaRatio));
        }
        // A WebP re-encode of a legacy photo saves ~25-30%.
        $formatSaving = $legacy && $format !== 'gif' ? (int) round($bytes * 0.28) : 0;
        $savable = max($scaleSaving, $formatSaving);
        if ($savable < self::MIN_SAVING) {
            $savable = 0;
        }
        return [
            'url' => $img['url'],
            'name' => $img['name'],
            'bytes' => $bytes,
            'kb' => (int) round($bytes / 1024),
            'width' => $meta['width'],
            'height' => $meta['height'],
            'render_w' => $img['render_w'],
            'format' => $format,
            'legacy' => $legacy,
            'oversized' => $oversized,
            'alt_missing' => (bool) $img['alt_missing'],
            'lazy' => (bool) $img['lazy'],
            'bg' => (bool) ($img['bg'] ?? false),
            'savable' => $savable,
            'savable_kb' => (int) round($savable / 1024),
        ];
    }

    private static function score(array $records, array $counts): int
    {
        if ($records === []) {
            return 100;
        }
        $n = count($records);
        $modernShare = $counts['modern'] / $n;
        $sizedShare = 1 - ($counts['oversized'] / $n);
        $altShare = 1 - ($counts['no_alt'] / $n);
        $lazyShare = 1 - ($counts['no_lazy'] / $n);
        return max(0, min(100, (int) round($modernShare * 40 + $sizedShare * 30 + $lazyShare * 20 + $altShare * 10)));
    }
}

/** Website audit: one page, measured performance + SEO/technical/social checks. */
final class EpSeoAudit
{
    public static function run(string $url): array
    {
        $origin = (string) parse_url($url, PHP_URL_SCHEME) . '://' . (string) parse_url($url, PHP_URL_HOST);
        $info = null;
        $html = EpAudit::fetch($url, EpAudit::HTML_BYTES_CAP, 15, $info);
        if ($html === null || $html === '') {
            return ['error' => 'fetch_failed', 'status' => $info['status'] ?? 0];
        }
        $robots = EpAudit::fetch($origin . '/robots.txt', 512 * 1024, 6) ?? '';

        $loading = self::measureLoading($url, $html, $info);
        $checks = array_merge(
            self::performanceChecks($loading),
            self::onPage($html),
            self::siteTechnical($url, $origin, $robots),
            self::pageTechnical($html),
            self::structured($html)
        );

        $catOrder = ['Performance', 'SEO & content', 'Technical & structure', 'Structured data & social'];
        $cats = [];
        foreach ($checks as $c) {
            $cats[$c['category']]['checks'][] = $c;
        }
        $categories = [];
        foreach ($catOrder as $name) {
            if (!isset($cats[$name])) {
                continue;
            }
            $categories[] = ['name' => $name, 'score' => self::weightedScore($cats[$name]['checks']), 'checks' => $cats[$name]['checks']];
        }

        $recs = [];
        foreach ($checks as $c) {
            if (!$c['pass'] && $c['fix'] !== '') {
                $recs[] = ['w' => $c['weight'], 'text' => $c['fix']];
            }
        }
        usort($recs, static fn ($a, $b) => $b['w'] <=> $a['w']);
        $recommendations = array_values(array_unique(array_map(static fn ($r) => $r['text'], array_slice($recs, 0, 12))));

        $passed = count(array_filter($checks, static fn ($c) => $c['pass']));

        return [
            'score' => self::weightedScore($checks),
            'summary' => [
                'checks_passed' => $passed,
                'checks_total' => count($checks),
                'ttfb_ms' => $loading['ttfb_ms'],
                'load_ms' => $loading['total_ms'],
                'weight_kb' => (int) round($loading['weight_bytes'] / 1024),
                'requests' => $loading['requests'],
            ],
            'findings' => ['categories' => $categories, 'recommendations' => $recommendations],
        ];
    }

    private static function weightedScore(array $checks): int
    {
        $total = 0;
        $pass = 0;
        foreach ($checks as $c) {
            $total += $c['weight'];
            if ($c['pass']) {
                $pass += $c['weight'];
            }
        }
        return $total > 0 ? (int) round($pass / $total * 100) : 100;
    }

    private static function onPage(string $html): array
    {
        $title = preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $m) ? trim(html_entity_decode(strip_tags($m[1]))) : '';
        $desc = preg_match('/<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)/i', $html, $m) ? trim($m[1]) : '';
        preg_match_all('/<h1\b[^>]*>(.*?)<\/h1>/is', $html, $h1s);
        $h1count = count($h1s[0]);
        preg_match_all('/<img\b[^>]*>/i', $html, $imgs);
        $imgNoAlt = 0;
        foreach ($imgs[0] as $tag) {
            if (!preg_match('/\balt\s*=/i', $tag)) { // empty alt="" is valid (decorative)
                $imgNoAlt++;
            }
        }
        $words = str_word_count(trim(strip_tags((string) preg_replace('#<(script|style)[^>]*>.*?</\1>#is', '', $html))));
        $c = 'SEO & content';
        return [
            self::check('Title tag', $title !== '' && mb_strlen($title) <= 65, 3,
                $title !== '' ? 'Title present (' . mb_strlen($title) . ' chars).' : 'No <title> tag.',
                $title === '' ? 'Add a unique <title> of ~50-60 characters with the main keyword near the front.'
                    : (mb_strlen($title) > 65 ? 'Shorten the title to ~60 characters so it is not cut off in search results.' : ''), $c),
            self::check('Meta description', $desc !== '' && mb_strlen($desc) >= 50 && mb_strlen($desc) <= 165, 2,
                $desc !== '' ? mb_strlen($desc) . '-character description present.' : 'No meta description.',
                $desc === '' ? 'Add a 120-155 character meta description that sells the click.' : 'Aim the description for 120-155 characters.', $c),
            self::check('Single H1', $h1count === 1, 2,
                $h1count === 1 ? 'Exactly one H1.' : ($h1count === 0 ? 'No H1 heading.' : $h1count . ' H1 headings.'),
                $h1count === 1 ? '' : 'Use exactly one H1 as the page main heading.', $c),
            self::check('Images have alt text', $imgs[0] === [] || $imgNoAlt === 0, 1,
                $imgNoAlt === 0 ? 'All images have alt text.' : $imgNoAlt . ' image(s) missing alt text.',
                $imgNoAlt === 0 ? '' : 'Add descriptive alt text to the images without it.', $c),
            self::check('Enough content', $words >= 300, 1,
                $words . ' words of text on the page.',
                $words >= 300 ? '' : 'Thin content — aim for at least 300 words of genuinely useful text.', $c),
        ];
    }

    private static function siteTechnical(string $url, string $origin, string $robots): array
    {
        $c = 'Technical & structure';
        $https = str_starts_with($url, 'https://');
        $sitemap = EpAudit::fetch($origin . '/sitemap.xml', 512 * 1024, 6);
        $sitemapInRobots = (bool) preg_match('/sitemap:/i', $robots);
        $haveSitemap = ($sitemap !== null && $sitemap !== '') || $sitemapInRobots;
        $haveRobots = $robots !== '';
        return [
            self::check('HTTPS', $https, 3, $https ? 'Served over HTTPS.' : 'Not served over HTTPS.',
                $https ? '' : 'Serve the whole site over HTTPS and redirect http:// to https://.', $c),
            self::check('robots.txt', $haveRobots, 1, $haveRobots ? 'robots.txt found.' : 'No robots.txt.',
                $haveRobots ? '' : 'Add a robots.txt, even a permissive one, so crawlers know the rules.', $c),
            self::check('XML sitemap', $haveSitemap, 2,
                $haveSitemap ? 'Sitemap found.' : 'No sitemap.xml and none referenced in robots.txt.',
                $haveSitemap ? '' : 'Publish an XML sitemap and reference it in robots.txt.', $c),
        ];
    }

    private static function pageTechnical(string $html): array
    {
        $c = 'Technical & structure';
        $canonical = (bool) preg_match('/<link[^>]+rel=["\']canonical["\']/i', $html);
        $viewport = (bool) preg_match('/<meta[^>]+name=["\']viewport["\']/i', $html);
        $lang = (bool) preg_match('/<html[^>]+lang=/i', $html);
        $charset = (bool) preg_match('/<meta[^>]+charset=/i', $html);
        $favicon = (bool) preg_match('/<link[^>]+rel=["\'][^"\']*icon[^"\']*["\']/i', $html);
        $noindex = (bool) preg_match('/<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex/i', $html);
        return [
            self::check('Indexable (no accidental noindex)', !$noindex, 3,
                $noindex ? 'This page has a noindex tag — it is hidden from Google.' : 'No noindex tag.',
                $noindex ? 'Remove the noindex robots meta tag unless this page is meant to stay out of search.' : '', $c),
            self::check('Canonical tag', $canonical, 1, $canonical ? 'Canonical link present.' : 'No canonical link.',
                $canonical ? '' : 'Add a <link rel="canonical"> so duplicate URLs consolidate to one.', $c),
            self::check('Mobile viewport', $viewport, 2, $viewport ? 'Responsive viewport meta present.' : 'No viewport meta tag.',
                $viewport ? '' : 'Add a viewport meta tag for mobile.', $c),
            self::check('Character encoding', $charset, 1, $charset ? 'charset declared.' : 'No charset meta tag.',
                $charset ? '' : 'Declare <meta charset="utf-8"> early in the <head>.', $c),
            self::check('Language declared', $lang, 1, $lang ? 'html lang attribute set.' : 'No lang attribute on <html>.',
                $lang ? '' : 'Set the page language, e.g. <html lang="en">.', $c),
            self::check('Favicon', $favicon, 1, $favicon ? 'Favicon link present.' : 'No favicon link found.',
                $favicon ? '' : 'Add a favicon — browsers and search results show it next to your name.', $c),
        ];
    }

    private static function structured(string $html): array
    {
        $c = 'Structured data & social';
        $schema = (bool) preg_match('#<script[^>]+application/ld\+json#i', $html);
        $og = (bool) preg_match('/<meta[^>]+property=["\']og:/i', $html);
        $twitter = (bool) preg_match('/<meta[^>]+name=["\']twitter:/i', $html);
        return [
            self::check('Structured data (schema.org)', $schema, 2, $schema ? 'JSON-LD present.' : 'No JSON-LD structured data.',
                $schema ? '' : 'Add schema.org JSON-LD (Organization/LocalBusiness, Breadcrumb, Article/Product) for rich results.', $c),
            self::check('Open Graph tags', $og, 1, $og ? 'Open Graph tags present.' : 'No Open Graph tags.',
                $og ? '' : 'Add og:title, og:description and og:image so shared links look good.', $c),
            self::check('Twitter Card', $twitter, 1, $twitter ? 'Twitter Card present.' : 'No Twitter Card tags.',
                $twitter ? '' : 'Add twitter:card meta tags for nicer link previews.', $c),
        ];
    }

    /** TTFB + fetch time from the entry fetch; weight/requests from sampled resources. */
    private static function measureLoading(string $url, string $html, ?array $info): array
    {
        $htmlBytes = strlen($html);
        $weight = $htmlBytes;
        $requests = 1;
        preg_match_all('/<(?:script[^>]+src|link[^>]+href|img[^>]+(?:src|data-src))=["\']([^"\']+)["\']/i', $html, $m);
        $seen = [];
        $deadline = time() + 15;
        foreach ($m[1] as $src) {
            $abs = EpAudit::resolveUrl($url, html_entity_decode($src));
            if ($abs === '' || isset($seen[$abs]) || !EpAudit::safeUrl($abs)) {
                continue;
            }
            $seen[$abs] = true;
            $requests++;
            if (count($seen) > 25 || time() > $deadline) {
                continue; // keep counting requests, stop weighing
            }
            $len = EpAudit::contentLength($abs);
            if ($len > 0) {
                $weight += $len;
            }
        }
        return [
            'ttfb_ms' => (int) ($info['ttfb_ms'] ?? 0),
            'total_ms' => (int) ($info['total_ms'] ?? 0),
            'html_bytes' => $htmlBytes,
            'weight_bytes' => $weight,
            'requests' => $requests,
        ];
    }

    private static function performanceChecks(array $loading): array
    {
        $c = 'Performance';
        $kb = static fn (int $b): string => $b >= 1048576 ? round($b / 1048576, 1) . ' MB' : round($b / 1024) . ' KB';
        return [
            self::check('Time to first byte', $loading['ttfb_ms'] <= 800, 2,
                'Server responded in ' . $loading['ttfb_ms'] . ' ms (good ≤ 800 ms).',
                $loading['ttfb_ms'] > 800 ? 'Speed up the server response — caching, a faster host or a CDN typically fixes a slow TTFB.' : '', $c),
            self::check('Page weight', $loading['weight_bytes'] <= 2_500_000, 2,
                'About ' . $kb($loading['weight_bytes']) . ' across ' . $loading['requests'] . ' requests (sampled).',
                $loading['weight_bytes'] > 2_500_000 ? 'Trim the page weight — optimize images (the Image audit shows how), and minify/split JS and CSS.' : '', $c),
            self::check('Request count', $loading['requests'] <= 60, 1,
                $loading['requests'] . ' resources requested.',
                $loading['requests'] > 60 ? 'Reduce the number of requests: combine files, lazy-load below-the-fold assets, drop unused scripts.' : '', $c),
        ];
    }

    private static function check(string $label, bool $pass, int $weight, string $detail, string $fix, string $category): array
    {
        return ['label' => $label, 'pass' => $pass, 'weight' => $weight, 'detail' => $detail,
            'fix' => $pass ? '' : $fix, 'category' => $category];
    }
}
