# TinyMCE Self-Hosted Library

This directory contains the TinyMCE self-hosted files for use across Easy Plugins tools.

## Current Usage (CDN - Active)

Easy HTML currently uses the CDN version (no local files needed):
```html
<script src="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"></script>
```

## Local Files (Optional)

If you want to host TinyMCE locally, download and place files here:
- `tinymce.min.js` - Main TinyMCE library
- `themes/` - TinyMCE themes
- `plugins/` - TinyMCE plugins  
- `skins/` - TinyMCE skins

Then reference in your HTML:
```html
<script src="/libraries/tinymce/tinymce.min.js"></script>
```

## Benefits of CDN

- No download or setup required
- Always up-to-date version
- Faster loading (cached by CDN)
- No server storage needed
