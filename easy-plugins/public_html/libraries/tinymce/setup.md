# TinyMCE Setup Instructions

## Current Setup: CDN (Active)

The Easy HTML tool is currently using the CDN version (no download needed):

```html
<!-- Currently active: -->
<script src="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"></script>

<!-- Local files (if you want to download): -->
<!-- <script src="/libraries/tinymce/tinymce.min.js"></script> -->
```

## Option 2: Download Local Files

If you want to host TinyMCE locally:

1. Download TinyMCE from: https://www.tiny.cloud/get-tiny/self-hosted/
2. Extract files to `/public_html/libraries/tinymce/`
3. Ensure `tinymce.min.js` is in the root of the tinymce folder

## Current Configuration

The Easy HTML tool is configured to use:
- Self-hosted path: `/libraries/tinymce/tinymce.min.js`
- CDN fallback: `https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js`

## HTML Preservation Settings

The TinyMCE configuration includes settings to preserve complex HTML:
- `valid_elements: '*[*]'` - Allow all HTML elements and attributes
- `forced_root_block: false` - Don't force paragraphs
- `convert_urls: false` - Preserve original URLs
- `relative_urls: false` - Keep absolute URLs

This ensures divs, classes, styles, and complex HTML structures are preserved exactly as pasted.
