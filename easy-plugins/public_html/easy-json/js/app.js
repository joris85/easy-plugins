/**
 * Easy JSON — format, validate, minify and sort JSON entirely in the browser.
 * Clear error messages with line/column when the JSON is invalid.
 */
(function () {
    'use strict';

    const isNl = document.documentElement.lang === 'nl';
    const t = (en, nl) => (isNl ? nl : en);

    const input = document.getElementById('jsonInput');
    const output = document.getElementById('jsonOutput');
    const statusBox = document.getElementById('jsonStatus');
    const indentSel = document.getElementById('jsonIndent');
    const sortKeys = document.getElementById('jsonSortKeys');

    function parse() {
        const text = input.value.trim();
        if (!text) {
            setStatus('', '');
            return null;
        }
        try {
            const data = JSON.parse(text);
            setStatus('ok', '<i class="fas fa-check-circle me-1"></i>' + t('Valid JSON', 'Geldige JSON')
                + ' — ' + describe(data));
            return data;
        } catch (e) {
            setStatus('error', '<i class="fas fa-times-circle me-1"></i>' + errorWithPosition(e, text));
            return null;
        }
    }

    // Turn "Unexpected token } in JSON at position 42" into a line/column hint.
    function errorWithPosition(e, text) {
        const msg = String(e.message || e);
        const m = msg.match(/position (\d+)/i);
        if (!m) return esc(msg);
        const pos = parseInt(m[1], 10);
        const before = text.slice(0, pos);
        const line = before.split('\n').length;
        const col = pos - before.lastIndexOf('\n');
        return esc(msg) + ' — ' + t('line', 'regel') + ' ' + line + ', ' + t('column', 'kolom') + ' ' + col;
    }

    function describe(data) {
        if (Array.isArray(data)) return t('array with ' + data.length + ' items', 'array met ' + data.length + ' items');
        if (data !== null && typeof data === 'object') return t('object with ' + Object.keys(data).length + ' keys', 'object met ' + Object.keys(data).length + ' keys');
        return typeof data;
    }

    function setStatus(kind, html) {
        statusBox.className = 'json-status' + (kind ? ' json-status--' + kind : '');
        statusBox.innerHTML = html;
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function sortDeep(value) {
        if (Array.isArray(value)) return value.map(sortDeep);
        if (value !== null && typeof value === 'object') {
            const out = {};
            for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key]);
            return out;
        }
        return value;
    }

    function run(minify) {
        const data = parse();
        if (data === null && input.value.trim() !== '') return; // invalid: keep error visible
        if (data === null) { output.value = ''; return; }
        const val = sortKeys.checked ? sortDeep(data) : data;
        const indent = indentSel.value === 'tab' ? '\t' : Number(indentSel.value);
        output.value = minify ? JSON.stringify(val) : JSON.stringify(val, null, indent);
        const bytes = new Blob([output.value]).size;
        setStatus('ok', '<i class="fas fa-check-circle me-1"></i>' + t('Valid JSON', 'Geldige JSON')
            + ' — ' + describe(data) + ' · ' + (bytes >= 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' B'));
    }

    document.getElementById('jsonFormat').addEventListener('click', () => run(false));
    document.getElementById('jsonMinify').addEventListener('click', () => run(true));
    input.addEventListener('input', () => parse());

    document.getElementById('jsonCopy').addEventListener('click', (e) => {
        if (!output.value) return;
        navigator.clipboard.writeText(output.value).then(() => {
            const b = e.currentTarget || document.getElementById('jsonCopy');
            const old = b.innerHTML;
            b.innerHTML = '<i class="fas fa-check me-1"></i>' + t('Copied', 'Gekopieerd');
            setTimeout(() => { b.innerHTML = old; }, 1400);
        });
    });

    document.getElementById('jsonDownload').addEventListener('click', () => {
        if (!output.value) return;
        const blob = new Blob([output.value], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'data.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    document.getElementById('jsonClear').addEventListener('click', () => {
        input.value = ''; output.value = ''; setStatus('', '');
        input.focus();
    });

    document.getElementById('jsonExample').addEventListener('click', (e) => {
        e.preventDefault();
        input.value = '{"name":"Easy Plugins","free":true,"tools":[{"slug":"easy-json","category":"coding"},{"slug":"easy-image","category":"image"}],"visitors":{"2026":123456}}';
        run(false);
    });
})();
