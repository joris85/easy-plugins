<?php
require_once __DIR__ . '/site-config.php';

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
<!DOCTYPE html>
<html lang="en">
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
    <link rel="icon" type="image/x-icon" href="<?= isset($faviconPath) ? $faviconPath : '/favicon.ico' ?>">
    
    <!-- CRITICAL: Dark mode CSS - MUST LOAD FIRST -->
    <link rel="stylesheet" href="<?= isset($darkmodePath) ? $darkmodePath : '/shared/darkmode.css' ?>">
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    
    <!-- Unified Master CSS -->
    <link rel="stylesheet" href="<?= isset($cssPath) ? $cssPath : '/shared/master.css' ?>">
    
    <!-- Theme Management -->
    <script src="<?= isset($themePath) ? $themePath : '/shared/theme.js' ?>"></script>
    
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
            <a class="navbar-brand fw-bold" href="/">
                <i class="fas fa-tools me-2"></i>
                Easy Plugins
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
                            <i class="fas fa-image me-1"></i><span data-translate="NAV_IMAGE_TOOLS">Image Tools</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" id="imageToolsDropdownMenu" aria-labelledby="imageToolsDropdown" onmouseenter="showDropdown('imageToolsDropdown')" onmouseleave="hideDropdown('imageToolsDropdown')">
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-image' ? 'active' : '' ?>" href="/easy-image/" data-tool="easy-image">
                                    <i class="fas fa-image me-2"></i>Easy Image
                                    <small class="text-muted d-block ms-4">Resize, crop, and optimize images</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-png' ? 'active' : '' ?>" href="/easy-png/" data-tool="easy-png">
                                    <i class="fas fa-file-image me-2"></i>Easy PNG
                                    <small class="text-muted d-block ms-4">Add background to images</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-watermark' ? 'active' : '' ?>" href="/easy-watermark/" data-tool="easy-watermark">
                                    <i class="fas fa-tint me-2"></i>Easy Watermark
                                    <small class="text-muted d-block ms-4">Add watermarks to images</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-image-rotate' ? 'active' : '' ?>" href="/easy-image-rotate/" data-tool="easy-image-rotate">
                                    <i class="fas fa-redo me-2"></i>Easy Image Rotate
                                    <small class="text-muted d-block ms-4">Rotate images with real-time preview</small>
                                </a>
                            </li>
                        </ul>
                    </li>
                    
                    <!-- Text & Data Dropdown -->
                    <li class="nav-item dropdown" onmouseenter="showDropdown('textDataDropdown')" onmouseleave="hideDropdown('textDataDropdown')">
                        <a class="nav-link dropdown-toggle <?= in_array($currentTool, ['easy-text-converter', 'easy-csv-converter', 'easy-search-replace', 'easy-pricing']) ? 'active' : '' ?>" href="#" id="textDataDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false" onmouseenter="showDropdown('textDataDropdown')">
                            <i class="fas fa-file-alt me-1"></i><span data-translate="NAV_TEXT_DATA">Text & Data</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" id="textDataDropdownMenu" aria-labelledby="textDataDropdown" onmouseenter="showDropdown('textDataDropdown')" onmouseleave="hideDropdown('textDataDropdown')">
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-text-converter' ? 'active' : '' ?>" href="/easy-text-converter/" data-tool="easy-text-converter">
                                    <i class="fas fa-text-width me-2"></i><span data-translate="NAV_EASY_TEXT">Easy Text</span>
                                    <small class="text-muted d-block ms-4" data-translate="NAV_EASY_TEXT_DESC">Text transformer</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-csv-converter' ? 'active' : '' ?>" href="/easy-csv-converter/" data-tool="easy-csv-converter">
                                    <i class="fas fa-file-csv me-2"></i><span data-translate="NAV_EASY_CSV">Easy CSV</span>
                                    <small class="text-muted d-block ms-4" data-translate="NAV_EASY_CSV_DESC">CSV converter</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-search-replace' ? 'active' : '' ?>" href="/easy-search-replace/" data-tool="easy-search-replace">
                                    <i class="fas fa-search me-2"></i><span data-translate="NAV_EASY_SEARCH">Easy Search</span>
                                    <small class="text-muted d-block ms-4" data-translate="NAV_EASY_SEARCH_DESC">Search and replace</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-pricing' ? 'active' : '' ?>" href="/easy-pricing/" data-tool="easy-pricing">
                                    <i class="fas fa-calculator me-2"></i><span data-translate="NAV_EASY_PRICING">Easy Pricing</span>
                                    <small class="text-muted d-block ms-4" data-translate="NAV_EASY_PRICING_DESC">Pricing calculator</small>
                                </a>
                            </li>
                        </ul>
                    </li>
                    
                    <!-- Web Tools Dropdown -->
                    <li class="nav-item dropdown" onmouseenter="showDropdown('webToolsDropdown')" onmouseleave="hideDropdown('webToolsDropdown')">
                        <a class="nav-link dropdown-toggle <?= in_array($currentTool, ['easy-html', 'easy-identify-me', 'easy-less', 'easy-sass']) ? 'active' : '' ?>" href="#" id="webToolsDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false" onmouseenter="showDropdown('webToolsDropdown')">
                            <i class="fas fa-globe me-1"></i><span data-translate="NAV_WEB_TOOLS">Web Tools</span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" id="webToolsDropdownMenu" aria-labelledby="webToolsDropdown" onmouseenter="showDropdown('webToolsDropdown')" onmouseleave="hideDropdown('webToolsDropdown')">
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-html' ? 'active' : '' ?>" href="/easy-html/" data-tool="easy-html">
                                    <i class="fas fa-code me-2"></i><span data-translate="NAV_EASY_HTML">Easy HTML</span>
                                    <small class="text-muted d-block ms-4" data-translate="NAV_EASY_HTML_DESC">HTML cleaner</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-less' ? 'active' : '' ?>" href="/easy-less/" data-tool="easy-less">
                                    <i class="fas fa-file-code me-2"></i>Easy Less
                                    <small class="text-muted d-block ms-4">LESS to CSS compiler</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-sass' ? 'active' : '' ?>" href="/easy-sass/" data-tool="easy-sass">
                                    <i class="fas fa-code me-2"></i>Easy SASS
                                    <small class="text-muted d-block ms-4">SASS/SCSS to CSS compiler</small>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item <?= $currentTool === 'easy-identify-me' ? 'active' : '' ?>" href="/easy-identify-me/" data-tool="easy-identify-me">
                                    <i class="fas fa-id-card me-2"></i>Easy Identify Me
                                    <small class="text-muted d-block ms-4">System information tool</small>
                                </a>
                            </li>
                        </ul>
                    </li>
                    
                    <li class="nav-item">
                        <button class="nav-link lang-toggle-btn" onclick="toggleLanguage()" aria-label="Switch language">
                            <span id="lang-label">NL</span>
                        </button>
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
