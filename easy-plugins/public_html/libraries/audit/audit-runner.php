<?php
/**
 * Shared JSON API glue for the free audit tools: validates the URL, applies
 * the per-IP rate limit (all three tools share one bucket) and the per-URL
 * result cache, then runs the audit callback. Each tool's api.php does:
 *
 *   require __DIR__ . '/../libraries/audit/audit-lib.php';
 *   require __DIR__ . '/../libraries/audit/audit-runner.php';
 *   epAuditRespond('links', fn (string $url): array => EpLinkAudit::run($url));
 */

const EP_AUDIT_RATE_MAX = 5;        // runs...
const EP_AUDIT_RATE_WINDOW = 600;   // ...per this many seconds, per IP
const EP_AUDIT_CACHE_TTL = 600;     // repeat clicks on the same URL are free

function epAuditDataDir(): string
{
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    return $dir;
}

/** Prune stale rate/cache files so the data dir never grows unbounded. */
function epAuditSweep(string $dir): void
{
    if (random_int(1, 20) !== 1) {
        return; // sweep on ~5% of requests
    }
    // Only sweep short-lived rate and cache files. The RDAP bootstrap
    // (rdap-bootstrap.json) is a deliberate 7-day cache — never sweep it.
    foreach (array_merge((array) glob($dir . '/rate-*.json'), (array) glob($dir . '/cache-*.json')) as $file) {
        if (is_file($file) && filemtime($file) < time() - 2 * EP_AUDIT_RATE_WINDOW) {
            @unlink($file);
        }
    }
}

/** True when this IP still has runs left; records the run when allowed. */
function epAuditRateAllow(string $ip): bool
{
    $dir = epAuditDataDir();
    epAuditSweep($dir);
    $file = $dir . '/rate-' . hash('sha256', 'ep-audit|' . $ip) . '.json';
    $now = time();
    $fh = fopen($file, 'c+');
    if ($fh === false) {
        return true; // storage trouble should not take the tool down
    }
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $times = array_values(array_filter(
        is_string($raw) ? (array) json_decode($raw, true) : [],
        static fn ($t) => is_int($t) && $t > $now - EP_AUDIT_RATE_WINDOW
    ));
    $allowed = count($times) < EP_AUDIT_RATE_MAX;
    if ($allowed) {
        $times[] = $now;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, (string) json_encode($times));
    }
    flock($fh, LOCK_UN);
    fclose($fh);
    return $allowed;
}

function epAuditCacheGet(string $tool, string $url): ?array
{
    $file = epAuditDataDir() . '/cache-' . $tool . '-' . hash('sha256', $url) . '.json';
    if (!is_file($file) || filemtime($file) < time() - EP_AUDIT_CACHE_TTL) {
        return null;
    }
    $data = json_decode((string) file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

function epAuditCachePut(string $tool, string $url, array $result): void
{
    @file_put_contents(
        epAuditDataDir() . '/cache-' . $tool . '-' . hash('sha256', $url) . '.json',
        (string) json_encode($result),
        LOCK_EX
    );
}

function epAuditJson(int $status, array $payload): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * @param string   $tool  cache namespace ('seo' | 'links' | 'images')
 * @param callable $audit fn (string $url): array
 */
function epAuditRespond(string $tool, callable $audit): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        epAuditJson(405, ['success' => false, 'error' => 'method_not_allowed', 'message' => 'POST only.']);
    }
    // Same-origin gate: browsers always send Origin on cross-site POSTs.
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    $selfHost = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', $selfHost)
        && parse_url($origin, PHP_URL_HOST) . ':' . parse_url($origin, PHP_URL_PORT) !== $selfHost) {
        epAuditJson(403, ['success' => false, 'error' => 'forbidden', 'message' => 'Cross-origin requests are not allowed.']);
    }

    $body = json_decode((string) file_get_contents('php://input'), true);
    $url = EpAudit::normalizeInput((string) (is_array($body) ? ($body['url'] ?? '') : ''));
    if ($url === '' || strlen($url) > 2000 || !EpAudit::safeUrl($url)) {
        epAuditJson(422, ['success' => false, 'error' => 'invalid_url',
            'message' => 'Enter a public website address, like example.com.']);
    }
    $url = EpAudit::norm($url);
    $lang = (is_array($body) && ($body['lang'] ?? '') === 'nl') ? 'nl' : 'en';
    $cacheKey = $tool . '-' . $lang; // results differ by language

    // {refresh: true} skips the cache read (rate limit still applies, so
    // refresh spam costs the visitor their own quota, not our server).
    $refresh = is_array($body) && !empty($body['refresh']);
    if (!$refresh && ($cached = epAuditCacheGet($cacheKey, $url)) !== null) {
        epAuditJson(200, ['success' => true, 'cached' => true, 'result' => $cached]);
    }

    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    if (!epAuditRateAllow($ip)) {
        epAuditJson(429, ['success' => false, 'error' => 'rate_limited',
            'message' => 'Free audits are limited to ' . EP_AUDIT_RATE_MAX . ' runs per ' . (EP_AUDIT_RATE_WINDOW / 60)
                . ' minutes. Please try again in a bit, or run unlimited audits in Easy Studio.']);
    }

    set_time_limit(75);
    ignore_user_abort(false);
    $result = $audit($url, $lang);

    if (isset($result['error'])) {
        // Never score a site that just blocked us (gotcha #6).
        epAuditJson(502, ['success' => false, 'error' => (string) $result['error'],
            'message' => 'Could not load that page. The site may be down, very slow, or blocking automated tools.']);
    }
    $result['url'] = $url;
    $result['generated_at'] = gmdate('c');
    epAuditCachePut($cacheKey, $url, $result);
    epAuditJson(200, ['success' => true, 'cached' => false, 'result' => $result]);
}
