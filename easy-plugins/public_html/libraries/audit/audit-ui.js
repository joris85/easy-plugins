/**
 * Shared front-end for the free audit tools. The page declares:
 *   <form id="auditForm" data-audit-tool="seo|links|images" data-audit-api="api.php">
 * and containers #auditStatus, #auditError, #auditResults.
 */
(function () {
    'use strict';

    const form = document.getElementById('auditForm');
    if (!form) return;

    const tool = form.dataset.auditTool;
    const api = form.dataset.auditApi || 'api.php';
    const input = document.getElementById('auditUrl');
    const button = document.getElementById('auditRunBtn');
    const statusBox = document.getElementById('auditStatus');
    const errorBox = document.getElementById('auditError');
    const resultsBox = document.getElementById('auditResults');
    const isNl = document.documentElement.lang === 'nl';

    const t = (en, nl) => (isNl ? nl : en);

    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const kb = (bytes) => bytes >= 1048576
        ? (bytes / 1048576).toFixed(1) + ' MB'
        : Math.round(bytes / 1024) + ' KB';

    const scoreClass = (s) => (s >= 80 ? 'audit-score-good' : s >= 50 ? 'audit-score-mid' : 'audit-score-bad');
    const badgeClass = (s) => (s >= 80 ? 'audit-badge-ok' : s >= 50 ? 'audit-badge-warn' : 'audit-badge-bad');

    let forceRefresh = false;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = input.value.trim();
        if (!url) { input.focus(); return; }
        const refresh = forceRefresh;
        forceRefresh = false;

        button.disabled = true;
        errorBox.style.display = 'none';
        resultsBox.style.display = 'none';
        resultsBox.innerHTML = '';
        statusBox.style.display = 'block';
        statusBox.innerHTML = '<div class="spinner-border" role="status" aria-hidden="true"></div><p class="mt-2 mb-0">'
            + esc(t('Auditing the page, this can take up to a minute…', 'De pagina wordt gecontroleerd, dit kan tot een minuut duren…')) + '</p>';

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 95000);
        try {
            const res = await fetch(api, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(refresh ? { url, refresh: true } : { url }),
                signal: controller.signal
            });
            const data = await res.json().catch(() => ({ success: false, error: 'bad_response' }));
            statusBox.style.display = 'none';
            if (!res.ok || !data.success) {
                showError(errorMessage(data));
                return;
            }
            render(data.result, !!data.cached);
        } catch (err) {
            statusBox.style.display = 'none';
            showError(err.name === 'AbortError'
                ? t('The audit took too long and was stopped. The site may be very slow. Please try again.',
                    'De audit duurde te lang en is gestopt. De site is mogelijk erg traag. Probeer het opnieuw.')
                : t('Could not reach the audit service. Check your connection and try again.',
                    'Kon de auditservice niet bereiken. Controleer je verbinding en probeer opnieuw.'));
        } finally {
            clearTimeout(timer);
            button.disabled = false;
        }
    });

    // Translated messages per known error code, so a Dutch page never shows an
    // English server string. Falls back to the server message, then a generic.
    function errorMessage(data) {
        const code = data && data.error;
        const map = {
            invalid_url: t('Enter a public website address, like example.com.', 'Vul een openbaar webadres in, bijvoorbeeld example.com.'),
            invalid_name: t('That does not look like a valid name. Use letters, digits and hyphens.', 'Dat lijkt geen geldige naam. Gebruik letters, cijfers en koppeltekens.'),
            rate_limited: t('Free audits are limited to 5 runs per 10 minutes. Please try again in a bit.', 'Gratis audits zijn beperkt tot 5 keer per 10 minuten. Probeer het zo weer.'),
            fetch_failed: t('Could not load that page. The site may be down, very slow, or blocking automated tools.', 'Kon die pagina niet laden. De site is mogelijk offline, erg traag, of blokkeert geautomatiseerde tools.'),
            forbidden: t('That request was blocked. Please reload the page and try again.', 'Dat verzoek is geblokkeerd. Herlaad de pagina en probeer opnieuw.'),
            method_not_allowed: t('Something went wrong. Please reload the page.', 'Er ging iets mis. Herlaad de pagina.'),
            bad_response: t('The audit service returned an unexpected response. Please try again.', 'De auditservice gaf een onverwacht antwoord. Probeer het opnieuw.')
        };
        return map[code] || (data && data.message) || t('Something went wrong. Please try again.', 'Er ging iets mis. Probeer het opnieuw.');
    }

    function showError(message) {
        errorBox.style.display = 'block';
        errorBox.innerHTML = '<div class="alert alert-warning mb-0"><i class="fas fa-exclamation-triangle me-2"></i>' + esc(message) + '</div>';
    }

    function scoreHeader(result, cached, subtitle) {
        return '<div class="audit-score-row">'
            + '<div class="audit-score-badge ' + scoreClass(result.score) + '"><span>' + esc(result.score) + '</span><small>/ 100</small></div>'
            + '<div class="audit-score-meta"><h2>' + esc(result.url) + '</h2><p>' + esc(subtitle)
            + (cached
                ? ' · ' + esc(t('cached result', 'resultaat uit cache'))
                    + ' <a href="#" id="auditRefreshLink">' + esc(t('check again', 'opnieuw checken')) + '</a>'
                : '')
            + '</p></div>'
            + '</div>';
    }

    function stat(value, label) {
        return '<div class="audit-stat"><b>' + value + '</b><span>' + esc(label) + '</span></div>';
    }

    function render(result, cached) {
        let html = '';
        if (tool === 'seo') html = renderSeo(result, cached);
        else if (tool === 'links') html = renderLinks(result, cached);
        else if (tool === 'domain') html = renderDomains(result, cached);
        else html = renderImages(result, cached);
        resultsBox.innerHTML = html;
        resultsBox.style.display = 'block';
        const refreshLink = document.getElementById('auditRefreshLink');
        if (refreshLink) {
            refreshLink.addEventListener('click', (e) => {
                e.preventDefault();
                forceRefresh = true;
                form.requestSubmit();
            });
        }
        resultsBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderSeo(r, cached) {
        const s = r.summary;
        let html = scoreHeader(r, cached, t('Website audit of one page', 'Website-audit van één pagina'));
        html += '<div class="audit-stats">'
            + stat(esc(s.checks_passed) + ' / ' + esc(s.checks_total), t('checks passed', 'checks geslaagd'))
            + stat(esc(s.ttfb_ms) + ' ms', t('server response', 'serverreactie'))
            + stat(kb(s.weight_kb * 1024), t('page weight', 'paginagewicht'))
            + stat(esc(s.requests), t('requests', 'requests'))
            + '</div>';
        if (r.findings.recommendations.length) {
            html += '<div class="audit-recs"><h3><i class="fas fa-list-check me-2"></i>' + esc(t('What to fix first', 'Wat je eerst aanpakt')) + '</h3><ol>'
                + r.findings.recommendations.map((rec) => '<li>' + esc(rec) + '</li>').join('')
                + '</ol></div>';
        }
        for (const cat of r.findings.categories) {
            html += '<div class="audit-category"><div class="audit-category__head"><span>' + esc(cat.name) + '</span>'
                + '<span class="audit-category__score ' + badgeClass(cat.score) + '">' + esc(cat.score) + '</span></div>';
            for (const c of cat.checks) {
                html += '<div class="audit-check"><i class="fas ' + (c.pass ? 'fa-check-circle' : 'fa-times-circle') + '"></i>'
                    + '<div><span class="audit-check__label">' + esc(c.label) + '</span> '
                    + '<span class="audit-check__detail">' + esc(c.detail) + '</span>'
                    + (!c.pass && c.fix ? '<span class="audit-check__fix"><i class="fas fa-wrench me-1"></i>' + esc(c.fix) + '</span>' : '')
                    + '</div></div>';
            }
            html += '</div>';
        }
        return html;
    }

    function renderLinks(r, cached) {
        const s = r.summary;
        let html = scoreHeader(r, cached,
            t('Checked ' + s.links_checked + ' links on ' + s.pages_scanned + ' page(s)',
                s.links_checked + ' links gecontroleerd op ' + s.pages_scanned + ' pagina(’s)'));
        html += '<div class="audit-stats">'
            + stat(esc(s.links_checked), t('links checked', 'links gecontroleerd'))
            + stat(esc(s.broken), t('broken', 'kapot'))
            + stat(esc(s.blocked), t('blocked (probably fine)', 'geblokkeerd (waarschijnlijk ok)'))
            + stat(esc(s.pages_scanned), t('pages scanned', 'pagina’s gescand'))
            + '</div>';
        if (s.links_skipped > 0) {
            html += '<p class="audit-note">' + esc(t(
                s.links_skipped + ' more links were not checked (free limit: 40 per run). The full version in Easy Studio checks everything.',
                s.links_skipped + ' andere links zijn niet gecontroleerd (gratis limiet: 40 per run). De volledige versie in Easy Studio controleert alles.')) + '</p>';
        }
        if (!r.findings.broken.length && !r.findings.blocked.length) {
            html += '<div class="audit-all-good"><i class="fas fa-check-circle me-2"></i>'
                + esc(t('No broken links found. Nice and tidy!', 'Geen kapotte links gevonden. Netjes!')) + '</div>';
            return html;
        }
        if (r.findings.broken.length) {
            html += linkTable(t('Broken links', 'Kapotte links'), r.findings.broken, 'audit-badge-bad');
        }
        if (r.findings.blocked.length) {
            html += '<p class="audit-note">' + esc(t(
                'Blocked links answered with a bot-blocking status (403/999). They usually work fine in a normal browser.',
                'Geblokkeerde links gaven een bot-blokkeerstatus (403/999). In een gewone browser werken ze meestal prima.')) + '</p>';
            html += linkTable(t('Blocked links', 'Geblokkeerde links'), r.findings.blocked, 'audit-badge-muted');
        }
        return html;
    }

    function linkTable(title, rows, badge) {
        let html = '<h3 class="h5 mb-2">' + esc(title) + ' (' + rows.length + ')</h3><div class="audit-table-wrap"><table class="audit-table"><thead><tr>'
            + '<th>' + esc(t('Link', 'Link')) + '</th><th>' + esc(t('Status', 'Status')) + '</th><th>' + esc(t('Found on', 'Gevonden op')) + '</th></tr></thead><tbody>';
        for (const row of rows) {
            const src = row.sources && row.sources[0] ? row.sources[0] : null;
            const linkCell = /^https?:\/\//i.test(row.url)
                ? '<a href="' + esc(row.url) + '" target="_blank" rel="noopener nofollow">' + esc(row.url) + '</a>'
                : esc(row.url);
            html += '<tr><td class="audit-url">' + linkCell + (row.internal ? '' : ' <i class="fas fa-external-link-alt fa-xs text-muted"></i>') + '</td>'
                + '<td><span class="audit-badge ' + badge + '">' + (row.status === 0 ? esc(t('no response', 'geen reactie')) : esc(row.status)) + '</span></td>'
                + '<td class="audit-url">' + (src ? esc(src.page) + (src.anchor ? '<br><small class="text-muted">“' + esc(src.anchor) + '”</small>' : '') : '') + '</td></tr>';
        }
        return html + '</tbody></table></div>';
    }

    function renderDomains(r, cached) {
        const available = r.results.filter((x) => x.status === 'available').length;
        let html = '<div class="audit-score-row">'
            + '<div class="audit-score-badge ' + (available > 0 ? 'audit-score-good' : 'audit-score-mid') + '"><span>' + available + '</span><small>' + esc(t('available', 'beschikbaar')) + '</small></div>'
            + '<div class="audit-score-meta"><h2>' + esc(r.name) + '</h2><p>'
            + esc(t('Checked ' + r.results.length + ' extensions with live registry data', r.results.length + ' extensies gecheckt met live registerdata'))
            + (cached ? ' · ' + esc(t('cached result', 'resultaat uit cache')) + ' <a href="#" id="auditRefreshLink">' + esc(t('check again', 'opnieuw checken')) + '</a>' : '')
            + '</p></div></div>';
        html += '<div class="domain-grid">';
        for (const res of r.results) {
            let cls = 'domain-card--maybe';
            let badge = '<span class="audit-badge audit-badge-warn">' + esc(t('verify', 'verifieer')) + '</span>';
            let sub = t('probably free — verify at a registrar', 'waarschijnlijk vrij — check bij een registrar');
            if (res.status === 'available') {
                cls = 'domain-card--available';
                badge = '<span class="audit-badge audit-badge-ok">' + esc(t('available', 'beschikbaar')) + '</span>';
                sub = t('confirmed by the registry', 'bevestigd door het register');
            } else if (res.status === 'taken') {
                cls = 'domain-card--taken';
                badge = '<span class="audit-badge audit-badge-muted">' + esc(t('taken', 'bezet')) + '</span>';
                sub = res.registered ? t('registered since ' + res.registered, 'geregistreerd sinds ' + res.registered) : t('registered', 'geregistreerd');
            }
            html += '<div class="domain-card ' + cls + '"><span class="domain-card__name">' + esc(res.domain)
                + '<span class="domain-card__sub">' + esc(sub) + '</span></span>' + badge + '</div>';
        }
        html += '</div>';
        html += '<p class="audit-note">' + esc(t(
            '"Available" and "taken" come straight from the domain registries (RDAP/DNS). Extensions marked "verify" have no public registry API; their status is based on DNS only.',
            '"Beschikbaar" en "bezet" komen rechtstreeks van de domeinregisters (RDAP/DNS). Extensies met "verifieer" hebben geen publieke register-API; die status is alleen op DNS gebaseerd.')) + '</p>';
        return html;
    }

    function renderImages(r, cached) {
        const s = r.summary;
        let html = scoreHeader(r, cached, t('Image audit of one page', 'Afbeeldingen-audit van één pagina'));
        if (s.js_rendered) {
            html += '<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>' + esc(t(
                'This page is rendered by JavaScript: its images are added by scripts after loading, so crawlers (including this one, and search engines) cannot see them in the HTML.',
                'Deze pagina wordt door JavaScript opgebouwd: de afbeeldingen worden na het laden door scripts toegevoegd, dus crawlers (ook deze, en zoekmachines) zien ze niet in de HTML.')) + '</div>';
        }
        html += '<div class="audit-stats">'
            + stat(esc(s.images), t('images checked', 'afbeeldingen gecheckt'))
            + stat(kb(s.savable_bytes), t('savable (' + s.savable_pct + '%)', 'te besparen (' + s.savable_pct + '%)'))
            + stat(esc(s.legacy_format), t('older format (JPG/PNG)', 'ouder formaat (JPG/PNG)'))
            + stat(esc(s.oversized), t('oversized', 'te groot geleverd'))
            + stat(esc(s.missing_alt), t('missing alt text', 'zonder alt-tekst'))
            + '</div>';
        const imgs = r.findings.images;
        if (!imgs.length) {
            if (!s.js_rendered) {
                html += '<div class="audit-all-good"><i class="fas fa-check-circle me-2"></i>'
                    + esc(t('No images found in the page HTML.', 'Geen afbeeldingen gevonden in de HTML van de pagina.')) + '</div>';
            }
            return html;
        }
        if (s.savable_bytes > 0) {
            html += '<p class="audit-note">' + esc(t(
                'Tip: the free Easy Image tool on this site converts to WebP, resizes and compresses to an exact file size, up to 100 images per batch.',
                'Tip: de gratis Easy Image tool op deze site converteert naar WebP, verkleint en comprimeert naar een exacte bestandsgrootte, tot 100 afbeeldingen per batch.')) + '</p>';
        }
        html += '<div class="audit-table-wrap"><table class="audit-table"><thead><tr>'
            + '<th>' + esc(t('Image', 'Afbeelding')) + '</th><th>' + esc(t('Size', 'Grootte')) + '</th><th>' + esc(t('Format', 'Formaat')) + '</th>'
            + '<th>' + esc(t('Savable', 'Te besparen')) + '</th><th>' + esc(t('Issues', 'Problemen')) + '</th></tr></thead><tbody>';
        for (const img of imgs) {
            const issues = [];
            if (img.legacy) issues.push(t('older format', 'ouder formaat'));
            if (img.oversized) issues.push(t('oversized (' + img.width + 'px for a ' + img.render_w + 'px slot)', 'te groot (' + img.width + 'px voor een vak van ' + img.render_w + 'px)'));
            if (img.alt_missing) issues.push(t('no alt text', 'geen alt-tekst'));
            if (!img.lazy) issues.push(t('not lazy-loaded', 'geen lazy loading'));
            const safeUrl = /^https?:\/\//i.test(img.url) ? img.url : '';
            const nameCell = safeUrl
                ? '<a href="' + esc(safeUrl) + '" target="_blank" rel="noopener nofollow" title="' + esc(t('Open this image on the website', 'Open deze afbeelding op de website')) + '">' + esc(img.name) + ' <i class="fas fa-arrow-up-right-from-square fa-xs"></i></a>'
                : esc(img.name);
            html += '<tr><td class="audit-url">' + nameCell
                + (img.bg ? ' <small class="text-muted">(' + esc(t('background', 'achtergrond')) + ')</small>' : '')
                + '<br><small class="text-muted">' + esc(img.width) + '×' + esc(img.height) + '</small></td>'
                + '<td>' + esc(img.kb) + ' KB</td><td>' + esc(img.format.toUpperCase()) + '</td>'
                + '<td>' + (img.savable_kb > 0 ? '<span class="audit-badge audit-badge-warn">' + esc(img.savable_kb) + ' KB</span>' : '—') + '</td>'
                + '<td>' + (issues.length ? esc(issues.join(', ')) : '<span class="audit-badge audit-badge-ok">OK</span>') + '</td></tr>';
        }
        return html + '</tbody></table></div>';
    }
})();
