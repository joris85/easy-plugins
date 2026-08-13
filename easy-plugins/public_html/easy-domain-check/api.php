<?php
require __DIR__ . '/../libraries/audit/audit-lib.php';
require __DIR__ . '/../libraries/audit/audit-runner.php';
require __DIR__ . '/../libraries/audit/domain-lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    epAuditJson(405, ['success' => false, 'error' => 'method_not_allowed', 'message' => 'POST only.']);
}
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$selfHost = (string) ($_SERVER['HTTP_HOST'] ?? '');
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', $selfHost)
    && parse_url($origin, PHP_URL_HOST) . ':' . parse_url($origin, PHP_URL_PORT) !== $selfHost) {
    epAuditJson(403, ['success' => false, 'error' => 'forbidden', 'message' => 'Cross-origin requests are not allowed.']);
}

$body = json_decode((string) file_get_contents('php://input'), true);
$name = strtolower(trim((string) (is_array($body) ? ($body['url'] ?? '') : '')));
if ($name === '' || strlen($name) > 253) {
    epAuditJson(422, ['success' => false, 'error' => 'invalid_name',
        'message' => 'Enter a name to check, like "myproject" or "myproject.com".']);
}

$cacheKey = 'domain:' . $name;
$refresh = is_array($body) && !empty($body['refresh']);
if (!$refresh && ($cached = epAuditCacheGet('domain', $cacheKey)) !== null) {
    epAuditJson(200, ['success' => true, 'cached' => true, 'result' => $cached]);
}

$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (!epAuditRateAllow($ip)) {
    epAuditJson(429, ['success' => false, 'error' => 'rate_limited',
        'message' => 'Free checks are limited to 5 runs per 10 minutes. Please try again in a bit.']);
}

set_time_limit(60);
$result = EpDomainCheck::run($name);
if (isset($result['error'])) {
    epAuditJson(422, ['success' => false, 'error' => (string) $result['error'],
        'message' => 'That does not look like a valid domain name. Use letters, digits and hyphens, like "myproject".']);
}
$result['generated_at'] = gmdate('c');
epAuditCachePut('domain', $cacheKey, $result);
epAuditJson(200, ['success' => true, 'cached' => false, 'result' => $result]);
