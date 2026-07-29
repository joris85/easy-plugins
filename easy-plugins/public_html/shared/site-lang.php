<?php
/**
 * Server-side language handling.
 *
 * Dutch pages live under /nl/... — .htaccess rewrites those URLs to the same
 * PHP files with ?siteLang=nl, so there are no duplicated page files. Pages
 * render Dutch text server-side, which makes the Dutch content visible to
 * search engines and AI crawlers (the old cookie-based JS translation is not).
 */

if (!defined('SITE_LANG')) {
    $requestedLang = $_GET['siteLang'] ?? '';
    define('SITE_LANG', $requestedLang === 'nl' ? 'nl' : 'en');
}

if (!function_exists('easyPluginsIsNl')) {
    function easyPluginsIsNl() {
        return SITE_LANG === 'nl';
    }
}

if (!function_exists('easyPluginsText')) {
    /** Inline bilingual text: easyPluginsText('English', 'Nederlands') */
    function easyPluginsText($en, $nl) {
        return easyPluginsIsNl() ? $nl : $en;
    }
}

if (!function_exists('easyPluginsTr')) {
    /** Translate an ini key server-side (same files the JS toggle uses). */
    function easyPluginsTr($key, $fallback = '') {
        static $strings = null;
        if (!easyPluginsIsNl()) {
            return $fallback;
        }
        if ($strings === null) {
            $iniPath = dirname(__DIR__) . '/lang/nl-NL.ini';
            $parsed = is_file($iniPath) ? @parse_ini_file($iniPath) : false;
            $strings = is_array($parsed) ? $parsed : [];
        }
        return $strings[$key] ?? $fallback;
    }
}

if (!function_exists('easyPluginsLangPathFor')) {
    /**
     * The URL path of this page in the given language, or null when the page
     * has no variant in that language. Only the homepage and the 12 tool
     * pages exist in Dutch.
     */
    function easyPluginsLangPathFor($canonicalPath, $lang) {
        if ($canonicalPath === null) {
            return null;
        }
        $isTranslatable = $canonicalPath === '/'
            || (bool) preg_match('#^/easy-[a-z0-9-]+/$#', $canonicalPath);
        if (!$isTranslatable) {
            return $lang === 'en' ? $canonicalPath : null;
        }
        if ($lang === 'nl') {
            return $canonicalPath === '/' ? '/nl/' : '/nl' . $canonicalPath;
        }
        return $canonicalPath;
    }
}
