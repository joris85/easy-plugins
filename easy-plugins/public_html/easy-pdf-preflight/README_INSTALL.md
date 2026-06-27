# Installing PDF Parser Library (No Root Access Required)

This tool uses a pure PHP library to extract images from PDFs, which means you don't need root access or system-level tools like poppler.

## Installation Steps

### 1. Install Composer (if not already installed)

Composer can be installed locally without root access:

```bash
# Download Composer
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
php -r "unlink('composer-setup.php');"

# Make it executable
chmod +x composer.phar
```

### 2. Install the PDF Parser Library

Navigate to the easy-pdf-preflight directory and run:

```bash
cd /path/to/easy-plugins/public_html/easy-pdf-preflight
php composer.phar install
```

Or if you have Composer globally installed:

```bash
cd /path/to/easy-plugins/public_html/easy-pdf-preflight
composer install
```

This will:
- Create a `vendor/` directory
- Install the `smalot/pdfparser` library (pure PHP, no dependencies)
- Set up autoloading

### 3. Verify Installation

After installation, the `vendor/` directory should exist with:
- `vendor/autoload.php` - Autoloader file
- `vendor/smalot/pdfparser/` - The PDF parser library

### 4. Test It

Run the smoke test:

```bash
php tests/run.php
```

Upload a PDF in the browser. You should see document info, fonts, and images. Use **Extract Images** to download individual images or a ZIP.

## Deployment

After deploying to production, always run:

```bash
cd public_html/easy-pdf-preflight
composer install --no-dev --optimize-autoloader
php tests/run.php
```

Ensure `vendor/autoload.php` exists on the server. Without it, analysis will fail with a clear error message.

### Optional: poppler-utils

If `pdfinfo`, `pdffonts`, and `pdfimages` are available on the server, the tool automatically uses them for richer image DPI data and more reliable image extraction. On shared hosting without poppler, the pure PHP library still works.

## How It Works

- **Analysis**: `smalot/pdfparser` (pure PHP), enriched with poppler when available
- **Image extraction**: poppler `pdfimages` when available, otherwise smalot
- **Client-side**: pdf.js for instant quick info (pages, file size, dimensions)
- **No root access needed**: The PHP library is installed in your project directory

## Troubleshooting

### If you get "PDF parser library is not installed" error:

1. Make sure you're in the correct directory
2. Run `composer install` again
3. Check that `vendor/autoload.php` exists
4. Verify file permissions allow reading the vendor directory

### If Composer is not available:

Some shared hosting providers don't allow Composer. In that case:
1. Download the library manually from: https://github.com/smalot/pdfparser
2. Extract it to `vendor/smalot/pdfparser/`
3. Create `vendor/autoload.php` manually or use the library's autoloader

## Alternative: Manual Installation

If you can't use Composer, you can manually download and install the library:

1. Download from: https://github.com/smalot/pdfparser/releases
2. Extract to: `vendor/smalot/pdfparser/`
3. Include the library manually in `extract_images.php`



