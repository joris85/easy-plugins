<?php
/**
 * Domain availability checker for easy-domain-check. Strategy per domain:
 *
 *   1. DNS NS lookup (free, no rate limits) — NS records present means the
 *      domain is definitely taken, no registry query needed. This resolves
 *      the vast majority of checks.
 *   2. No NS: query the registry's own RDAP endpoint (the modern WHOIS,
 *      HTTP + JSON, keyless). 404 = available, 200 = registered but unused.
 *      Registries rate-limit anonymous RDAP, which is why it is the second
 *      step, not the first, and why results are cached.
 *   3. TLD without public RDAP (.io/.co/.be/.de/.eu/.me): no NS records can
 *      only mean "probably available" — reported honestly as such.
 */

final class EpDomainCheck
{
    /** TLDs checked for a bare name, with their RDAP base (null = DNS only). */
    public const TLDS = [
        'com' => 'https://rdap.verisign.com/com/v1/',
        'nl' => 'https://rdap.sidn.nl/',
        'net' => 'https://rdap.verisign.com/net/v1/',
        'org' => 'https://rdap.publicinterestregistry.org/rdap/',
        'be' => null,
        'de' => null,
        'eu' => null,
        'io' => null,
        'co' => null,
        'dev' => 'https://pubapi.registry.google/rdap/',
        'app' => 'https://pubapi.registry.google/rdap/',
        'shop' => 'https://rdap.gmoregistry.net/rdap/',
    ];

    /** @return array{error?:string, name?:string, results?:array} */
    public static function run(string $input): array
    {
        $input = strtolower(trim($input));
        $input = (string) preg_replace('#^https?://#', '', $input);
        $input = (string) preg_replace('#^www\.#', '', $input);
        $input = rtrim((string) strtok($input, '/'), '.');

        // Split into label + optional TLD the user typed.
        $typedTld = null;
        $label = $input;
        if (str_contains($input, '.')) {
            $parts = explode('.', $input);
            $typedTld = array_pop($parts);
            $label = implode('.', $parts);
            $label = str_replace('.', '-', $label); // sub.name → sub-name for the other TLDs
        }
        if (!self::validLabel($label)) {
            return ['error' => 'invalid_name'];
        }

        $tlds = self::TLDS;
        if ($typedTld !== null && !isset($tlds[$typedTld]) && self::validLabel($typedTld)) {
            // The typed TLD is outside our list: check it too, DNS-first,
            // RDAP only if the IANA bootstrap (cached) knows an endpoint.
            $tlds = [$typedTld => self::rdapBaseFor($typedTld)] + $tlds;
        } elseif ($typedTld !== null && isset($tlds[$typedTld])) {
            // Put the typed TLD first.
            $tlds = [$typedTld => $tlds[$typedTld]] + $tlds;
        }

        // Pass 1: DNS — settles most domains as taken.
        $results = [];
        $needRdap = [];
        foreach ($tlds as $tld => $rdapBase) {
            $domain = $label . '.' . $tld;
            $ns = @dns_get_record($domain, DNS_NS);
            if (is_array($ns) && $ns !== []) {
                $results[$tld] = ['domain' => $domain, 'status' => 'taken', 'via' => 'dns'];
            } else {
                $needRdap[$tld] = ['domain' => $domain, 'base' => $rdapBase];
            }
        }

        // Pass 2: parallel RDAP for the domains DNS could not settle.
        foreach (self::rdapBatch($needRdap) as $tld => $res) {
            $results[$tld] = $res;
        }

        // Keep the TLD order.
        $ordered = [];
        foreach (array_keys($tlds) as $tld) {
            if (isset($results[$tld])) {
                $ordered[] = $results[$tld];
            }
        }
        return ['name' => $label, 'typed_tld' => $typedTld, 'results' => $ordered];
    }

    public static function validLabel(string $label): bool
    {
        return $label !== '' && strlen($label) <= 63
            && (bool) preg_match('/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/', $label);
    }

    /** RDAP base for an arbitrary TLD from the IANA bootstrap, cached 7 days. */
    private static function rdapBaseFor(string $tld): ?string
    {
        $cache = __DIR__ . '/data/rdap-bootstrap.json';
        $map = null;
        if (is_file($cache) && filemtime($cache) > time() - 7 * 86400) {
            $map = json_decode((string) file_get_contents($cache), true);
        }
        if (!is_array($map)) {
            $raw = EpAudit::fetch('https://data.iana.org/rdap/dns.json', 2 * 1024 * 1024, 10);
            $data = is_string($raw) ? json_decode($raw, true) : null;
            $map = [];
            foreach ((array) ($data['services'] ?? []) as $svc) {
                foreach ((array) ($svc[0] ?? []) as $t) {
                    $map[$t] = rtrim((string) ($svc[1][0] ?? ''), '/') . '/';
                }
            }
            if ($map !== []) {
                @file_put_contents($cache, (string) json_encode($map), LOCK_EX);
            }
        }
        $base = $map[$tld] ?? null;
        return (is_string($base) && str_starts_with($base, 'https://')) ? $base : null;
    }

    /**
     * @param array<string, array{domain:string, base:?string}> $jobs
     * @return array<string, array>
     */
    private static function rdapBatch(array $jobs): array
    {
        $out = [];
        $mh = curl_multi_init();
        $handles = [];
        foreach ($jobs as $tld => $job) {
            if ($job['base'] === null) {
                // No RDAP for this TLD: no NS + nothing to ask the registry.
                $out[$tld] = ['domain' => $job['domain'], 'status' => 'maybe', 'via' => 'dns'];
                continue;
            }
            $ch = curl_init($job['base'] . 'domain/' . $job['domain']);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
                CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
                CURLOPT_MAXREDIRS => 3,
                CURLOPT_TIMEOUT => 8,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_USERAGENT => EpAudit::UA,
                CURLOPT_HTTPHEADER => ['Accept: application/rdap+json'],
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[$tld] = ['ch' => $ch, 'domain' => $job['domain']];
        }
        if ($handles !== []) {
            do {
                $status = curl_multi_exec($mh, $running);
                if ($running) {
                    curl_multi_select($mh, 1.0);
                }
            } while ($running && $status === CURLM_OK);
        }
        foreach ($handles as $tld => $h) {
            $code = (int) curl_getinfo($h['ch'], CURLINFO_RESPONSE_CODE);
            $body = (string) curl_multi_getcontent($h['ch']);
            curl_multi_remove_handle($mh, $h['ch']);
            curl_close($h['ch']);
            if ($code === 404) {
                $out[$tld] = ['domain' => $h['domain'], 'status' => 'available', 'via' => 'rdap'];
            } elseif ($code === 200) {
                $out[$tld] = ['domain' => $h['domain'], 'status' => 'taken', 'via' => 'rdap']
                    + self::rdapDetails($body);
            } else {
                // 429 or errors: the registry would not tell us — be honest.
                $out[$tld] = ['domain' => $h['domain'], 'status' => 'maybe', 'via' => 'rdap'];
            }
        }
        curl_multi_close($mh);
        return $out;
    }

    /** Registration year and expiry date from an RDAP domain object. */
    private static function rdapDetails(string $json): array
    {
        $data = json_decode($json, true);
        if (!is_array($data)) {
            return [];
        }
        $details = [];
        foreach ((array) ($data['events'] ?? []) as $event) {
            $action = $event['eventAction'] ?? '';
            $date = (string) ($event['eventDate'] ?? '');
            if ($action === 'registration' && $date !== '') {
                $details['registered'] = substr($date, 0, 4);
            } elseif ($action === 'expiration' && $date !== '') {
                $details['expires'] = substr($date, 0, 10);
            }
        }
        return $details;
    }
}
