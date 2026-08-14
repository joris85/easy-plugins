<?php
/**
 * Easy IP Check backend: given an IP address or hostname, gather everything
 * public — resolved IPs (A/AAAA), reverse DNS (PTR), the full DNS record set
 * (MX, NS, TXT, SOA, CNAME), and IP geolocation/ASN via ipwho.is. Read-only
 * lookups; shares the audit rate limiter.
 */
require __DIR__ . '/../libraries/audit/audit-lib.php';
require __DIR__ . '/../libraries/audit/audit-runner.php';

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
$query = strtolower(trim((string) (is_array($body) ? ($body['query'] ?? '') : '')));
$query = (string) preg_replace('#^https?://#', '', $query);
$query = rtrim((string) strtok($query, '/'), '.');
if ($query === '' || strlen($query) > 253 || !preg_match('/^[a-z0-9.\-:]+$/i', $query)) {
    epAuditJson(422, ['success' => false, 'error' => 'invalid_input',
        'message' => 'Enter an IP address or a domain name, like 8.8.8.8 or example.com.']);
}

$isIp = filter_var($query, FILTER_VALIDATE_IP) !== false;
$cacheKey = 'ip:' . $query;
$refresh = is_array($body) && !empty($body['refresh']);
if (!$refresh && ($cached = epAuditCacheGet('ipcheck', $cacheKey)) !== null) {
    epAuditJson(200, ['success' => true, 'cached' => true, 'result' => $cached]);
}
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (!epAuditRateAllow($ip)) {
    epAuditJson(429, ['success' => false, 'error' => 'rate_limited',
        'message' => 'Free lookups are limited to 5 per 10 minutes. Please try again shortly.']);
}

set_time_limit(30);

$result = ['query' => $query, 'is_ip' => $isIp, 'hostname' => null, 'ips' => [], 'dns' => [], 'geo' => null];

if ($isIp) {
    $result['ips'][] = $query;
    $ptr = @gethostbyaddr($query);
    if ($ptr !== false && $ptr !== $query) {
        $result['hostname'] = $ptr;
    }
    $result['geo'] = epIpGeo($query);
} else {
    $result['hostname'] = $query;
    // A + AAAA
    foreach ((array) @dns_get_record($query, DNS_A) as $r) {
        if (!empty($r['ip'])) $result['ips'][] = $r['ip'];
    }
    foreach ((array) @dns_get_record($query, DNS_AAAA) as $r) {
        if (!empty($r['ipv6'])) $result['ips'][] = $r['ipv6'];
    }
    $result['ips'] = array_values(array_unique($result['ips']));
    // Full record set for a hostname.
    $result['dns'] = epDnsRecords($query);
    // Geo for the first resolved IPv4.
    foreach ($result['ips'] as $addr) {
        if (filter_var($addr, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) { $result['geo'] = epIpGeo($addr); break; }
    }
}

$result['generated_at'] = gmdate('c');
epAuditCachePut('ipcheck', $cacheKey, $result);
epAuditJson(200, ['success' => true, 'cached' => false, 'result' => $result]);

/** Collect MX, NS, TXT, SOA, CNAME records for a hostname. */
function epDnsRecords(string $host): array
{
    $out = [];
    foreach ((array) @dns_get_record($host, DNS_MX) as $r) {
        $out['MX'][] = ['host' => $r['target'] ?? '', 'priority' => $r['pri'] ?? 0];
    }
    foreach ((array) @dns_get_record($host, DNS_NS) as $r) {
        $out['NS'][] = $r['target'] ?? '';
    }
    foreach ((array) @dns_get_record($host, DNS_TXT) as $r) {
        if (!empty($r['txt'])) $out['TXT'][] = $r['txt'];
    }
    foreach ((array) @dns_get_record($host, DNS_CNAME) as $r) {
        if (!empty($r['target'])) $out['CNAME'][] = $r['target'];
    }
    $soa = @dns_get_record($host, DNS_SOA);
    if (is_array($soa) && $soa !== []) {
        $s = $soa[0];
        $out['SOA'] = ['mname' => $s['mname'] ?? '', 'rname' => $s['rname'] ?? '', 'serial' => $s['serial'] ?? null];
    }
    return $out;
}

/** IP geolocation + ASN via ipwho.is (keyless, HTTPS). Null on failure. */
function epIpGeo(string $ip): ?array
{
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        return null; // don't geolocate private/reserved addresses
    }
    $ch = curl_init('https://ipwho.is/' . rawurlencode($ip));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_USERAGENT => 'easy-plugins-ipcheck/1.0',
    ]);
    $raw = curl_exec($ch);
    curl_close($ch);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($data) || empty($data['success'])) {
        return null;
    }
    return [
        'country' => $data['country'] ?? null,
        'country_code' => $data['country_code'] ?? null,
        'region' => $data['region'] ?? null,
        'city' => $data['city'] ?? null,
        'latitude' => $data['latitude'] ?? null,
        'longitude' => $data['longitude'] ?? null,
        'org' => $data['connection']['org'] ?? null,
        'isp' => $data['connection']['isp'] ?? null,
        'asn' => $data['connection']['asn'] ?? null,
        'domain' => $data['connection']['domain'] ?? null,
    ];
}
