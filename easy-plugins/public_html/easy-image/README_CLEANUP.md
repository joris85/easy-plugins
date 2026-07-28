# Image Cleanup System

This system automatically removes images older than 10 minutes from all upload subdirectories (`resize`, `crop`, `optimize`, `custom`). Cleanup runs every 30 minutes via cron, so images stay on the server for at most about 40 minutes.

## Files

- `cleanup_images.php` - CLI-only PHP script that performs the cleanup
- `run_cleanup.sh` - Shell script wrapper for cron execution
- `cleanup_log.txt` - Detailed log of file removals (not web-accessible)
- `cleanup_cron.log` - Cron execution log (not web-accessible)
- `cleanup.lock` - Lock file to prevent multiple executions

## Setup Instructions

### 1. Make sure the script is executable
```bash
chmod +x /path/to/public_html/easy-image/run_cleanup.sh
```

### 2. Test the script manually
```bash
cd /path/to/public_html/easy-image
./run_cleanup.sh
```

Or directly:
```bash
php cleanup_images.php
```

### 3. Set up the cronjob

```bash
crontab -e
# Add this line to run every 30 minutes
*/30 * * * * /path/to/public_html/easy-image/run_cleanup.sh
```

## Configuration

You can modify the cleanup settings in `cleanup_images.php`:

- `$maxAgeMinutes` - Files older than this are deleted (default: 10)
- `$uploadsDir` - Directory to clean (default: `uploads/`)

## Security

- `cleanup_images.php` is **CLI-only** — web requests return 403
- HTTP access to `cleanup_images.php` is blocked via `.htaccess`
- Log files are not served over the web

## User-facing policy

Images are automatically removed within about 40 minutes. Users do not need to take any manual action.
