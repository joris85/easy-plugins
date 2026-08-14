/**
 * Easy QR — build a QR code for a link, text, WiFi login or contact card,
 * with custom colors and an optional center logo. Renders to canvas (PNG)
 * and SVG. Uses the locally-vendored EasyQRCode encoder; nothing is uploaded.
 */
(function () {
    'use strict';

    const isNl = document.documentElement.lang === 'nl';
    const t = (en, nl) => (isNl ? nl : en);

    const tabs = document.querySelectorAll('.qr-tab');
    const panels = document.querySelectorAll('.qr-panel');
    let activeType = 'url';

    tabs.forEach((tab) => tab.addEventListener('click', () => {
        tabs.forEach((x) => x.classList.remove('active'));
        panels.forEach((p) => p.style.display = 'none');
        tab.classList.add('active');
        activeType = tab.dataset.type;
        document.getElementById('qr-panel-' + activeType).style.display = 'block';
        update();
    }));

    const fg = document.getElementById('qrFg');
    const bg = document.getElementById('qrBg');
    const eclSel = document.getElementById('qrEcl');
    const logoInput = document.getElementById('qrLogo');
    const logoClear = document.getElementById('qrLogoClear');
    const canvas = document.getElementById('qrCanvas');
    const emptyMsg = document.getElementById('qrEmpty');
    const downloadRow = document.getElementById('qrDownloadRow');

    let logoImage = null;
    let lastMatrix = null;

    [fg, bg, eclSel].forEach((el) => el.addEventListener('input', update));
    document.querySelectorAll('.qr-panel input, .qr-panel textarea, .qr-panel select').forEach((el) => {
        el.addEventListener('input', update);
    });

    logoInput.addEventListener('change', () => {
        const file = logoInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => { logoImage = img; logoClear.style.display = 'inline-block'; update(); };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
    logoClear.addEventListener('click', () => {
        logoImage = null; logoInput.value = ''; logoClear.style.display = 'none'; update();
    });

    // ---- Build the payload string for the active input type ----
    function payload() {
        if (activeType === 'url') {
            let v = document.getElementById('qrUrl').value.trim();
            if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
            return v;
        }
        if (activeType === 'text') {
            return document.getElementById('qrText').value;
        }
        if (activeType === 'wifi') {
            const ssid = escapeWifi(document.getElementById('qrWifiSsid').value);
            const pass = escapeWifi(document.getElementById('qrWifiPass').value);
            const enc = document.getElementById('qrWifiEnc').value;
            const hidden = document.getElementById('qrWifiHidden').checked ? 'H:true;' : '';
            if (!ssid) return '';
            return enc === 'nopass'
                ? `WIFI:T:nopass;S:${ssid};${hidden};`
                : `WIFI:T:${enc};S:${ssid};P:${pass};${hidden};`;
        }
        if (activeType === 'vcard') {
            const name = document.getElementById('qrVcName').value.trim();
            const phone = document.getElementById('qrVcPhone').value.trim();
            const email = document.getElementById('qrVcEmail').value.trim();
            const org = document.getElementById('qrVcOrg').value.trim();
            const url = document.getElementById('qrVcUrl').value.trim();
            if (!name && !phone && !email) return '';
            return [
                'BEGIN:VCARD', 'VERSION:3.0',
                'N:' + name, 'FN:' + name,
                org ? 'ORG:' + org : '',
                phone ? 'TEL:' + phone : '',
                email ? 'EMAIL:' + email : '',
                url ? 'URL:' + url : '',
                'END:VCARD'
            ].filter(Boolean).join('\n');
        }
        return '';
    }

    function escapeWifi(s) {
        return String(s).replace(/([\\;,:"'])/g, '\\$1');
    }

    // ---- Render ----
    function update() {
        const data = payload();
        if (!data) {
            canvas.style.display = 'none';
            emptyMsg.style.display = 'block';
            downloadRow.style.display = 'none';
            lastMatrix = null;
            return;
        }
        let qr;
        try {
            qr = buildMatrix(data, eclSel.value);
        } catch (e) {
            emptyMsg.textContent = t('That is too much data for one QR code — shorten it.', 'Dat is te veel data voor één QR-code — maak het korter.');
            emptyMsg.style.display = 'block';
            canvas.style.display = 'none';
            downloadRow.style.display = 'none';
            return;
        }
        lastMatrix = qr;
        drawCanvas(qr);
        canvas.style.display = 'block';
        emptyMsg.style.display = 'none';
        downloadRow.style.display = 'flex';
    }

    // Build a {size, modules[][]} matrix using the vendored qrcode-generator.
    function buildMatrix(data, ecl) {
        const qr = window.qrcode(0, ecl); // type 0 = auto-size
        qr.addData(data);
        qr.make();
        const size = qr.getModuleCount();
        const modules = [];
        for (let r = 0; r < size; r++) {
            const row = [];
            for (let c = 0; c < size; c++) row.push(qr.isDark(r, c));
            modules.push(row);
        }
        return { size, modules };
    }

    const QUIET = 4; // quiet-zone modules required by the spec

    function drawCanvas(qr) {
        const scale = 10;
        const total = (qr.size + QUIET * 2) * scale;
        canvas.width = canvas.height = total;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bg.value;
        ctx.fillRect(0, 0, total, total);
        ctx.fillStyle = fg.value;
        for (let r = 0; r < qr.size; r++) {
            for (let c = 0; c < qr.size; c++) {
                if (qr.modules[r][c]) {
                    ctx.fillRect((c + QUIET) * scale, (r + QUIET) * scale, scale, scale);
                }
            }
        }
        if (logoImage) {
            // Center logo over ~22% of the code; high EC keeps it scannable.
            const box = total * 0.22;
            const pos = (total - box) / 2;
            ctx.fillStyle = bg.value;
            ctx.fillRect(pos - scale, pos - scale, box + scale * 2, box + scale * 2);
            const s = Math.min(box / logoImage.width, box / logoImage.height);
            const w = logoImage.width * s, h = logoImage.height * s;
            ctx.drawImage(logoImage, (total - w) / 2, (total - h) / 2, w, h);
        }
    }

    function buildSvg(qr) {
        const size = qr.size + QUIET * 2;
        let rects = '';
        for (let r = 0; r < qr.size; r++) {
            for (let c = 0; c < qr.size; c++) {
                if (qr.modules[r][c]) rects += `<rect x="${c + QUIET}" y="${r + QUIET}" width="1" height="1"/>`;
            }
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`
            + `<rect width="${size}" height="${size}" fill="${bg.value}"/>`
            + `<g fill="${fg.value}">${rects}</g></svg>`;
    }

    // ---- Downloads ----
    document.getElementById('qrDownloadPng').addEventListener('click', () => {
        if (!lastMatrix) return;
        canvas.toBlob((blob) => save(blob, 'qr-code.png'));
    });
    document.getElementById('qrDownloadSvg').addEventListener('click', () => {
        if (!lastMatrix) return;
        // SVG can't embed the raster logo cleanly; note it if a logo is set.
        const blob = new Blob([buildSvg(lastMatrix)], { type: 'image/svg+xml' });
        save(blob, 'qr-code.svg');
    });

    function save(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Prefill from ?url= or ?text= so links can deep-link a code.
    try {
        const q = new URL(location.href).searchParams;
        if (q.get('url')) { document.getElementById('qrUrl').value = q.get('url'); }
    } catch (e) { /* ignore */ }

    update();
})();
