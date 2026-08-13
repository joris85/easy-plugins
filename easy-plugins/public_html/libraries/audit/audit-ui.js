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

    // Always MB for the page-weight banner, so the unit stays consistent.
    const mb = (bytes) => (bytes / 1048576).toFixed(bytes >= 1048576 ? 2 : 3) + ' MB';

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
            + helpButton()
            + '</div>';
    }

    function helpButton() {
        return '<button type="button" class="audit-help-btn" id="auditHelpBtn">'
            + '<i class="fas fa-circle-question me-1"></i>'
            + esc(t('What do these mean?', 'Wat betekent dit?')) + '</button>';
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
        const helpBtn = document.getElementById('auditHelpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', openHelp);
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
            + '</p></div>' + helpButton() + '</div>';
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
        // Page heaviness banner: total page weight and the image share.
        if (s.page_bytes) {
            const approx = s.weight_partial ? '≈' : '~';
            html += '<div class="audit-weight">'
                + '<div class="audit-weight__item"><b>' + approx + esc(mb(s.page_bytes)) + '</b><span>' + esc(t('total page weight', 'totaal paginagewicht')) + '</span></div>'
                + '<div class="audit-weight__item"><b>' + approx + esc(mb(s.images_bytes)) + '</b><span>' + esc(t('images (' + s.images_pct_of_page + '% of page)', 'afbeeldingen (' + s.images_pct_of_page + '% van pagina)')) + '</span></div>'
                + '<div class="audit-weight__item"><b>' + approx + esc(mb(s.other_bytes)) + '</b><span>' + esc(t('scripts & styles', 'scripts & styles')) + '</span></div>'
                + '<div class="audit-weight__item"><b>' + esc(kb(s.html_bytes)) + '</b><span>' + esc(t('HTML', 'HTML')) + '</span></div>'
                + '</div>';
            html += '<p class="audit-note">' + esc(t(
                'Page weight is a close estimate: image bytes are measured exactly, other files are sized from their headers. ' + (s.weight_partial ? 'Some files were not sized (free limit reached), so the real total is a bit higher.' : ''),
                'Het paginagewicht is een goede schatting: afbeeldingen worden exact gemeten, andere bestanden op basis van hun headers. ' + (s.weight_partial ? 'Niet alle bestanden zijn gemeten (gratis limiet bereikt), dus het echte totaal ligt iets hoger.' : ''))) + '</p>';
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

    // ---- Help modal: explains every term in the current tool's results ----

    function helpContent() {
        const title = {
            seo: t('What the website audit checks', 'Wat de website-audit controleert'),
            links: t('What the link check means', 'Wat de linkcheck betekent'),
            images: t('What the image audit means', 'Wat de afbeeldingen-audit betekent'),
            domain: t('What the domain check means', 'Wat de domeincheck betekent')
        }[tool];

        const groups = {
            seo: [
                [t('The score', 'De score'), [
                    [t('Score (0–100)', 'Score (0–100)'), t('The share of checks your page passes, weighted by how much each one matters. 100 means everything passed.', 'Het aandeel checks dat je pagina haalt, gewogen naar hoe belangrijk elke check is. 100 betekent dat alles geslaagd is.')]
                ]],
                [t('Performance', 'Snelheid'), [
                    [t('Server response (TTFB)', 'Serverreactie (TTFB)'), t('Time to first byte: how quickly the server starts replying. Good is 800 ms or less.', 'Time to first byte: hoe snel de server begint te antwoorden. Goed is 800 ms of minder.')],
                    [t('Page weight', 'Paginagewicht'), t('The total download size of the page and its files. Lighter pages load faster; aim under 2.5 MB.', 'De totale downloadgrootte van de pagina en haar bestanden. Lichter laadt sneller; streef naar minder dan 2,5 MB.')],
                    [t('Requests', 'Requests'), t('How many separate files the page loads (scripts, styles, images). Fewer is faster.', 'Hoeveel losse bestanden de pagina laadt (scripts, styles, afbeeldingen). Minder is sneller.')]
                ]],
                [t('SEO & content', 'SEO & inhoud'), [
                    [t('Title tag', 'Titel-tag'), t('The clickable headline in Google results. Best around 50–60 characters.', 'De klikbare kop in Google-resultaten. Het beste rond 50–60 tekens.')],
                    [t('Meta description', 'Meta-omschrijving'), t('The grey summary under the title in search results. Aim for 120–155 characters.', 'De grijze samenvatting onder de titel in zoekresultaten. Streef naar 120–155 tekens.')],
                    [t('Single H1', 'Eén H1'), t('A page should have exactly one main heading (H1) that describes it.', 'Een pagina hoort precies één hoofdkop (H1) te hebben die de pagina beschrijft.')],
                    [t('Alt text', 'Alt-tekst'), t('A text description of an image, read by screen readers and search engines.', 'Een tekstbeschrijving van een afbeelding, gelezen door schermlezers en zoekmachines.')]
                ]],
                [t('Technical & structure', 'Techniek & structuur'), [
                    [t('HTTPS', 'HTTPS'), t('The secure padlock connection. Every site should use it.', 'De beveiligde verbinding met het slotje. Elke site zou dit moeten gebruiken.')],
                    [t('robots.txt & sitemap', 'robots.txt & sitemap'), t('Files that tell search engines what to crawl and list all your pages.', 'Bestanden die zoekmachines vertellen wat ze mogen bekijken en die al je pagina’s opsommen.')],
                    [t('Canonical', 'Canonical'), t('A tag that points to the “official” version of a page so duplicates don’t compete.', 'Een tag die naar de “officiële” versie van een pagina wijst zodat duplicaten elkaar niet beconcurreren.')],
                    [t('Noindex', 'Noindex'), t('A tag that hides a page from Google. The audit warns if it’s set by accident.', 'Een tag die een pagina verbergt voor Google. De audit waarschuwt als dit per ongeluk aanstaat.')],
                    [t('Viewport & language', 'Viewport & taal'), t('Tags that make the page work on mobile and declare its language.', 'Tags die de pagina op mobiel laten werken en de taal aangeven.')]
                ]],
                [t('Structured data & social', 'Structured data & social'), [
                    [t('Structured data (JSON-LD)', 'Structured data (JSON-LD)'), t('Hidden data that helps Google show rich results (stars, prices, FAQs).', 'Verborgen data die Google helpt rijke resultaten te tonen (sterren, prijzen, FAQ’s).')],
                    [t('Open Graph / Twitter Card', 'Open Graph / Twitter Card'), t('Tags that control the title and image shown when a link is shared on social media.', 'Tags die bepalen welke titel en afbeelding verschijnen als een link op social media wordt gedeeld.')]
                ]]
            ],
            links: [
                [t('Results', 'Resultaten'), [
                    [t('Broken', 'Kapot'), t('The link returned an error (status 400 or higher) or no answer at all. These are worth fixing.', 'De link gaf een fout (status 400 of hoger) of helemaal geen antwoord. Deze zijn het waard om te herstellen.')],
                    [t('Blocked', 'Geblokkeerd'), t('The link answered with a bot-blocking status (403, 429, 999). It usually works fine in a normal browser, so it is listed separately, not as broken.', 'De link gaf een bot-blokkeerstatus (403, 429, 999). In een gewone browser werkt hij meestal prima, dus staat hij apart en niet als kapot.')]
                ]],
                [t('Status codes', 'Statuscodes'), [
                    ['404', t('Not found — the page or file no longer exists.', 'Niet gevonden — de pagina of het bestand bestaat niet meer.')],
                    ['500', t('Server error — the other server had a problem.', 'Serverfout — de andere server had een probleem.')],
                    [t('no response', 'geen reactie'), t('The server did not answer at all (offline, or the domain no longer exists).', 'De server antwoordde helemaal niet (offline, of het domein bestaat niet meer).')]
                ]],
                [t('Other terms', 'Overige termen'), [
                    [t('Internal / external', 'Intern / extern'), t('Internal links point to pages on the same site; external links point to other websites. Both are checked.', 'Interne links wijzen naar pagina’s op dezelfde site; externe links naar andere websites. Beide worden gecontroleerd.')],
                    [t('Found on', 'Gevonden op'), t('The page the broken link sits on, so you know where to fix it.', 'De pagina waar de kapotte link op staat, zodat je weet waar je hem herstelt.')],
                    [t('Pages scanned', 'Pagina’s gescand'), t('The free check reads the page plus two linked pages and verifies up to 40 links.', 'De gratis check leest de pagina plus twee gelinkte pagina’s en controleert tot 40 links.')]
                ]]
            ],
            images: [
                [t('Page weight', 'Paginagewicht'), [
                    [t('Total page weight', 'Totaal paginagewicht'), t('The full download size of the page: HTML, images, scripts and styles together. A ≈ sign means it is a close estimate.', 'De volledige downloadgrootte van de pagina: HTML, afbeeldingen, scripts en styles samen. Een ≈-teken betekent dat het een goede schatting is.')],
                    [t('Images (% of page)', 'Afbeeldingen (% van pagina)'), t('How many megabytes the images take, and how big a share of the whole page that is. This is exact — every image is really downloaded.', 'Hoeveel megabytes de afbeeldingen kosten en welk deel van de hele pagina dat is. Dit is exact — elke afbeelding wordt echt gedownload.')],
                    [t('Scripts & styles', 'Scripts & styles'), t('The weight of the JavaScript and CSS files, sized from their headers.', 'Het gewicht van de JavaScript- en CSS-bestanden, bepaald op basis van hun headers.')]
                ]],
                [t('Per image', 'Per afbeelding'), [
                    [t('Savable', 'Te besparen'), t('The kilobytes you could save on that image by converting or resizing it, without visible quality loss.', 'De kilobytes die je op die afbeelding kunt besparen door te converteren of verkleinen, zonder zichtbaar kwaliteitsverlies.')],
                    [t('Older format', 'Ouder formaat'), t('A JPG or PNG that would be 25–30% smaller as modern WebP or AVIF.', 'Een JPG of PNG die als moderne WebP of AVIF 25–30% kleiner zou zijn.')],
                    [t('Oversized', 'Te groot geleverd'), t('The image file is much larger than the space it is shown in, so pixels are wasted (retina screens are allowed for).', 'Het afbeeldingsbestand is veel groter dan het vak waarin het getoond wordt, dus er gaan pixels verloren (retina-schermen zijn meegerekend).')],
                    [t('Missing alt text', 'Zonder alt-tekst'), t('The image has no text description, which hurts accessibility and SEO.', 'De afbeelding heeft geen tekstbeschrijving, wat slecht is voor toegankelijkheid en SEO.')],
                    [t('Not lazy-loaded', 'Geen lazy loading'), t('The image loads immediately instead of only when it scrolls into view, slowing the first paint.', 'De afbeelding laadt meteen in plaats van pas als hij in beeld scrolt, wat de eerste weergave vertraagt.')],
                    [t('(background)', '(achtergrond)'), t('A background image set in CSS (often the header or a section banner), not a normal <img> in the page.', 'Een achtergrondafbeelding uit de CSS (vaak de header of een sectiebanner), geen gewone <img> op de pagina.')]
                ]]
            ],
            domain: [
                [t('Results', 'Resultaten'), [
                    [t('Available', 'Beschikbaar'), t('The registry confirms this domain is free to register right now.', 'Het register bevestigt dat dit domein nu vrij is om te registreren.')],
                    [t('Taken', 'Bezet'), t('The domain is already registered. Where known, the year it was first registered is shown.', 'Het domein is al geregistreerd. Waar bekend wordt het jaar van eerste registratie getoond.')],
                    [t('Verify', 'Verifieer'), t('This extension has no public availability API. It looks free based on DNS, but confirm it at a registrar before counting on it.', 'Deze extensie heeft geen openbare beschikbaarheids-API. Op basis van DNS lijkt hij vrij, maar bevestig dit bij een registrar voordat je erop rekent.')]
                ]],
                [t('How it checks', 'Hoe het controleert'), [
                    ['RDAP', t('The modern replacement for WHOIS: a direct question to the registry that manages the extension. This is the most reliable source.', 'De moderne opvolger van WHOIS: een directe vraag aan het register dat de extensie beheert. Dit is de meest betrouwbare bron.')],
                    ['DNS', t('A name-server lookup. If a domain has name servers it is definitely in use; if not, it is probably free.', 'Een nameserver-opzoeking. Heeft een domein nameservers, dan is het zeker in gebruik; zo niet, dan is het waarschijnlijk vrij.')]
                ]]
            ]
        }[tool] || [];

        let body = '';
        for (const [heading, items] of groups) {
            body += '<h3 class="audit-help__h">' + esc(heading) + '</h3><dl class="audit-help__list">';
            for (const [term, desc] of items) {
                body += '<dt>' + esc(term) + '</dt><dd>' + esc(desc) + '</dd>';
            }
            body += '</dl>';
        }
        return { title, body };
    }

    let helpEl = null;
    function openHelp() {
        const { title, body } = helpContent();
        if (!helpEl) {
            helpEl = document.createElement('div');
            helpEl.className = 'audit-help-modal';
            helpEl.innerHTML = '<div class="audit-help-backdrop"></div>'
                + '<div class="audit-help-dialog" role="dialog" aria-modal="true" aria-labelledby="auditHelpTitle">'
                + '<button type="button" class="audit-help-close" aria-label="' + esc(t('Close', 'Sluiten')) + '">&times;</button>'
                + '<h2 id="auditHelpTitle"></h2><div class="audit-help-body"></div></div>';
            document.body.appendChild(helpEl);
            const close = () => { helpEl.classList.remove('open'); };
            helpEl.querySelector('.audit-help-backdrop').addEventListener('click', close);
            helpEl.querySelector('.audit-help-close').addEventListener('click', close);
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
        }
        helpEl.querySelector('#auditHelpTitle').textContent = title;
        helpEl.querySelector('.audit-help-body').innerHTML = body;
        helpEl.classList.add('open');
    }
})();
