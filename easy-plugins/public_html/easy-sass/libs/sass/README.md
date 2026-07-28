# SASS Compiler Library

This directory can contain a local copy of the SASS compiler library for offline use.

## Automatic CDN Loading

The Easy SASS tool will automatically load the SASS compiler from CDN sources. You don't need to download anything manually unless you want offline support.

## Manual Download (Optional - for offline use)

If you want to use a local copy for offline support:

1. Open your browser and go to:
   https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.13/sass.sync.min.js

2. Right-click and "Save As" or copy the content

3. Save the file as `sass.sync.min.js` in this directory (`libs/sass/`)

4. Refresh the Easy SASS page

## Using the Download Script

You can also run the download script:
```bash
cd libs/sass
bash download.sh
```

**Note:** The tool works perfectly fine with CDN sources. Local files are optional and only needed for offline use.

