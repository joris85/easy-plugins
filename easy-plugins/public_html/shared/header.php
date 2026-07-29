<?php
require_once __DIR__ . '/site-config.php';
require_once __DIR__ . '/site-lang.php';
require_once __DIR__ . '/seo-meta.php';

// Detect current tool from URL path
$currentPath = $_SERVER['REQUEST_URI'] ?? '';
$currentTool = '';

if (strpos($currentPath, '/easy-image/') !== false) {
    $currentTool = 'easy-image';
} elseif (strpos($currentPath, '/easy-png/') !== false) {
    $currentTool = 'easy-png';
} elseif (strpos($currentPath, '/easy-watermark/') !== false) {
    $currentTool = 'easy-watermark';
} elseif (strpos($currentPath, '/easy-image-rotate/') !== false) {
    $currentTool = 'easy-image-rotate';
} elseif (strpos($currentPath, '/easy-html/') !== false) {
    $currentTool = 'easy-html';
} elseif (strpos($currentPath, '/easy-pricing/') !== false) {
    $currentTool = 'easy-pricing';
} elseif (strpos($currentPath, '/easy-text-converter/') !== false) {
    $currentTool = 'easy-text-converter';
} elseif (strpos($currentPath, '/easy-csv-converter/') !== false) {
    $currentTool = 'easy-csv-converter';
} elseif (strpos($currentPath, '/easy-search-replace/') !== false) {
    $currentTool = 'easy-search-replace';
} elseif (strpos($currentPath, '/easy-identify-me/') !== false) {
    $currentTool = 'easy-identify-me';
} elseif (strpos($currentPath, '/easy-less/') !== false) {
    $currentTool = 'easy-less';
} elseif (strpos($currentPath, '/easy-sass/') !== false) {
    $currentTool = 'easy-sass';
} elseif (strpos($currentPath, '/plugins/') !== false) {
    $currentTool = 'plugins';
}
?>
<?php
// Language handling: /nl/ URLs win; otherwise the visitor's cookie choice.
$isNlPage = easyPluginsIsNl();
$htmlLang = $isNlPage ? 'nl' : ((($_COOKIE['selectedLanguage'] ?? '') === 'nl-NL') ? 'nl' : 'en');

// Dutch pages get Dutch titles/descriptions from the central registry.
$headSlug = isset($canonicalPath) ? easyPluginsSeoSlugFromPath($canonicalPath) : null;
if ($isNlPage) {
    $allSeoMeta = easyPluginsSeoMeta();
    if ($headSlug && !empty($allSeoMeta[$headSlug]['title_nl'])) {
        $pageTitle = $allSeoMeta[$headSlug]['title_nl'];
    }
    if ($headSlug && !empty($allSeoMeta[$headSlug]['desc_nl'])) {
        $metaDescription = $allSeoMeta[$headSlug]['desc_nl'];
    }
    if (($canonicalPath ?? null) === '/') {
        $pageTitle = 'Easy Plugins - Eenvoudige Tools voor Iedereen';
        $metaDescription = 'Gratis online tools: afbeeldingen verkleinen, bijsnijden en comprimeren, HTML opschonen, CSV en tekst converteren, prijzen berekenen en meer. Geen account nodig.';
    }
}

// Canonical + hreflang variants
$canonicalCurrent = isset($canonicalPath)
    ? easyPluginsLangPathFor($canonicalPath, $isNlPage ? 'nl' : 'en')
    : null;
$hreflangEn = isset($canonicalPath) ? easyPluginsLangPathFor($canonicalPath, 'en') : null;
$hreflangNl = isset($canonicalPath) ? easyPluginsLangPathFor($canonicalPath, 'nl') : null;
?>
<!DOCTYPE html>
<html lang="<?= $htmlLang ?>">
<head>
    <!-- CRITICAL: Inline style for immediate dark mode - no flash -->
    <style>
        /* Only apply dark styles when dark class is present */
        html.dark { background: #0d0d0d !important; }
        html.dark body { background: #0d0d0d !important; color: #a0a0a0 !important; }
        
        /* Ensure light mode works properly */
        html:not(.dark) { background: #ffffff; }
        html:not(.dark) body { background: #ffffff; color: #000000; }
    </style>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= isset($pageTitle) ? $pageTitle : 'Easy Plugins - Simple Tools for Everyone' ?></title>
<?php if (!empty($metaDescription)): ?>
    <meta name="description" content="<?= htmlspecialchars($metaDescription, ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
<?php if ($canonicalCurrent !== null): ?>
    <link rel="canonical" href="https://easy-plugins.com<?= htmlspecialchars($canonicalCurrent, ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
<?php if ($hreflangEn !== null && $hreflangNl !== null): ?>
    <link rel="alternate" hreflang="en" href="https://easy-plugins.com<?= htmlspecialchars($hreflangEn, ENT_QUOTES, 'UTF-8') ?>">
    <link rel="alternate" hreflang="nl" href="https://easy-plugins.com<?= htmlspecialchars($hreflangNl, ENT_QUOTES, 'UTF-8') ?>">
    <link rel="alternate" hreflang="x-default" href="https://easy-plugins.com<?= htmlspecialchars($hreflangEn, ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
<?php
// Social cards + WebApplication structured data, derived from the canonical path
$seoSlug = $headSlug;
$seoAll = easyPluginsSeoMeta();
$ogImage = $seoSlug ? "/og/{$seoSlug}.png" : '/og/site.png';
if (isset($canonicalPath)):
?>
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Easy Plugins">
    <meta property="og:title" content="<?= htmlspecialchars($pageTitle ?? 'Easy Plugins', ENT_QUOTES, 'UTF-8') ?>">
<?php if (!empty($metaDescription)): ?>
    <meta property="og:description" content="<?= htmlspecialchars($metaDescription, ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
    <meta property="og:url" content="https://easy-plugins.com<?= htmlspecialchars($canonicalCurrent ?? $canonicalPath, ENT_QUOTES, 'UTF-8') ?>">
    <meta property="og:image" content="https://easy-plugins.com<?= htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8') ?>">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= htmlspecialchars($pageTitle ?? 'Easy Plugins', ENT_QUOTES, 'UTF-8') ?>">
    <meta name="twitter:image" content="https://easy-plugins.com<?= htmlspecialchars($ogImage, ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
<?php if ($seoSlug): $seoTool = $seoAll[$seoSlug]; ?>
    <script type="application/ld+json">
    <?= json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'WebApplication',
        'name' => $seoTool['name'],
        'url' => 'https://easy-plugins.com' . ($canonicalCurrent ?? "/{$seoSlug}/"),
        'inLanguage' => $isNlPage ? 'nl' : 'en',
        'description' => $metaDescription ?? $seoTool['tagline'],
        'applicationCategory' => $seoTool['category'],
        'operatingSystem' => 'Any (web browser)',
        'browserRequirements' => 'Requires JavaScript',
        'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'EUR'],
        'featureList' => $seoTool['features'],
        'publisher' => ['@type' => 'Organization', 'name' => 'Easy Plugins', 'url' => 'https://easy-plugins.com/'],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?>

    </script>
<?php elseif (($canonicalPath ?? null) === '/'): ?>
    <script type="application/ld+json">
    <?= json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'WebSite',
        'name' => 'Easy Plugins',
        'url' => 'https://easy-plugins.com/',
        'description' => $metaDescription ?? 'Free, privacy-focused web tools for everyday tasks.',
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?>

    </script>
<?php endif; ?>
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Faster CDN handshakes -->
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
<?php if (defined('SITE_GOOGLE_VERIFICATION') && SITE_GOOGLE_VERIFICATION !== ''): ?>
    <meta name="google-site-verification" content="<?= htmlspecialchars(SITE_GOOGLE_VERIFICATION, ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
<?php if (defined('SITE_BING_VERIFICATION') && SITE_BING_VERIFICATION !== ''): ?>
    <meta name="msvalidate.01" content="<?= htmlspecialchars(SITE_BING_VERIFICATION, ENT_QUOTES, 'UTF-8') ?>">
<?php endif; ?>
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">

    <!-- CRITICAL: Dark mode CSS - MUST LOAD FIRST -->
    <link rel="stylesheet" href="/shared/darkmode.css">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM" crossorigin="anonymous">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    
    <!-- Unified Master CSS -->
    <link rel="stylesheet" href="/shared/master.css?v=2.3">
    
    <!-- Theme Management -->
    <script src="/shared/theme.js"></script>
    
    <!-- Translation System -->
    <script src="/shared/translations.js"></script>
    
    <!-- CRITICAL: ULTRA-ROBUST theme flash prevention -->
    <script>
        // Apply theme immediately with multiple fallbacks
        (function() {
            const isDark = localStorage.getItem('theme') === 'dark' || 
                          (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
            
            // Apply theme classes immediately
            if (isDark) {
                // Method 1: Apply to html immediately (most critical)
                document.documentElement.classList.add('dark');
                
                // Method 2: Apply to body if available
                if (document.body) {
                    document.body.classList.add('dark');
                }
                
                // Method 3: Fallback for body when it becomes available
                const applyToBody = function() {
                    if (document.body) {
                        document.body.classList.add('dark');
                    }
                };
                
                // Multiple fallback mechanisms
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', applyToBody);
                } else {
                    applyToBody();
                }
                
                // Additional fallback with setTimeout
                setTimeout(applyToBody, 0);
            } else {
                // Ensure light mode is properly applied
                document.documentElement.classList.remove('dark');
                if (document.body) {
                    document.body.classList.remove('dark');
                }
            }
        })();
    </script>
    
</head>
<body>
<!-- Header styles now in master.css -->
<!-- Shared Header Component - Simplified Structure -->
<nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
    <div class="container">
        <div class="d-flex justify-content-between align-items-center w-100">
            <!-- Logo on the left -->
            <a class="navbar-brand fw-bold ep-brand" href="/">
                <svg class="ep-brand-mark" width="34" height="34" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Easy Plugins">
                    <circle cx="14" cy="17" r="7" fill="none" stroke-width="4.4"/>
                    <circle class="ep-mark-alt" cx="34" cy="17" r="7" fill="none" stroke-width="4.4"/>
                    <line x1="21" y1="17" x2="27" y2="17" stroke-width="3.8" stroke-linecap="round"/>
                    <path class="ep-mark-smile" d="M9 33 C 15 41.5, 33 41.5, 39 33" fill="none" stroke-width="5.2" stroke-linecap="round"/>
                </svg>
                <span class="ep-brand-text">easy <strong>plugins</strong></span>
            </a>
            
            <!-- Mobile toggle button -->
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            
            <!-- Menu on the right -->
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <!-- Image Tools Dropdown -->
                    <li class="nav-item dropdown" onmouseenter="showDropdown('imageToolsDropdown')" onmouseleave="hideDropdown('imageToolsDropdown')">
                        <a class="nav-link dropdown-toggle <?= in_array($currentTool, ['easy-image', 'easy-png', 'easy-watermark', 'easy-image-rotate']) ? 'active' : '' ?>" href="#" id="imageToolsDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false" onmouseenter="showDropdown('imageToolsDropdown')">
                            <svg class="nav-cat-icon me-1" width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="8" width="36" height="32" rx="8" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="17.5" cy="18" r="3.2" fill="currentColor"/><path d="M12 32 C 17 24.5, 23 24.5, 28.5 31.5" fill="none" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"/></svg><span data-translate="NAV_IMAGE_TOOLS">Image Tools</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" id="imageToolsDropdownMenu" aria-labelledby="imageToolsDropdown" onmouseenter="showDropdown('imageToolsDropdown')" onmouseleave="hideDropdown('imageToolsDropdown')">
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-image' ? 'active' : '' ?>" href="/easy-image/" data-tool="easy-image">
                                    <img src="/brand/tools/easy-image.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon">Easy Image
                                    <small class="text-muted d-block ms-4">Resize, crop, and optimize images</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-png' ? 'active' : '' ?>" href="/easy-png/" data-tool="easy-png">
                                    <img src="/brand/tools/easy-png.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon">Easy PNG
                                    <small class="text-muted d-block ms-4">Add background to images</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-watermark' ? 'active' : '' ?>" href="/easy-watermark/" data-tool="easy-watermark">
                                    <img src="/brand/tools/easy-watermark.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon">Easy Watermark
                                    <small class="text-muted d-block ms-4">Add watermarks to images</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-image-rotate' ? 'active' : '' ?>" href="/easy-image-rotate/" data-tool="easy-image-rotate">
                                    <img src="/brand/tools/easy-image-rotate.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon">Easy Image Rotate
                                    <small class="text-muted d-block ms-4">Rotate images with real-time preview</small>
                                </a>
                            </li>
                        </ul>
                    </li>
                    
                    <!-- Text & Data Dropdown -->
                    <li class="nav-item dropdown" onmouseenter="showDropdown('textDataDropdown')" onmouseleave="hideDropdown('textDataDropdown')">
                        <a class="nav-link dropdown-toggle <?= in_array($currentTool, ['easy-text-converter', 'easy-csv-converter', 'easy-search-replace', 'easy-pricing']) ? 'active' : '' ?>" href="#" id="textDataDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false" onmouseenter="showDropdown('textDataDropdown')">
                            <svg class="nav-cat-icon me-1" width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><line x1="8" y1="12" x2="34" y2="12" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/><line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/><line x1="8" y1="36" x2="28" y2="36" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/></svg><span data-translate="NAV_TEXT_DATA">Text & Data</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" id="textDataDropdownMenu" aria-labelledby="textDataDropdown" onmouseenter="showDropdown('textDataDropdown')" onmouseleave="hideDropdown('textDataDropdown')">
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-text-converter' ? 'active' : '' ?>" href="/easy-text-converter/" data-tool="easy-text-converter">
                                    <img src="/brand/tools/easy-text-converter.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon"><span data-translate="NAV_EASY_TEXT">Easy Text</span>
                                    <small class="text-muted d-block ms-4" data-translate="NAV_EASY_TEXT_DESC">Text transformer</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-csv-converter' ? 'active' : '' ?>" href="/easy-csv-converter/" data-tool="easy-csv-converter">
                                    <img src="/brand/tools/easy-csv-converter.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon"><span data-translate="NAV_EASY_CSV">Easy CSV</span>
                                    <small class="text-muted d-block ms-4" data-translate="NAV_EASY_CSV_DESC">CSV converter</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-search-replace' ? 'active' : '' ?>" href="/easy-search-replace/" data-tool="easy-search-replace">
                                    <img src="/brand/tools/easy-search-replace.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon"><span data-translate="NAV_EASY_SEARCH">Easy Search</span>
                                    <small class="text-muted d-block ms-4" data-translate="NAV_EASY_SEARCH_DESC">Search and replace</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-pricing' ? 'active' : '' ?>" href="/easy-pricing/" data-tool="easy-pricing">
                                    <img src="/brand/tools/easy-pricing.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon"><span data-translate="NAV_EASY_PRICING">Easy Pricing</span>
                                    <small class="text-muted d-block ms-4" data-translate="NAV_EASY_PRICING_DESC">Pricing calculator</small>
                                </a>
                            </li>
                        </ul>
                    </li>
                    
                    <!-- Web Tools Dropdown -->
                    <li class="nav-item dropdown" onmouseenter="showDropdown('webToolsDropdown')" onmouseleave="hideDropdown('webToolsDropdown')">
                        <a class="nav-link dropdown-toggle <?= in_array($currentTool, ['easy-html', 'easy-identify-me', 'easy-less', 'easy-sass']) ? 'active' : '' ?>" href="#" id="webToolsDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false" onmouseenter="showDropdown('webToolsDropdown')">
                            <svg class="nav-cat-icon me-1" width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path d="M18.5 9 C 13.5 10.5, 15.5 16, 13.5 20 C 12.5 22, 10.5 23, 9 24 C 10.5 25, 12.5 26, 13.5 28 C 15.5 32, 13.5 37.5, 18.5 39" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M29.5 9 C 34.5 10.5, 32.5 16, 34.5 20 C 35.5 22, 37.5 23, 39 24 C 37.5 25, 35.5 26, 34.5 28 C 32.5 32, 34.5 37.5, 29.5 39" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg><span data-translate="NAV_WEB_TOOLS">Web Tools</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" id="webToolsDropdownMenu" aria-labelledby="webToolsDropdown" onmouseenter="showDropdown('webToolsDropdown')" onmouseleave="hideDropdown('webToolsDropdown')">
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-html' ? 'active' : '' ?>" href="/easy-html/" data-tool="easy-html">
                                    <img src="/brand/tools/easy-html.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon"><span data-translate="NAV_EASY_HTML">Easy HTML</span>
                                    <small class="text-muted d-block ms-4" data-translate="NAV_EASY_HTML_DESC">HTML cleaner</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-less' ? 'active' : '' ?>" href="/easy-less/" data-tool="easy-less">
                                    <img src="/brand/tools/easy-less.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon">Easy Less
                                    <small class="text-muted d-block ms-4">LESS to CSS compiler</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-sass' ? 'active' : '' ?>" href="/easy-sass/" data-tool="easy-sass">
                                    <img src="/brand/tools/easy-sass.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon">Easy SASS
                                    <small class="text-muted d-block ms-4">SASS/SCSS to CSS compiler</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-identify-me' ? 'active' : '' ?>" href="/easy-identify-me/" data-tool="easy-identify-me">
                                    <img src="/brand/tools/easy-identify-me.svg" alt="" width="18" height="18" class="me-2 nav-tool-icon">Easy Identify Me
                                    <small class="text-muted d-block ms-4">System information tool</small>
                                </a>
                            </li>
                        </ul>
                    </li>
                    
                    <li class="nav-item">
<?php
// Language switch: link to the other language's URL when this page has a
// variant; pages without a Dutch version link to the Dutch homepage.
$langSwitchTarget = $isNlPage
    ? ($hreflangEn ?? '/')
    : ($hreflangNl ?? '/nl/');
$langSwitchLabel = $isNlPage ? 'EN' : 'NL';
?>
                        <a class="nav-link lang-toggle-btn" href="<?= htmlspecialchars($langSwitchTarget, ENT_QUOTES, 'UTF-8') ?>" aria-label="Switch language" onclick="try { setCookie('selectedLanguage', '<?= $isNlPage ? 'en-GB' : 'nl-NL' ?>', 365); localStorage.setItem('selectedLanguage', '<?= $isNlPage ? 'en-GB' : 'nl-NL' ?>'); } catch (e) {}">
                            <span id="lang-label"><?= $langSwitchLabel ?></span>
                        </a>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle theme">
                            <i class="fas fa-moon" id="theme-icon"></i>
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</nav>

<script>
let dropdownTimer = null;
const allDropdownIds = ['imageToolsDropdown', 'textDataDropdown', 'webToolsDropdown'];

// Close all dropdowns except the specified one
function closeAllDropdownsExcept(exceptId) {
    allDropdownIds.forEach(dropdownId => {
        if (dropdownId !== exceptId) {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
                if (bsDropdown) {
                    bsDropdown.hide();
                }
            }
        }
    });
}

// Show dropdown on hover
function showDropdown(dropdownId) {
    // Clear any pending hide timer
    if (dropdownTimer) {
        clearTimeout(dropdownTimer);
        dropdownTimer = null;
    }
    
    // Close all other dropdowns first
    closeAllDropdownsExcept(dropdownId);
    
    const dropdown = document.getElementById(dropdownId);
    const menu = document.getElementById(dropdownId + 'Menu');
    if (dropdown && menu) {
        let bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
        if (!bsDropdown) {
            bsDropdown = new bootstrap.Dropdown(dropdown, {
                autoClose: false
            });
        }
        bsDropdown.show();
    }
}

// Hide dropdown on mouse leave with small delay
function hideDropdown(dropdownId) {
    // Add small delay to prevent flickering when moving between trigger and menu
    dropdownTimer = setTimeout(() => {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
            if (bsDropdown) {
                bsDropdown.hide();
            }
        }
        dropdownTimer = null;
    }, 100);
}
</script>
