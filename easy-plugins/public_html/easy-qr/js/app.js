/**
 * Easy QR — QR codes for a link, text, WiFi login or contact card, with full
 * styling control. Runs entirely in the browser; nothing is uploaded.
 *
 * One SVG is the single source of truth: it is shown inline as the preview
 * (always sharp) and rasterized for PNG/JPG/WebP, so a download can never
 * drift from what the preview showed.
 */
(function () {
    'use strict';

    const isNl = document.documentElement.lang === 'nl';
    const t = (en, nl) => (isNl ? nl : en);
    const $ = (id) => document.getElementById(id);

    const tabs = document.querySelectorAll('.qr-tab');
    const panels = document.querySelectorAll('.qr-panel');
    let activeType = 'url';
    let logoImage = null;
    let logoDataUrl = null;
    let lastQr = null;

    const previewEl = $('qrPreview');
    const emptyMsg = $('qrEmpty');
    const downloadRow = $('qrDownloadRow');
    const warnEl = $('qrWarn');

    // ---- Content tabs -------------------------------------------------
    tabs.forEach((tab) => tab.addEventListener('click', () => {
        tabs.forEach((x) => x.classList.remove('active'));
        panels.forEach((p) => { p.style.display = 'none'; });
        tab.classList.add('active');
        activeType = tab.dataset.type;
        $('qr-panel-' + activeType).style.display = 'block';
        update();
    }));

    function escapeWifi(s) {
        return String(s).replace(/([\;,:"'])/g, '\\$1');
    }

    function payload() {
        if (activeType === 'url') {
            let v = $('qrUrl').value.trim();
            if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
            return v;
        }
        if (activeType === 'text') return $('qrText').value;
        if (activeType === 'wifi') {
            const ssid = escapeWifi($('qrWifiSsid').value);
            const pass = escapeWifi($('qrWifiPass').value);
            const enc = $('qrWifiEnc').value;
            const hidden = $('qrWifiHidden').checked ? 'H:true;' : '';
            if (!ssid) return '';
            return enc === 'nopass'
                ? 'WIFI:T:nopass;S:' + ssid + ';' + hidden + ';'
                : 'WIFI:T:' + enc + ';S:' + ssid + ';P:' + pass + ';' + hidden + ';';
        }
        if (activeType === 'vcard') {
            const name = $('qrVcName').value.trim();
            const phone = $('qrVcPhone').value.trim();
            const email = $('qrVcEmail').value.trim();
            const org = $('qrVcOrg').value.trim();
            const url = $('qrVcUrl').value.trim();
            if (!name && !phone && !email) return '';
            return ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + name, 'FN:' + name,
                org ? 'ORG:' + org : '', phone ? 'TEL:' + phone : '',
                email ? 'EMAIL:' + email : '', url ? 'URL:' + url : '',
                'END:VCARD'].filter(Boolean).join('\n');
        }
        return '';
    }

    // ---- Options ------------------------------------------------------
    function options() {
        const transparent = $('qrTransparent').checked;
        const gradType = $('qrGradType').value;
        return {
            sizePx: parseInt($('qrSize').value, 10) || 600,
            margin: parseInt($('qrMargin').value, 10),
            fg: $('qrFg').value,
            bg: transparent ? null : $('qrBg').value,
            gradient: gradType === 'none' ? null : {
                type: gradType,
                from: $('qrFg').value,
                to: $('qrGradTo').value,
                angle: parseInt($('qrGradAngle').value, 10)
            },
            dotStyle: $('qrDotStyle').value,
            eyeStyle: $('qrEyeStyle').value,
            eyeColor: $('qrEyeSame').checked ? null : $('qrEyeColor').value,
            ecl: $('qrEcl').value,
            logoPct: parseInt($('qrLogoSize').value, 10),
            logoPad: $('qrLogoPad').checked
        };
    }

    // ---- Matrix -------------------------------------------------------
    function buildMatrix(data, ecl) {
        const qr = window.qrcode(0, ecl);
        qr.addData(data);
        qr.make();
        const size = qr.getModuleCount();
        const m = [];
        for (let r = 0; r < size; r++) {
            const row = [];
            for (let c = 0; c < size; c++) row.push(qr.isDark(r, c));
            m.push(row);
        }
        return { size: size, modules: m };
    }

    const isFinder = (size, r, c) =>
        (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);

    // ---- SVG path helpers (all in module units, 1 module = 1 unit) ----
    const n = (v) => Math.round(v * 1000) / 1000;

    /** A square with only the corners that have no filled neighbour rounded. */
    function modulePath(x, y, r, nb) {
        if (r <= 0) return 'M' + n(x) + ' ' + n(y) + 'h1v1h-1z';
        const tl = (!nb.t && !nb.l) ? r : 0;
        const tr = (!nb.t && !nb.r) ? r : 0;
        const br = (!nb.b && !nb.r) ? r : 0;
        const bl = (!nb.b && !nb.l) ? r : 0;
        let d = 'M' + n(x + tl) + ' ' + n(y);
        d += 'h' + n(1 - tl - tr);
        if (tr) d += 'a' + n(tr) + ' ' + n(tr) + ' 0 0 1 ' + n(tr) + ' ' + n(tr);
        d += 'v' + n(1 - tr - br);
        if (br) d += 'a' + n(br) + ' ' + n(br) + ' 0 0 1 ' + n(-br) + ' ' + n(br);
        d += 'h' + n(-(1 - br - bl));
        if (bl) d += 'a' + n(bl) + ' ' + n(bl) + ' 0 0 1 ' + n(-bl) + ' ' + n(-bl);
        d += 'v' + n(-(1 - bl - tl));
        if (tl) d += 'a' + n(tl) + ' ' + n(tl) + ' 0 0 1 ' + n(tl) + ' ' + n(-tl);
        return d + 'z';
    }

    function roundRectPath(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        if (r <= 0) return 'M' + n(x) + ' ' + n(y) + 'h' + n(w) + 'v' + n(h) + 'h' + n(-w) + 'z';
        return 'M' + n(x + r) + ' ' + n(y)
            + 'h' + n(w - 2 * r) + 'a' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(r) + ' ' + n(r)
            + 'v' + n(h - 2 * r) + 'a' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(-r) + ' ' + n(r)
            + 'h' + n(-(w - 2 * r)) + 'a' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(-r) + ' ' + n(-r)
            + 'v' + n(-(h - 2 * r)) + 'a' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(r) + ' ' + n(-r) + 'z';
    }

    /** Ring: outer shape with an inner shape cut out (fill-rule evenodd). */
    function eyeOuterPath(x, y, style) {
        const r = style === 'circle' ? 3.5 : style === 'rounded' ? 2 : 0;
        const ri = style === 'circle' ? 2.5 : style === 'rounded' ? 1.2 : 0;
        return roundRectPath(x, y, 7, 7, r) + roundRectPath(x + 1, y + 1, 5, 5, ri);
    }
    function eyeInnerPath(x, y, style) {
        const r = style === 'circle' ? 1.5 : style === 'rounded' ? 0.9 : 0;
        return roundRectPath(x + 2, y + 2, 3, 3, r);
    }

    // ---- Build the SVG ------------------------------------------------
    function buildSvg(qr, o, opts) {
        opts = opts || {};
        const includeLogo = opts.includeLogo !== false;
        const px = opts.sizePx || o.sizePx;
        const m = o.margin;
        const total = qr.size + m * 2;
        const dark = qr.modules;

        const radius = o.dotStyle === 'rounded' ? 0.25
            : o.dotStyle === 'smooth' ? 0.5 : 0;

        // Body modules (skip the three finder patterns; drawn separately).
        let body = '';
        for (let r = 0; r < qr.size; r++) {
            for (let c = 0; c < qr.size; c++) {
                if (!dark[r][c] || isFinder(qr.size, r, c)) continue;
                const x = c + m;
                const y = r + m;
                if (o.dotStyle === 'dots') {
                    body += '<circle cx="' + n(x + 0.5) + '" cy="' + n(y + 0.5) + '" r="0.45"/>';
                } else {
                    const nb = {
                        t: r > 0 && dark[r - 1][c] && !isFinder(qr.size, r - 1, c),
                        b: r < qr.size - 1 && dark[r + 1][c] && !isFinder(qr.size, r + 1, c),
                        l: c > 0 && dark[r][c - 1] && !isFinder(qr.size, r, c - 1),
                        r: c < qr.size - 1 && dark[r][c + 1] && !isFinder(qr.size, r, c + 1)
                    };
                    body += '<path d="' + modulePath(x, y, radius, nb) + '"/>';
                }
            }
        }

        // Finder patterns
        const eyes = [[m, m], [m + qr.size - 7, m], [m, m + qr.size - 7]];
        let eyeSvg = '';
        eyes.forEach(function (p) {
            eyeSvg += '<path fill-rule="evenodd" d="' + eyeOuterPath(p[0], p[1], o.eyeStyle) + '"/>';
            eyeSvg += '<path d="' + eyeInnerPath(p[0], p[1], o.eyeStyle) + '"/>';
        });

        // Paint: solid colour or gradient
        let defs = '';
        let bodyFill = o.fg;
        if (o.gradient) {
            const a = (o.gradient.angle % 360) * Math.PI / 180;
            const x1 = n(50 + Math.cos(a + Math.PI) * 50) + '%';
            const y1 = n(50 + Math.sin(a + Math.PI) * 50) + '%';
            const x2 = n(50 + Math.cos(a) * 50) + '%';
            const y2 = n(50 + Math.sin(a) * 50) + '%';
            defs = o.gradient.type === 'radial'
                ? '<radialGradient id="qrg"><stop offset="0%" stop-color="' + o.gradient.from
                    + '"/><stop offset="100%" stop-color="' + o.gradient.to + '"/></radialGradient>'
                : '<linearGradient id="qrg" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2
                    + '"><stop offset="0%" stop-color="' + o.gradient.from + '"/><stop offset="100%" stop-color="'
                    + o.gradient.to + '"/></linearGradient>';
            bodyFill = 'url(#qrg)';
        }
        const eyeFill = o.eyeColor || bodyFill;

        // Logo
        let logoSvg = '';
        if (includeLogo && logoDataUrl && logoImage) {
            const box = (qr.size * o.logoPct) / 100;
            const pos = m + (qr.size - box) / 2;
            const scale = Math.min(box / logoImage.width, box / logoImage.height);
            const w = logoImage.width * scale;
            const h = logoImage.height * scale;
            if (o.logoPad) {
                const pad = 0.5;
                logoSvg += '<rect x="' + n(m + (qr.size - w) / 2 - pad) + '" y="' + n(m + (qr.size - h) / 2 - pad)
                    + '" width="' + n(w + pad * 2) + '" height="' + n(h + pad * 2)
                    + '" rx="' + n(0.6) + '" fill="' + (o.bg || '#ffffff') + '"/>';
            }
            logoSvg += '<image x="' + n(m + (qr.size - w) / 2) + '" y="' + n(m + (qr.size - h) / 2)
                + '" width="' + n(w) + '" height="' + n(h) + '" preserveAspectRatio="xMidYMid meet"'
                + ' href="' + logoDataUrl + '"/>';
        }

        const bgRect = o.bg
            ? '<rect width="' + total + '" height="' + total + '" fill="' + o.bg + '"/>' : '';

        return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
            + ' width="' + px + '" height="' + px + '" viewBox="0 0 ' + total + ' ' + total
            + '" shape-rendering="geometricPrecision">'
            + (defs ? '<defs>' + defs + '</defs>' : '')
            + bgRect
            + '<g fill="' + bodyFill + '">' + body + '</g>'
            + '<g fill="' + eyeFill + '">' + eyeSvg + '</g>'
            + logoSvg
            + '</svg>';
    }

    // ---- Scannability guidance ---------------------------------------
    function hexToRgb(hex) {
        hex = String(hex).replace('#', '');
        if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
        const v = parseInt(hex, 16);
        return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
    }
    function lum(c) {
        const a = [c.r, c.g, c.b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    function checkScannability(o) {
        const msgs = [];
        const bgc = hexToRgb(o.bg || '#ffffff');
        [o.fg, o.gradient ? o.gradient.to : null, o.eyeColor].filter(Boolean).forEach((col) => {
            const l1 = lum(hexToRgb(col));
            const l2 = lum(bgc);
            const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
            if (ratio < 3 && msgs.indexOf('contrast') === -1) {
                msgs.push('contrast');
            }
        });
        const out = [];
        if (msgs.indexOf('contrast') !== -1) {
            out.push(t('Low contrast with the background: scanners may struggle. Use a darker colour.',
                'Weinig contrast met de achtergrond: scanners kunnen moeite hebben. Kies een donkerdere kleur.'));
        }
        if (logoDataUrl && o.logoPct > 25) {
            out.push(t('That logo covers a lot of the code. Keep it under 25% or use error correction H.',
                'Dat logo bedekt een groot deel van de code. Houd het onder 25% of gebruik foutcorrectie H.'));
        }
        if (logoDataUrl && o.ecl !== 'H' && o.logoPct > 15) {
            out.push(t('With a logo, error correction H is the safest choice.',
                'Met een logo is foutcorrectie H de veiligste keuze.'));
        }
        if (o.margin < 2) {
            out.push(t('A margin below 2 can stop some scanners from finding the code.',
                'Een marge onder 2 kan ervoor zorgen dat sommige scanners de code niet vinden.'));
        }
        return out;
    }

    // ---- Render -------------------------------------------------------
    function update() {
        const data = payload();
        const o = options();
        syncControlStates(o);

        if (!data) {
            previewEl.innerHTML = '';
            emptyMsg.style.display = 'block';
            emptyMsg.textContent = t('Fill in the fields to see your QR code.', 'Vul de velden in om je QR-code te zien.');
            downloadRow.style.display = 'none';
            warnEl.style.display = 'none';
            lastQr = null;
            return;
        }
        let qr;
        try {
            qr = buildMatrix(data, o.ecl);
        } catch (e) {
            previewEl.innerHTML = '';
            emptyMsg.style.display = 'block';
            emptyMsg.textContent = t('That is too much data for one QR code. Shorten it a little.',
                'Dat is te veel data voor één QR-code. Maak het iets korter.');
            downloadRow.style.display = 'none';
            warnEl.style.display = 'none';
            return;
        }
        lastQr = qr;
        previewEl.innerHTML = buildSvg(qr, o);
        emptyMsg.style.display = 'none';
        downloadRow.style.display = 'flex';

        const warns = checkScannability(o);
        if (warns.length) {
            warnEl.style.display = 'block';
            warnEl.innerHTML = '<i class="fas fa-triangle-exclamation me-1"></i>' + warns.join('<br>');
        } else {
            warnEl.style.display = 'none';
        }
        $('qrSizeOut').textContent = o.sizePx + ' px';
        $('qrMarginOut').textContent = o.margin;
        $('qrLogoSizeOut').textContent = o.logoPct + '%';
        $('qrGradAngleOut').textContent = o.gradient ? o.gradient.angle + '°' : '';
    }

    /** Show or hide the controls that only apply in certain modes. */
    function syncControlStates(o) {
        $('qrBg').disabled = $('qrTransparent').checked;
        $('qrGradRow').style.display = $('qrGradType').value === 'none' ? 'none' : '';
        $('qrGradAngleWrap').style.display = $('qrGradType').value === 'linear' ? '' : 'none';
        $('qrEyeColor').disabled = $('qrEyeSame').checked;
        const hasLogo = !!logoDataUrl;
        $('qrLogoOptions').style.display = hasLogo ? '' : 'none';
        $('qrLogoClear').style.display = hasLogo ? '' : 'none';
    }

    // ---- Export -------------------------------------------------------
    function rasterize(mime, quality) {
        const o = options();
        if (!lastQr) return Promise.reject(new Error('no code'));
        // Render the code without the logo, then composite the logo on the
        // canvas: keeps the canvas untainted and export identical to preview.
        const svg = buildSvg(lastQr, o, { includeLogo: false, sizePx: o.sizePx });
        return new Promise(function (resolve, reject) {
            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = function () {
                const cv = document.createElement('canvas');
                cv.width = cv.height = o.sizePx;
                const ctx = cv.getContext('2d');
                if (mime === 'image/jpeg' && !o.bg) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, o.sizePx, o.sizePx);
                }
                ctx.drawImage(img, 0, 0, o.sizePx, o.sizePx);
                URL.revokeObjectURL(url);
                if (logoImage) {
                    const total = lastQr.size + o.margin * 2;
                    const unit = o.sizePx / total;
                    const box = (lastQr.size * o.logoPct) / 100;
                    const sc = Math.min(box / logoImage.width, box / logoImage.height);
                    const w = logoImage.width * sc * unit;
                    const h = logoImage.height * sc * unit;
                    const x = (o.sizePx - w) / 2;
                    const y = (o.sizePx - h) / 2;
                    if (o.logoPad) {
                        const pad = 0.5 * unit;
                        ctx.fillStyle = o.bg || '#ffffff';
                        ctx.beginPath();
                        const rr = 0.6 * unit;
                        const rx = x - pad, ry = y - pad, rw = w + pad * 2, rh = h + pad * 2;
                        ctx.moveTo(rx + rr, ry);
                        ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rr);
                        ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
                        ctx.arcTo(rx, ry + rh, rx, ry, rr);
                        ctx.arcTo(rx, ry, rx + rw, ry, rr);
                        ctx.closePath();
                        ctx.fill();
                    }
                    ctx.drawImage(logoImage, x, y, w, h);
                }
                cv.toBlob(function (b) { resolve(b); }, mime, quality);
            };
            img.onerror = function (e) { URL.revokeObjectURL(url); reject(e); };
            img.src = url;
        });
    }

    function save(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    $('qrDownloadPng').addEventListener('click', function () {
        rasterize('image/png').then(function (b) { save(b, 'qr-code.png'); });
    });
    $('qrDownloadJpg').addEventListener('click', function () {
        rasterize('image/jpeg', 0.92).then(function (b) { save(b, 'qr-code.jpg'); });
    });
    $('qrDownloadWebp').addEventListener('click', function () {
        rasterize('image/webp', 0.92).then(function (b) { save(b, 'qr-code.webp'); });
    });
    $('qrDownloadSvg').addEventListener('click', function () {
        if (!lastQr) return;
        const svg = buildSvg(lastQr, options());
        save(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg');
    });
    $('qrCopy').addEventListener('click', function (e) {
        const btn = e.currentTarget;
        rasterize('image/png').then(function (b) {
            if (!navigator.clipboard || !window.ClipboardItem) return;
            navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () {
                const old = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check me-1"></i>' + t('Copied', 'Gekopieerd');
                setTimeout(function () { btn.innerHTML = old; }, 1500);
            });
        });
    });

    // ---- Logo ---------------------------------------------------------
    $('qrLogo').addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                logoImage = img;
                logoDataUrl = e.target.result;
                // A logo eats modules; H error correction keeps it readable.
                if ($('qrEcl').value !== 'H') $('qrEcl').value = 'H';
                update();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
    $('qrLogoClear').addEventListener('click', function () {
        logoImage = null;
        logoDataUrl = null;
        $('qrLogo').value = '';
        update();
    });

    // ---- Presets ------------------------------------------------------
    const PRESETS = {
        classic: { dotStyle: 'square', eyeStyle: 'square', fg: '#1e1e1e', bg: '#ffffff', grad: 'none' },
        rounded: { dotStyle: 'rounded', eyeStyle: 'rounded', fg: '#1e1e1e', bg: '#ffffff', grad: 'none' },
        dots: { dotStyle: 'dots', eyeStyle: 'circle', fg: '#2f855a', bg: '#ffffff', grad: 'none' },
        brand: { dotStyle: 'smooth', eyeStyle: 'rounded', fg: '#2f855a', bg: '#ffffff', grad: 'linear', to: '#1b4f9c' }
    };
    document.querySelectorAll('.qr-preset').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const p = PRESETS[btn.dataset.preset];
            if (!p) return;
            $('qrDotStyle').value = p.dotStyle;
            $('qrEyeStyle').value = p.eyeStyle;
            $('qrFg').value = p.fg;
            $('qrBg').value = p.bg;
            $('qrTransparent').checked = false;
            $('qrGradType').value = p.grad;
            if (p.to) $('qrGradTo').value = p.to;
            document.querySelectorAll('.qr-preset').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            update();
        });
    });

    $('qrReset').addEventListener('click', function () {
        $('qrSize').value = 600; $('qrMargin').value = 4;
        $('qrFg').value = '#1e1e1e'; $('qrBg').value = '#ffffff';
        $('qrTransparent').checked = false;
        $('qrGradType').value = 'none'; $('qrGradTo').value = '#1e88e5'; $('qrGradAngle').value = 45;
        $('qrDotStyle').value = 'square'; $('qrEyeStyle').value = 'square';
        $('qrEyeSame').checked = true; $('qrEyeColor').value = '#1e1e1e';
        $('qrEcl').value = 'M'; $('qrLogoSize').value = 20; $('qrLogoPad').checked = true;
        document.querySelectorAll('.qr-preset').forEach(function (b) { b.classList.remove('active'); });
        update();
    });

    // ---- Wiring -------------------------------------------------------
    document.querySelectorAll('.qr-panel input, .qr-panel textarea, .qr-panel select, .qr-opt')
        .forEach(function (el) { el.addEventListener('input', update); });

    try {
        const q = new URL(location.href).searchParams.get('url');
        if (q) $('qrUrl').value = q;
    } catch (e) { /* ignore */ }

    update();
})();
