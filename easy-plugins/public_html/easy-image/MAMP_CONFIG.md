# MAMP Configuration for Large Images

## The Problem
You're getting 500 Internal Server Error with larger images because MAMP has restrictive PHP limits by default.

## MAMP PRO: FastCGI 30-second timeout (most common cause)

MAMP PRO runs PHP through mod_fastcgi with a **30 second idle timeout**. A large
image encode takes longer than that, so Apache kills PHP mid-request and returns
an HTML 500 page. You'll see this in `/Applications/MAMP/logs/apache_ssl_error.log`:

```
FastCGI: comm with server ".../php8.4.15.fcgi" aborted: idle timeout (30 sec)
```

`max_execution_time` in php.ini does NOT fix this — it's Apache's timeout, not PHP's.

**Fix, either of:**

1. **Run PHP as a module** (simplest): MAMP PRO → Hosts → select the host →
   PHP tab → set PHP Mode to "Module" instead of "CGI mode" and restart.
2. **Raise the FastCGI timeout**: MAMP PRO → menu File → Edit Template →
   Apache → httpd.conf, find the `FastCgiServer` / `FastCgiConfig` line and add
   `-idle-timeout 300`, then save and restart the servers.

The app also picks a faster WebP encoder automatically for very large images
(see `webpMethodForSize()` in `src/models/ImageProcessor.php`), which keeps
most images inside the default timeout anyway.

## The Solution

### 1. Update MAMP PHP Configuration

1. **Open MAMP Preferences**
2. **Go to PHP tab**
3. **Click "Edit" next to the PHP version**
4. **Add these settings to your php.ini file:**

```ini
; File Upload Limits
upload_max_filesize = 100M
post_max_size = 256M
max_file_uploads = 100

; Memory and Execution Limits
memory_limit = 512M
max_execution_time = 300
max_input_time = 300

; Input Limits
max_input_vars = 3000
max_input_nesting_level = 64
```

### 2. Restart MAMP
After making changes, restart MAMP servers.

### 3. Test the Configuration
Visit: `http://localhost:8890/easy-image/check_limits.php`

This will show you the current limits and recommendations.

## Alternative: Use Smaller Images

The app now has built-in protection:
- **Maximum file size**: 50MB per image
- **Maximum total size**: 256MB for all images
- **Maximum files**: 100 images at once

If you get errors, try:
1. **Smaller images** (under 10MB each)
2. **Fewer images** at once
3. **Convert to WebP** format first

## Why This Happens

MAMP's default PHP configuration is designed for small websites, not image processing:
- `upload_max_filesize` is often 2M (too small for photos)
- `post_max_size` is often 8M (too small for multiple images)
- `memory_limit` is often 128M (too small for image processing)

## Quick Fix for Testing

If you can't change MAMP settings, the app will now:
1. **Warn you** about large files before upload
2. **Give better error messages** when things fail
3. **Suggest solutions** for large image problems

Try uploading smaller images first to test the functionality!

