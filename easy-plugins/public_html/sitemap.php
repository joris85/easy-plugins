<?php
require_once __DIR__ . '/shared/site-config.php';
header('Content-Type: application/xml; charset=utf-8');

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'easy-plugins.com';
$baseUrl = $protocol . '://' . $host;
$lastmod = SITE_SITEMAP_LASTMOD;

$toolPages = [
    '/easy-image/',
    '/easy-png/',
    '/easy-watermark/',
    '/easy-image-rotate/',
    '/easy-html/',
    '/easy-pricing/',
    '/easy-text-converter/',
    '/easy-csv-converter/',
    '/easy-search-replace/',
    '/easy-identify-me/',
    '/easy-less/',
    '/easy-sass/',
];

$pluginPages = [
    '/plugins/easy-image',
    '/plugins/easy-png',
    '/plugins/easy-watermark',
    '/plugins/easy-image-rotate',
    '/plugins/easy-html',
    '/plugins/easy-pricing',
    '/plugins/easy-text-converter',
    '/plugins/easy-csv-converter',
    '/plugins/easy-search-replace',
    '/plugins/easy-identify-me',
    '/plugins/easy-less',
    '/plugins/easy-sass',
];

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
    <url>
        <loc><?= $baseUrl ?>/</loc>
        <xhtml:link rel="alternate" hreflang="en" href="<?= $baseUrl ?>/"/>
        <xhtml:link rel="alternate" hreflang="nl" href="<?= $baseUrl ?>/nl/"/>
        <lastmod><?= $lastmod ?></lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc><?= $baseUrl ?>/nl/</loc>
        <xhtml:link rel="alternate" hreflang="en" href="<?= $baseUrl ?>/"/>
        <xhtml:link rel="alternate" hreflang="nl" href="<?= $baseUrl ?>/nl/"/>
        <lastmod><?= $lastmod ?></lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
<?php foreach ($toolPages as $path): ?>
    <url>
        <loc><?= $baseUrl ?><?= $path ?></loc>
        <xhtml:link rel="alternate" hreflang="en" href="<?= $baseUrl ?><?= $path ?>"/>
        <xhtml:link rel="alternate" hreflang="nl" href="<?= $baseUrl ?>/nl<?= $path ?>"/>
        <lastmod><?= $lastmod ?></lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc><?= $baseUrl ?>/nl<?= $path ?></loc>
        <xhtml:link rel="alternate" hreflang="en" href="<?= $baseUrl ?><?= $path ?>"/>
        <xhtml:link rel="alternate" hreflang="nl" href="<?= $baseUrl ?>/nl<?= $path ?>"/>
        <lastmod><?= $lastmod ?></lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
<?php endforeach; ?>
<?php foreach ($pluginPages as $path): ?>
    <url>
        <loc><?= $baseUrl ?><?= $path ?></loc>
        <lastmod><?= $lastmod ?></lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
<?php endforeach; ?>
</urlset>
