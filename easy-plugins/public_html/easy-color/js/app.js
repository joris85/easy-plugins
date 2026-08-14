/**
 * Easy Color — pick a color, read HEX/RGB/HSL, build shades/tints and matching
 * palettes, generate a CSS gradient, and check WCAG contrast. Pure client-side.
 */
(function () {
    'use strict';

    const isNl = document.documentElement.lang === 'nl';
    const t = (en, nl) => (isNl ? nl : en);

    // ---- Color math ----
    function hexToRgb(hex) {
        hex = hex.replace('#', '');
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

    // ---- Main picker ----
    const picker = document.getElementById('colorPicker');
    const hexIn = document.getElementById('colorHex');
    const rgbIn = document.getElementById('colorRgb');
    const hslIn = document.getElementById('colorHsl');
    const bigSwatch = document.getElementById('colorBigSwatch');

    let current = { r: 76, g: 175, b: 80 };

    function setColor(rgb, from) {
        current = rgb;
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        if (from !== 'picker') picker.value = hex;
        if (from !== 'hex') hexIn.value = hex;
        if (from !== 'rgb') rgbIn.value = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
        if (from !== 'hsl') hslIn.value = `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
        bigSwatch.style.background = hex;
        bigSwatch.style.color = luminance(rgb.r, rgb.g, rgb.b) > 0.4 ? '#000' : '#fff';
        bigSwatch.textContent = hex.toUpperCase();
        renderShades();
        renderPalette();
        renderGradient();
        renderContrast();
    }

    picker.addEventListener('input', () => setColor(hexToRgb(picker.value), 'picker'));
    hexIn.addEventListener('change', () => {
        if (/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hexIn.value.trim())) setColor(hexToRgb(hexIn.value.trim()), 'hex');
    });
    rgbIn.addEventListener('change', () => {
        const m = rgbIn.value.match(/(\d+)\D+(\d+)\D+(\d+)/);
        if (m) setColor({ r: +m[1], g: +m[2], b: +m[3] }, 'rgb');
    });
    hslIn.addEventListener('change', () => {
        const m = hslIn.value.match(/(\d+)\D+(\d+)\D+(\d+)/);
        if (m) setColor(hslToRgb(+m[1], +m[2], +m[3]), 'hsl');
    });

    // ---- Shades & tints ----
    function renderShades() {
        const box = document.getElementById('colorShades');
        const hsl = rgbToHsl(current.r, current.g, current.b);
        let html = '';
        for (let i = 90; i >= 10; i -= 10) {
            const rgb = hslToRgb(hsl.h, hsl.s, i);
            const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
            html += swatch(hex, i + '%');
        }
        box.innerHTML = html;
        wireCopy(box);
    }

    // ---- Matching palette ----
    function renderPalette() {
        const box = document.getElementById('colorPalette');
        const hsl = rgbToHsl(current.r, current.g, current.b);
        const rel = [
            [t('Base', 'Basis'), hsl.h],
            [t('Complement', 'Complement'), (hsl.h + 180) % 360],
            [t('Analogous', 'Analoog'), (hsl.h + 30) % 360],
            [t('Analogous', 'Analoog'), (hsl.h + 330) % 360],
            [t('Triadic', 'Triadisch'), (hsl.h + 120) % 360],
            [t('Triadic', 'Triadisch'), (hsl.h + 240) % 360]
        ];
        box.innerHTML = rel.map(([label, h]) => {
            const rgb = hslToRgb(h, hsl.s, hsl.l);
            return swatch(rgbToHex(rgb.r, rgb.g, rgb.b), label);
        }).join('');
        wireCopy(box);
    }

    // ---- Gradient ----
    const gradEnd = document.getElementById('gradEnd');
    const gradAngle = document.getElementById('gradAngle');
    [gradEnd, gradAngle].forEach((el) => el && el.addEventListener('input', renderGradient));

    function renderGradient() {
        const from = rgbToHex(current.r, current.g, current.b);
        const to = gradEnd.value;
        const angle = gradAngle.value;
        const css = `linear-gradient(${angle}deg, ${from}, ${to})`;
        document.getElementById('gradPreview').style.background = css;
        const code = `background: ${css};`;
        document.getElementById('gradCode').textContent = code;
    }
    document.getElementById('gradCopy').addEventListener('click', (e) => {
        navigator.clipboard.writeText(document.getElementById('gradCode').textContent);
        flash(e.currentTarget);
    });

    // ---- Contrast ----
    const cText = document.getElementById('contrastText');
    const cBg = document.getElementById('contrastBg');
    [cText, cBg].forEach((el) => el.addEventListener('input', renderContrast));

    function renderContrast() {
        const text = hexToRgb(cText.value);
        const bg = hexToRgb(cBg.value);
        const ratio = contrastRatio(text, bg);
        document.getElementById('contrastPreview').style.background = cBg.value;
        document.getElementById('contrastPreview').style.color = cText.value;
        document.getElementById('contrastRatio').textContent = ratio.toFixed(2) + ' : 1';
        const grade = (pass) => pass
            ? '<span class="badge bg-success">' + t('Pass', 'Voldoet') + '</span>'
            : '<span class="badge bg-danger">' + t('Fail', 'Onvoldoende') + '</span>';
        document.getElementById('contrastGrades').innerHTML =
            '<div>' + t('Normal text', 'Normale tekst') + ' AA (4.5): ' + grade(ratio >= 4.5) + '</div>'
            + '<div>' + t('Normal text', 'Normale tekst') + ' AAA (7): ' + grade(ratio >= 7) + '</div>'
            + '<div>' + t('Large text', 'Grote tekst') + ' AA (3): ' + grade(ratio >= 3) + '</div>';
    }
    document.getElementById('contrastUseCurrent').addEventListener('click', () => {
        cText.value = rgbToHex(current.r, current.g, current.b);
        renderContrast();
    });

    // ---- Helpers ----
    function swatch(hex, label) {
        const rgb = hexToRgb(hex);
        const textCol = luminance(rgb.r, rgb.g, rgb.b) > 0.4 ? '#000' : '#fff';
        return `<button class="color-swatch" data-hex="${hex}" style="background:${hex};color:${textCol}" title="${t('Click to copy', 'Klik om te kopiëren')}">`
            + `<span class="color-swatch__hex">${hex.toUpperCase()}</span><span class="color-swatch__label">${label}</span></button>`;
    }
    function wireCopy(box) {
        box.querySelectorAll('.color-swatch').forEach((b) => b.addEventListener('click', () => {
            navigator.clipboard.writeText(b.dataset.hex);
            const lbl = b.querySelector('.color-swatch__hex');
            const old = lbl.textContent;
            lbl.textContent = t('Copied!', 'Gekopieerd!');
            setTimeout(() => { lbl.textContent = old; }, 1000);
        }));
    }
    function flash(btn) {
        const old = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check me-1"></i>' + t('Copied', 'Gekopieerd');
        setTimeout(() => { btn.innerHTML = old; }, 1400);
    }

    // Copy buttons for the format fields
    document.querySelectorAll('[data-copy-field]').forEach((btn) => btn.addEventListener('click', () => {
        const field = document.getElementById(btn.dataset.copyField);
        const prefix = btn.dataset.copyPrefix || '';
        navigator.clipboard.writeText(prefix + field.value + (btn.dataset.copySuffix || ''));
        flash(btn);
    }));

    setColor(current, 'init');
})();
