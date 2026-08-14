/**
 * Easy Favicon — turn one image into a complete favicon set, entirely in the
 * browser. Generates the PNG sizes, a multi-size favicon.ico (PNG-in-ICO),
 * apple-touch-icon, site.webmanifest and the paste-ready HTML, then packs
 * everything into a ZIP built by hand (STORE, no dependency).
 */
(function () {
    'use strict';

    const isNl = document.documentElement.lang === 'nl';
    const t = (en, nl) => (isNl ? nl : en);

    const PNG_SIZES = [16, 32, 48, 64, 180, 192, 512];
    const ICO_SIZES = [16, 32, 48];

    let sourceImage = null;      // the loaded HTMLImageElement
    let generated = null;        // { blobs: {size: Blob}, ico: Blob }

    const dropzone = document.getElementById('faviconDropzone');
    const fileInput = document.getElementById('faviconFile');
    const optionsBox = document.getElementById('faviconOptions');
    const previewBox = document.getElementById('faviconPreview');
    const bgToggle = document.getElementById('faviconBg');
    const bgColor = document.getElementById('faviconBgColor');
    const padRange = document.getElementById('faviconPad');
    const radiusRange = document.getElementById('faviconRadius');
    const downloadBox = document.getElementById('faviconDownload');

    // ---- Upload wiring ----
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

    [bgToggle, bgColor, padRange, radiusRange].forEach((el) => el.addEventListener('input', () => { if (sourceImage) render(); }));

    function loadFile(file) {
        if (!/^image\//.test(file.type)) {
            alert(t('Please choose an image file (PNG, JPG, SVG, WebP).', 'Kies een afbeeldingsbestand (PNG, JPG, SVG, WebP).'));
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                sourceImage = img;
                optionsBox.style.display = 'block';
                render();
            };
            img.onerror = () => alert(t('That image could not be loaded.', 'Die afbeelding kon niet geladen worden.'));
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ---- Rendering ----
    function drawSize(size) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const radius = (radiusRange.value / 100) * (size / 2);
        if (bgToggle.checked || radius > 0) {
            ctx.save();
            roundRectPath(ctx, 0, 0, size, size, radius);
            ctx.clip();
            if (bgToggle.checked) {
                ctx.fillStyle = bgColor.value;
                ctx.fillRect(0, 0, size, size);
            }
        }

        // Contain the image within the padded box, preserving aspect ratio.
        const pad = (padRange.value / 100) * size;
        const box = size - pad * 2;
        const scale = Math.min(box / sourceImage.width, box / sourceImage.height);
        const w = sourceImage.width * scale;
        const h = sourceImage.height * scale;
        ctx.drawImage(sourceImage, (size - w) / 2, (size - h) / 2, w, h);

        if (bgToggle.checked || radius > 0) ctx.restore();
        return canvas;
    }

    function roundRectPath(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function canvasToBlob(canvas) {
        return new Promise((res) => canvas.toBlob(res, 'image/png'));
    }

    async function render() {
        // Live previews at a few representative sizes.
        previewBox.style.display = 'block';
        const c16 = drawSize(16), c32 = drawSize(32), c180 = drawSize(180);
        document.getElementById('previewTab').src = c16.toDataURL();
        document.getElementById('preview32').src = c32.toDataURL();
        document.getElementById('previewApple').src = c180.toDataURL();

        // Build all sizes + the ICO, then reveal the download panel.
        const blobs = {};
        for (const size of PNG_SIZES) {
            blobs[size] = await canvasToBlob(drawSize(size));
        }
        const icoParts = [];
        for (const size of ICO_SIZES) {
            icoParts.push({ size, buf: new Uint8Array(await blobs[size].arrayBuffer()) });
        }
        generated = { blobs, ico: new Blob(buildIco(icoParts), { type: 'image/x-icon' }) };
        downloadBox.style.display = 'block';
    }

    // ---- favicon.ico (PNG-in-ICO), widely supported by browsers + Windows ----
    function buildIco(parts) {
        const header = new Uint8Array(6 + parts.length * 16);
        const dv = new DataView(header.buffer);
        dv.setUint16(0, 0, true);          // reserved
        dv.setUint16(2, 1, true);          // type: icon
        dv.setUint16(4, parts.length, true);
        let offset = header.length;
        const chunks = [header];
        parts.forEach((p, i) => {
            const e = 6 + i * 16;
            header[e] = p.size >= 256 ? 0 : p.size;      // width
            header[e + 1] = p.size >= 256 ? 0 : p.size;  // height
            header[e + 2] = 0;                           // palette
            header[e + 3] = 0;                           // reserved
            dv.setUint16(e + 4, 1, true);                // color planes
            dv.setUint16(e + 6, 32, true);               // bits per pixel
            dv.setUint32(e + 8, p.buf.length, true);     // data size
            dv.setUint32(e + 12, offset, true);          // data offset
            offset += p.buf.length;
            chunks.push(p.buf);
        });
        return chunks;
    }

    // ---- The HTML snippet users paste into their <head> ----
    function htmlSnippet() {
        return [
            '<link rel="icon" href="/favicon.ico" sizes="any">',
            '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
            '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
            '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
            '<link rel="manifest" href="/site.webmanifest">'
        ].join('\n');
    }

    function manifestJson() {
        return JSON.stringify({
            icons: [
                { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
            ]
        }, null, 2);
    }

    // Friendly filenames matching the snippet above.
    const FILE_NAMES = {
        16: 'favicon-16x16.png', 32: 'favicon-32x32.png', 48: 'favicon-48x48.png',
        64: 'favicon-64x64.png', 180: 'apple-touch-icon.png',
        192: 'android-chrome-192x192.png', 512: 'android-chrome-512x512.png'
    };

    // ---- Download actions ----
    document.getElementById('faviconDownloadIco').addEventListener('click', () => {
        if (generated) saveBlob(generated.ico, 'favicon.ico');
    });

    document.getElementById('faviconDownloadZip').addEventListener('click', async () => {
        if (!generated) return;
        const files = [];
        files.push({ name: 'favicon.ico', data: new Uint8Array(await generated.ico.arrayBuffer()) });
        for (const size of PNG_SIZES) {
            files.push({ name: FILE_NAMES[size], data: new Uint8Array(await generated.blobs[size].arrayBuffer()) });
        }
        files.push({ name: 'site.webmanifest', data: strBytes(manifestJson()) });
        files.push({ name: 'favicon-snippet.html', data: strBytes(htmlSnippet() + '\n') });
        saveBlob(new Blob(buildZip(files), { type: 'application/zip' }), 'favicon-package.zip');
    });

    const snippetEl = document.getElementById('faviconSnippet');
    if (snippetEl) snippetEl.textContent = htmlSnippet();
    document.getElementById('faviconCopySnippet').addEventListener('click', (e) => {
        navigator.clipboard.writeText(htmlSnippet()).then(() => {
            const b = e.currentTarget;
            const old = b.innerHTML;
            b.innerHTML = '<i class="fas fa-check me-1"></i>' + t('Copied', 'Gekopieerd');
            setTimeout(() => { b.innerHTML = old; }, 1500);
        });
    });

    function saveBlob(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function strBytes(s) {
        return new TextEncoder().encode(s);
    }

    // ---- Minimal STORE-only ZIP (PNGs are already compressed) ----
    const CRC_TABLE = (() => {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[n] = c >>> 0;
        }
        return table;
    })();
    function crc32(bytes) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }
    function buildZip(files) {
        const chunks = [];
        const central = [];
        let offset = 0;
        for (const f of files) {
            const nameBytes = strBytes(f.name);
            const crc = crc32(f.data);
            const local = new Uint8Array(30 + nameBytes.length);
            const dv = new DataView(local.buffer);
            dv.setUint32(0, 0x04034b50, true);       // local file header
            dv.setUint16(4, 20, true);               // version needed
            dv.setUint16(6, 0, true);                // flags
            dv.setUint16(8, 0, true);                // method: store
            dv.setUint16(10, 0, true);               // mod time
            dv.setUint16(12, 0, true);               // mod date
            dv.setUint32(14, crc, true);
            dv.setUint32(18, f.data.length, true);   // compressed size
            dv.setUint32(22, f.data.length, true);   // uncompressed size
            dv.setUint16(26, nameBytes.length, true);
            dv.setUint16(28, 0, true);
            local.set(nameBytes, 30);
            chunks.push(local, f.data);

            const cen = new Uint8Array(46 + nameBytes.length);
            const cdv = new DataView(cen.buffer);
            cdv.setUint32(0, 0x02014b50, true);      // central dir header
            cdv.setUint16(4, 20, true);
            cdv.setUint16(6, 20, true);
            cdv.setUint16(8, 0, true);
            cdv.setUint16(10, 0, true);
            cdv.setUint16(12, 0, true);
            cdv.setUint16(14, 0, true);
            cdv.setUint32(16, crc, true);
            cdv.setUint32(20, f.data.length, true);
            cdv.setUint32(24, f.data.length, true);
            cdv.setUint16(28, nameBytes.length, true);
            cdv.setUint32(42, offset, true);         // offset of local header
            cen.set(nameBytes, 46);
            central.push(cen);

            offset += local.length + f.data.length;
        }
        let centralSize = 0;
        central.forEach((c) => { centralSize += c.length; });
        const end = new Uint8Array(22);
        const edv = new DataView(end.buffer);
        edv.setUint32(0, 0x06054b50, true);          // end of central dir
        edv.setUint16(8, files.length, true);
        edv.setUint16(10, files.length, true);
        edv.setUint32(12, centralSize, true);
        edv.setUint32(16, offset, true);
        return [...chunks, ...central, end];
    }
})();
