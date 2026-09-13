/**
 * Easy Color - pick a colour, read it as HEX/RGB/HSL, build shades, matching
 * palettes and multi-stop CSS gradients, and check WCAG contrast.
 * Everything runs in the browser; nothing is uploaded.
 */
(function () {
    'use strict';

    const isNl = document.documentElement.lang === 'nl';
    const t = (en, nl) => (isNl ? nl : en);
    const $ = (id) => document.getElementById(id);

    // ---- Colour math ----
    function hexToRgb(hex) {
        hex = String(hex).replace('#', '').trim();
        if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
        const n = parseInt(hex, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
    }
    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0; const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }
    function hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;
        if (s === 0) { r = g = b = l; }
        else {
            const hue2rgb = (p, q, tt) => {
                if (tt < 0) tt += 1;
                if (tt > 1) tt -= 1;
                if (tt < 1 / 6) return p + (q - p) * 6 * tt;
                if (tt < 1 / 2) return q;
                if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }
    function luminance(r, g, b) {
        const a = [r, g, b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    function contrastRatio(c1, c2) {
        const l1 = luminance(c1.r, c1.g, c1.b), l2 = luminance(c2.r, c2.g, c2.b);
        const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
        return (hi + 0.05) / (lo + 0.05);
    }
    const isHex = (v) => /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(v).trim());
    // Readable ink on any background, so swatch labels stay legible.
    const inkOn = (hex) => {
        const c = hexToRgb(hex);
        return luminance(c.r, c.g, c.b) > 0.4 ? '#111' : '#fff';
    };

    // ---- Output formats ----
    // One setting drives both what the swatches read and what gets copied,
    // so what you see on a chip is exactly what lands on the clipboard.
    let format = 'hex';
    function fmt(hex) {
        const c = hexToRgb(hex);
        if (format === 'rgb') return `rgb(${c.r}, ${c.g}, ${c.b})`;
        if (format === 'hsl') {
            const h = rgbToHsl(c.r, c.g, c.b);
            return `hsl(${h.h}, ${h.s}%, ${h.l}%)`;
        }
        return hex.toUpperCase();
    }

    // ---- Toast ----
    const toast = $('ccToast');
    let toastTimer = null;
    function say(msg) {
        toast.textContent = msg;
        toast.classList.add('on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('on'), 1600);
    }
    function copy(text) {
        const done = () => say(t('Copied: ', 'Gekopieerd: ') + text);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
        } else {
            fallbackCopy(text, done);
        }
    }
    function fallbackCopy(text, done) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { say(t('Could not copy', 'Kopiëren mislukt')); }
        document.body.removeChild(ta);
    }

    // ---- Current colour ----
    const picker = $('ccPicker');
    const bigHex = $('ccBigHex');
    const hexIn = $('ccHex');
    const rgbIn = $('ccRgb');
    const hslIn = $('ccHsl');
    let current = '#4caf50';

    function setColor(hex, from) {
        if (!isHex(hex)) return;
        hex = hex.trim();
        if (hex[0] !== '#') hex = '#' + hex;
        const c = hexToRgb(hex);
        current = rgbToHex(c.r, c.g, c.b);
        const hsl = rgbToHsl(c.r, c.g, c.b);

        if (from !== 'picker') picker.value = current;
        if (from !== 'hex') hexIn.value = current.toUpperCase();
        if (from !== 'rgb') rgbIn.value = `${c.r}, ${c.g}, ${c.b}`;
        if (from !== 'hsl') hslIn.value = `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;

        $('ccBig').style.background = current;
        bigHex.style.color = inkOn(current);
        bigHex.textContent = fmt(current);
        document.querySelector('.cc-big-hint').style.color = inkOn(current);

        renderShades();
        renderPalette();
        // The first gradient stop tracks the picked colour, which is what
        // people expect after choosing a brand colour.
        if (from !== 'stop') { stops[0] = current; renderStops(); }
        renderGradient();
        rememberColor(current);
    }

    picker.addEventListener('input', () => setColor(picker.value, 'picker'));
    hexIn.addEventListener('input', () => { if (isHex(hexIn.value)) setColor(hexIn.value, 'hex'); });
    rgbIn.addEventListener('change', () => {
        const m = rgbIn.value.match(/(\d+)\D+(\d+)\D+(\d+)/);
        if (m) setColor(rgbToHex(+m[1], +m[2], +m[3]), 'rgb');
    });
    hslIn.addEventListener('change', () => {
        const m = hslIn.value.match(/(\d+)\D+(\d+)\D+(\d+)/);
        if (m) { const c = hslToRgb(+m[1], +m[2], +m[3]); setColor(rgbToHex(c.r, c.g, c.b), 'hsl'); }
    });

    // Format toggle
    $('ccFormats').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-format]');
        if (!btn) return;
        format = btn.dataset.format;
        $('ccFormats').querySelectorAll('button').forEach((b) => {
            const on = b === btn;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        bigHex.textContent = fmt(current);
        renderShades();
        renderPalette();
        renderRecent();
    });

    // Copy buttons next to the three readouts
    document.querySelectorAll('[data-copy]').forEach((btn) => btn.addEventListener('click', () => {
        const val = $(btn.dataset.copy).value;
        const wrap = btn.dataset.wrap;
        copy(wrap ? `${wrap}(${val})` : val);
    }));

    // EyeDropper: only offered where the browser actually has it.
    if (window.EyeDropper) {
        const eye = $('ccEyedropper');
        eye.style.display = '';
        eye.addEventListener('click', () => {
            new window.EyeDropper().open()
                .then((res) => setColor(res.sRGBHex, 'eyedropper'))
                .catch(() => {});
        });
    }

    // ---- Recent colours ----
    let recent = [];
    try {
        const saved = localStorage.getItem('easyColorRecent');
        if (saved) recent = JSON.parse(saved).filter(isHex).slice(0, 12);
    } catch (e) { recent = []; }

    let rememberTimer = null;
    function rememberColor(hex) {
        // Debounced: dragging the picker would otherwise fill the list with
        // every colour the cursor passed through.
        clearTimeout(rememberTimer);
        rememberTimer = setTimeout(() => {
            recent = [hex].concat(recent.filter((c) => c.toLowerCase() !== hex.toLowerCase())).slice(0, 12);
            try { localStorage.setItem('easyColorRecent', JSON.stringify(recent)); } catch (e) {}
            renderRecent();
        }, 700);
    }
    function renderRecent() {
        const box = $('ccRecent');
        if (!recent.length) { $('ccRecentWrap').style.display = 'none'; return; }
        $('ccRecentWrap').style.display = '';
        box.innerHTML = recent.map((hex) =>
            `<button type="button" class="cc-recent-dot" data-hex="${hex}" style="background:${hex}" title="${fmt(hex)}"></button>`
        ).join('');
    }
    $('ccRecent').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-hex]');
        if (b) setColor(b.dataset.hex, 'recent');
    });

    // ---- Shades & tints ----
    function renderShades() {
        const c = hexToRgb(current);
        const hsl = rgbToHsl(c.r, c.g, c.b);
        let html = '';
        for (let l = 95; l >= 5; l -= 10) {
            const c = hslToRgb(hsl.h, hsl.s, l);
            html += chip(rgbToHex(c.r, c.g, c.b), l + '%');
        }
        $('ccShades').innerHTML = html;
    }

    // ---- Matching palette ----
    function renderPalette() {
        const c = hexToRgb(current);
        const hsl = rgbToHsl(c.r, c.g, c.b);
        const rel = [
            [t('Base', 'Basis'), hsl.h],
            [t('Complement', 'Complement'), (hsl.h + 180) % 360],
            [t('Analogous', 'Analoog'), (hsl.h + 30) % 360],
            [t('Analogous', 'Analoog'), (hsl.h + 330) % 360],
            [t('Triadic', 'Triadisch'), (hsl.h + 120) % 360],
            [t('Triadic', 'Triadisch'), (hsl.h + 240) % 360]
        ];
        $('ccPalette').innerHTML = rel.map(([label, h]) => {
            const rgb = hslToRgb(h, hsl.s, hsl.l);
            return chip(rgbToHex(rgb.r, rgb.g, rgb.b), label);
        }).join('');
    }

    function chip(hex, label) {
        return `<button type="button" class="cc-chip" data-hex="${hex}" style="background:${hex};color:${inkOn(hex)}" `
            + `title="${t('Click to copy', 'Klik om te kopiëren')}">`
            + `<span class="cc-chip-val">${fmt(hex)}</span><span class="cc-chip-label">${label}</span></button>`;
    }

    // One listener per container instead of one per chip, since the chips are
    // re-rendered on every colour change.
    ['ccShades', 'ccPalette'].forEach((id) => $(id).addEventListener('click', (e) => {
        const b = e.target.closest('.cc-chip');
        if (b) copy(fmt(b.dataset.hex));
    }));

    // ---- Gradient ----
    let stops = ['#4caf50', '#1e88e5'];
    let gradType = 'linear';
    let gradPos = 'center';

    function renderStops() {
        $('ccStops').innerHTML = stops.map((hex, i) =>
            `<div class="cc-stop">`
            + `<input type="color" value="${hex}" data-stop="${i}" aria-label="${t('Colour', 'Kleur')} ${i + 1}">`
            + `<span class="cc-stop-hex">${hex.toUpperCase()}</span>`
            + (stops.length > 2
                ? `<button type="button" class="cc-stop-x" data-remove="${i}" title="${t('Remove', 'Verwijderen')}" aria-label="${t('Remove colour', 'Kleur verwijderen')} ${i + 1}"><i class="fas fa-xmark"></i></button>`
                : '')
            + `</div>`
        ).join('');
        $('ccAddStop').disabled = stops.length >= 6;
    }

    $('ccStops').addEventListener('input', (e) => {
        const idx = e.target.dataset.stop;
        if (idx === undefined) return;
        stops[+idx] = e.target.value;
        e.target.parentElement.querySelector('.cc-stop-hex').textContent = e.target.value.toUpperCase();
        // Stop 1 is the picked colour, so editing it moves the whole tool.
        if (+idx === 0) setColor(e.target.value, 'stop');
        renderGradient();
    });
    $('ccStops').addEventListener('click', (e) => {
        const b = e.target.closest('[data-remove]');
        if (!b) return;
        stops.splice(+b.dataset.remove, 1);
        renderStops();
        renderGradient();
    });
    $('ccAddStop').addEventListener('click', () => {
        if (stops.length >= 6) return;
        // Sit the new stop halfway between the last two, so adding one reads
        // as an extension of the ramp rather than a random colour.
        const a = hexToRgb(stops[stops.length - 2]);
        const b = hexToRgb(stops[stops.length - 1]);
        stops.push(rgbToHex((a.r + b.r) / 2, (a.g + b.g) / 2, (a.b + b.b) / 2));
        renderStops();
        renderGradient();
    });

    $('ccGradType').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-gtype]');
        if (!btn) return;
        gradType = btn.dataset.gtype;
        $('ccGradType').querySelectorAll('button').forEach((b) => {
            const on = b === btn;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        $('ccGradLinear').hidden = gradType !== 'linear';
        $('ccGradRadial').hidden = gradType !== 'radial';
        // A radial gradient in a wide letterbox reads as an ellipse and looks
        // wrong, so the preview goes square for radial.
        $('ccGradPreview').classList.toggle('square', gradType === 'radial');
        renderGradient();
    });

    $('ccGradLinear').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-dir]');
        if (!btn) return;
        $('ccAngle').value = btn.dataset.dir;
        markActive(btn);
        renderGradient();
    });
    $('ccGradRadial').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-pos]');
        if (!btn) return;
        gradPos = btn.dataset.pos;
        markActive(btn);
        renderGradient();
    });
    function markActive(btn) {
        btn.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
    }

    $('ccAngle').addEventListener('input', () => {
        // Moving the slider means the preset buttons no longer describe it.
        $('ccGradLinear').querySelectorAll('button[data-dir]').forEach((b) => {
            b.classList.toggle('on', b.dataset.dir === $('ccAngle').value);
        });
        renderGradient();
    });
    $('ccRadius').addEventListener('input', renderGradient);

    const POS = {
        'center': 'circle at center',
        'top-left': 'circle at top left',
        'top-right': 'circle at top right',
        'bottom-left': 'circle at bottom left',
        'bottom-right': 'circle at bottom right'
    };

    function gradientCss() {
        const list = stops.join(', ');
        if (gradType === 'radial') {
            const r = $('ccRadius').value;
            $('ccRadiusOut').textContent = r + '%';
            return `radial-gradient(${POS[gradPos]}, ${list} ${r}%)`;
        }
        const a = $('ccAngle').value;
        $('ccAngleOut').textContent = a + '°';
        return `linear-gradient(${a}deg, ${list})`;
    }

    function renderGradient() {
        const css = gradientCss();
        $('ccGradPreview').style.background = css;
        $('ccGradCode').textContent = `background: ${css};`;
    }
    $('ccGradCopy').addEventListener('click', () => copy($('ccGradCode').textContent));

    // ---- Contrast ----
    const ctText = $('ccCtText'), ctBg = $('ccCtBg');
    const ctTextHex = $('ccCtTextHex'), ctBgHex = $('ccCtBgHex');

    function syncPair(colorEl, hexEl) {
        colorEl.addEventListener('input', () => { hexEl.value = colorEl.value.toUpperCase(); renderContrast(); });
        hexEl.addEventListener('input', () => {
            if (!isHex(hexEl.value)) return;
            let v = hexEl.value.trim();
            if (v[0] !== '#') v = '#' + v;
            const c = hexToRgb(v);
            colorEl.value = rgbToHex(c.r, c.g, c.b);
            renderContrast();
        });
    }
    syncPair(ctText, ctTextHex);
    syncPair(ctBg, ctBgHex);

    function renderContrast() {
        const ratio = contrastRatio(hexToRgb(ctText.value), hexToRgb(ctBg.value));
        const box = $('ccCtPreview');
        box.style.background = ctBg.value;
        box.style.color = ctText.value;
        $('ccCtRatio').textContent = ratio.toFixed(2) + ' : 1';
        $('ccCtRatio').className = 'cc-ratio ' + (ratio >= 4.5 ? 'good' : ratio >= 3 ? 'ok' : 'bad');
        const grade = (label, need) => {
            const pass = ratio >= need;
            return `<span class="cc-grade ${pass ? 'pass' : 'fail'}">`
                + `<i class="fas fa-${pass ? 'check' : 'xmark'}"></i> ${label} (${need})</span>`;
        };
        $('ccCtGrades').innerHTML =
            grade(t('Normal AA', 'Normaal AA'), 4.5)
            + grade(t('Normal AAA', 'Normaal AAA'), 7)
            + grade(t('Large AA', 'Groot AA'), 3)
            + grade(t('Large AAA', 'Groot AAA'), 4.5);
    }
    $('ccCtUse').addEventListener('click', () => {
        ctText.value = current;
        ctTextHex.value = current.toUpperCase();
        renderContrast();
    });
    $('ccCtSwap').addEventListener('click', () => {
        const a = ctText.value;
        ctText.value = ctBg.value;
        ctBg.value = a;
        ctTextHex.value = ctText.value.toUpperCase();
        ctBgHex.value = ctBg.value.toUpperCase();
        renderContrast();
    });

    // ---- Start ----
    ctTextHex.value = ctText.value.toUpperCase();
    ctBgHex.value = ctBg.value.toUpperCase();
    renderStops();
    renderRecent();
    setColor(current, 'init');
    renderContrast();
})();
