<?php
/**
 * Site-wide settings. Update SITE_LATEST_UPDATE when deploying meaningful changes.
 */
const SITE_LATEST_UPDATE = '27-06-2026';

/** ISO date (Y-m-d) for sitemap lastmod — update together with SITE_LATEST_UPDATE */
const SITE_SITEMAP_LASTMOD = '2026-06-27';

if (!function_exists('easyPluginsArticleUrl')) {
    function easyPluginsArticleUrl(): string
    {
        $host = $_SERVER['HTTP_HOST'] ?? 'easy-plugins.com';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';

        return 'https://' . $host . $uri;
    }
}

if (!function_exists('easyPluginsJsonEncode')) {
    function easyPluginsJsonEncode($data, int $flags = 0, string $fallback = '{}'): string
    {
        $json = json_encode($data, $flags | JSON_INVALID_UTF8_SUBSTITUTE);

        return $json !== false ? $json : $fallback;
    }
}

// Search engine verification codes: paste the code from Google Search Console /
// Bing Webmaster Tools here and the meta tags appear automatically.
if (!defined('SITE_GOOGLE_VERIFICATION')) {
    define('SITE_GOOGLE_VERIFICATION', '');
}
if (!defined('SITE_BING_VERIFICATION')) {
    define('SITE_BING_VERIFICATION', '');
}
