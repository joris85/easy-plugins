/**
 * Easy IP Check — look up an IP or hostname and show resolved IPs, reverse
 * DNS, the full DNS record set and IP geolocation/ASN. Talks to api.php.
 */
(function () {
    'use strict';

    const isNl = document.documentElement.lang === 'nl';
    const t = (en, nl) => (isNl ? nl : en);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const form = document.getElementById('ipForm');
    const input = document.getElementById('ipQuery');
    const button = document.getElementById('ipRunBtn');
    const statusBox = document.getElementById('ipStatus');
    const errorBox = document.getElementById('ipError');
    const resultsBox = document.getElementById('ipResults');

    form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value.trim(), true); });
    const exampleLink = document.getElementById('ipExample');
    if (exampleLink) exampleLink.addEventListener('click', (e) => { e.preventDefault(); run('easy-plugins.com', true); });

    async function run(query, pushUrl) {
        if (!query) { input.focus(); return; }
        input.value = query;
        if (pushUrl) {
            try { const u = new URL(location.href); u.searchParams.set('q', query); history.replaceState({}, '', u); } catch (e) {}
        }
        button.disabled = true;
        errorBox.style.display = 'none';
        resultsBox.style.display = 'none';
        statusBox.style.display = 'block';
        statusBox.innerHTML = '<div class="spinner-border" role="status"></div><p class="mt-2 mb-0">' + esc(t('Looking it up…', 'Aan het opzoeken…')) + '</p>';
        try {
            const res = await fetch('api.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await res.json().catch(() => ({ success: false }));
            statusBox.style.display = 'none';
            if (!res.ok || !data.success) {
                showError(data.message || t('Something went wrong. Please try again.', 'Er ging iets mis. Probeer het opnieuw.'));
                return;
            }
            render(data.result);
        } catch (e) {
            statusBox.style.display = 'none';
            showError(t('Could not reach the lookup service.', 'Kon de opzoekservice niet bereiken.'));
        } finally {
            button.disabled = false;
        }
    }

    function showError(msg) {
        errorBox.style.display = 'block';
        errorBox.innerHTML = '<div class="alert alert-warning mb-0"><i class="fas fa-exclamation-triangle me-2"></i>' + esc(msg) + '</div>';
    }

    function row(label, value) {
        return '<tr><th>' + esc(label) + '</th><td>' + value + '</td></tr>';
    }

    function render(r) {
        let html = '<h2 class="h5 mb-3">' + esc(r.query) + '</h2>';

        // Overview
        html += '<div class="card mb-3"><div class="card-body"><table class="ip-table">';
        html += row(t('Resolved IP(s)', 'IP-adres(sen)'), r.ips.length
            ? r.ips.map((ip) => '<code>' + esc(ip) + '</code>').join(' ')
            : '<span class="text-muted">' + esc(t('none', 'geen')) + '</span>');
        if (r.hostname) html += row(t('Hostname (PTR)', 'Hostnaam (PTR)'), '<code>' + esc(r.hostname) + '</code>');
        html += '</table></div></div>';

        // Geolocation / ASN
        if (r.geo) {
            const g = r.geo;
            const place = [g.city, g.region, g.country].filter(Boolean).join(', ');
            html += '<div class="card mb-3"><div class="card-body"><h3 class="h6 mb-2"><i class="fas fa-location-dot me-2"></i>'
                + esc(t('Location & network', 'Locatie & netwerk')) + '</h3><table class="ip-table">';
            if (place) html += row(t('Location', 'Locatie'), esc(place) + (g.country_code ? ' (' + esc(g.country_code) + ')' : ''));
            if (g.isp) html += row('ISP', esc(g.isp));
            if (g.org && g.org !== g.isp) html += row(t('Organization', 'Organisatie'), esc(g.org));
            if (g.asn) html += row('ASN', esc(g.asn) + (g.domain ? ' — ' + esc(g.domain) : ''));
            if (g.latitude && g.longitude) {
                html += row(t('Coordinates', 'Coördinaten'),
                    '<a href="https://www.openstreetmap.org/?mlat=' + encodeURIComponent(g.latitude) + '&mlon=' + encodeURIComponent(g.longitude)
                    + '#map=10/' + encodeURIComponent(g.latitude) + '/' + encodeURIComponent(g.longitude) + '" target="_blank" rel="noopener">'
                    + esc(g.latitude) + ', ' + esc(g.longitude) + ' <i class="fas fa-external-link-alt fa-xs"></i></a>');
            }
            html += '</table></div></div>';
        }

        // DNS records
        const dns = r.dns || {};
        const hasDns = Object.keys(dns).length > 0;
        if (hasDns) {
            html += '<div class="card"><div class="card-body"><h3 class="h6 mb-2"><i class="fas fa-server me-2"></i>'
                + esc(t('DNS records', 'DNS-records')) + '</h3><table class="ip-table">';
            if (dns.MX) html += row('MX', dns.MX.sort((a, b) => a.priority - b.priority).map((m) => esc(m.priority + '  ' + m.host)).join('<br>'));
            if (dns.NS) html += row('NS', dns.NS.map(esc).join('<br>'));
            if (dns.CNAME) html += row('CNAME', dns.CNAME.map(esc).join('<br>'));
            if (dns.TXT) html += row('TXT', dns.TXT.map((x) => '<span class="ip-txt">' + esc(x) + '</span>').join('<br>'));
            if (dns.SOA) html += row('SOA', esc(dns.SOA.mname) + ' / ' + esc(dns.SOA.rname));
            html += '</table></div></div>';
        }

        resultsBox.innerHTML = html;
        resultsBox.style.display = 'block';
    }

    // Deep link ?q=
    try {
        const q = new URL(location.href).searchParams.get('q');
        if (q) run(q.trim(), false);
    } catch (e) {}
})();
