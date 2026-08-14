<?php
$pageTitle = 'Easy Plugins - Simple Tools for Everyone';
$metaDescription = 'Free online tools: resize, crop and compress images, clean HTML, convert CSV and text, calculate prices and more. No account, no installs, private by design.';
$canonicalPath = '/';
include 'shared/header.php';

// Bilingual helpers: $L('English', 'Nederlands') and tool links per language
$L = 'easyPluginsText';
$toolHref = function ($slug) {
    return easyPluginsIsNl() ? "/nl/{$slug}/" : "{$slug}/index.php";
};
?>
    
    <!-- Hero Section -->
    <div class="hero-section">
        <div class="container">
            <div class="row justify-content-center text-center">
                <div class="col-lg-8">
                    <h1 class="hero-title" data-translate="HOME_TITLE">
                        <i class="fas fa-puzzle-piece me-3"></i>
                        <?= $L('Easy Plugins - Simple Tools for Everyone', 'Easy Plugins - Eenvoudige Tools voor Iedereen') ?>
                    </h1>
                    <p class="hero-subtitle" data-translate="HOME_SUBTITLE">
                        <?= $L('Free, privacy-focused web tools for everyday tasks', 'Gratis, privacy-gerichte web tools voor dagelijkse taken') ?>
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- Featured tool styles -->
    <style>
        .plugin-card.plugin-card-featured {
            position: relative;
            border: 2px solid #4CAF50 !important;
            overflow: visible;
        }
        body.dark .plugin-card.plugin-card-featured,
        html.dark .plugin-card.plugin-card-featured {
            border: 2px solid #4CAF50 !important;
        }
        .plugin-card-featured .card-body {
            padding: 2rem;
        }
        .featured-badge {
            position: absolute;
            top: -14px;
            left: 1.5rem;
            background: #4CAF50;
            color: #fff;
            padding: 0.3rem 1rem;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.02em;
        }
        .featured-feature-list {
            list-style: none;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.65rem 1.5rem;
            margin: 0;
            padding: 0;
        }
        .featured-feature-list li {
            display: flex;
            align-items: flex-start;
            gap: 0.6rem;
            line-height: 1.4;
        }
        .featured-feature-list li i {
            color: #4CAF50;
            margin-top: 0.2rem;
            flex-shrink: 0;
        }
        @media (max-width: 576px) {
            .featured-feature-list {
                grid-template-columns: 1fr;
            }
            .plugin-card-featured .card-body {
                padding: 1.5rem;
            }
        }
    </style>

    <!-- Plugins Section -->
    <div class="container">
        <div class="row g-4 mb-5">
            <!-- Easy Image (featured tool) -->
            <div class="col-12">
                <div class="plugin-card plugin-card-featured card shadow-sm">
                    <div class="card-body">
                        <span class="featured-badge"><i class="fas fa-star me-1"></i> <?= $L('Most popular', 'Populairste tool') ?></span>
                        <div class="row align-items-center g-4">
                            <div class="col-md-5 text-center text-md-start">
                                <div class="d-flex align-items-center gap-3 mb-3 justify-content-center justify-content-md-start">
                                    <a href="<?= $toolHref('easy-image') ?>" class="text-decoration-none">
                                        <img src="/brand/tools/easy-image.svg" alt="" width="58" height="58" class="plugin-icon">
                                    </a>
                                    <h3 class="plugin-title h2 mb-0">
                                        <a href="<?= $toolHref('easy-image') ?>" class="text-decoration-none" data-translate="PLUGIN_EASY_IMAGE_TITLE">Easy Image</a>
                                    </h3>
                                </div>
                                <p class="plugin-description text-muted mb-4" data-translate="PLUGIN_EASY_IMAGE_DESC">
                                    <?= $L('All your image work in one tool: resize, crop, compress and convert whole batches in seconds, with professional quality output. No software, no account, just results.', 'Al je beeldbewerking in één tool: verklein, knip, comprimeer en converteer hele batches in seconden, met professionele kwaliteit. Geen software, geen account, gewoon resultaat.') ?>
                                </p>
                                <div class="plugin-actions d-flex gap-2 justify-content-center justify-content-md-start">
                                    <a href="<?= $toolHref('easy-image') ?>" class="btn btn-primary">
                                        <?= $L('Open Easy Image', 'Open Easy Image') ?> <i class="fas fa-arrow-right ms-1"></i>
                                    </a>
                                    <a href="plugins/easy-image" class="btn btn-outline-secondary">
                                        <?= $L('More information', 'Meer informatie') ?>
                                    </a>
                                </div>
                            </div>
                            <div class="col-md-7">
                                <ul class="featured-feature-list">
                                    <li><i class="fas fa-check"></i> <?= $L('Resize by width, height or fit inside a box', 'Verklein op breedte, hoogte of passend in een kader') ?></li>
                                    <li><i class="fas fa-check"></i> <?= $L('Crop with presets, free selection or auto focus', 'Knip met presets, vrije selectie of automatische focus') ?></li>
                                    <li><i class="fas fa-check"></i> <?= $L('Compress to an exact file size in KB', 'Comprimeer naar een exacte bestandsgrootte in KB') ?></li>
                                    <li><i class="fas fa-check"></i> <?= $L('Convert to WebP, JPG or PNG', 'Converteer naar WebP, JPG of PNG') ?></li>
                                    <li><i class="fas fa-check"></i> <?= $L('Up to 100 images in one batch', 'Tot 100 afbeeldingen in één batch') ?></li>
                                    <li><i class="fas fa-check"></i> <?= $L('Auto enhance and photo effects', 'Automatisch verbeteren en foto-effecten') ?></li>
                                    <li><i class="fas fa-check"></i> <?= $L('Keeps colors and quality intact', 'Kleuren en kwaliteit blijven intact') ?></li>
                                    <li><i class="fas fa-check"></i> <?= $L('Private: uploads are deleted automatically', 'Privé: uploads worden automatisch verwijderd') ?></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tool cards (generated from the shared registry, bilingual) -->
            <?php
            $homeCards = [
                'easy-png' => ['fa-file-image', '#4CAF50'],
                'easy-pricing' => ['fa-calculator', '#28a745'],
                'easy-html' => ['fa-code', '#dc3545'],
                'easy-text-converter' => ['fa-text-width', '#17a2b8'],
                'easy-csv-converter' => ['fa-file-csv', '#4CAF50'],
                'easy-search-replace' => ['fa-search', '#17a2b8'],
                'easy-watermark' => ['fa-tint', '#4CAF50'],
                'easy-image-rotate' => ['fa-redo', '#667eea'],
                'easy-identify-me' => ['fa-id-card', '#6f42c1'],
                'easy-less' => ['fa-file-code', '#1e88e5'],
                'easy-sass' => ['fa-code', '#bf4080'],
                'easy-website-audit' => ['fa-gauge-high', '#4CAF50'],
                'easy-broken-links' => ['fa-link-slash', '#dc3545'],
                'easy-image-audit' => ['fa-magnifying-glass', '#17a2b8'],
                'easy-domain-check' => ['fa-globe', '#4CAF50'],
                'easy-favicon' => ['fa-star', '#f0ad4e'],
                'easy-qr' => ['fa-qrcode', '#1e1e1e'],
                'easy-color' => ['fa-palette', '#bf4080'],
                'easy-ip-check' => ['fa-network-wired', '#17a2b8'],
                'easy-json' => ['fa-code', '#1e88e5'],
            ];
            $allMeta = easyPluginsSeoMeta();
            foreach ($homeCards as $cardSlug => [$cardIcon, $cardColor]):
                $card = $allMeta[$cardSlug];
                $cardDesc = easyPluginsIsNl() ? ($card['blurb_nl'] ?? $card['tagline']) : ($card['blurb'] ?? $card['tagline']);
            ?>
            <div class="col-lg-6 col-md-6">
                <div class="plugin-card card h-100 shadow-sm">
                    <div class="card-body">
                        <div class="plugin-header text-center mb-3">
                            <a href="<?= $toolHref($cardSlug) ?>" class="text-decoration-none">
                                <img src="/brand/tools/<?= $cardSlug ?>.svg" alt="" width="46" height="46" class="plugin-icon mb-2">
                            </a>
                            <h3 class="plugin-title h4 mb-0">
                                <a href="<?= $toolHref($cardSlug) ?>" class="text-decoration-none"><?= htmlspecialchars($card['name'], ENT_QUOTES, 'UTF-8') ?></a>
                            </h3>
                        </div>
                        <p class="plugin-description text-muted mb-3 text-center">
                            <?= htmlspecialchars($cardDesc, ENT_QUOTES, 'UTF-8') ?>
                        </p>
                        <div class="plugin-actions d-flex gap-2 justify-content-center">
                            <a href="<?= $toolHref($cardSlug) ?>" class="btn btn-primary btn-sm">
                                Open <?= htmlspecialchars($card['name'], ENT_QUOTES, 'UTF-8') ?> <i class="fas fa-arrow-right ms-1"></i>
                            </a>
                            <a href="plugins/<?= $cardSlug ?>" class="btn btn-outline-secondary btn-sm">
                                <?= $L('More information', 'Meer informatie') ?>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- FAQ -->
        <?php
        $homeFaq = easyPluginsIsNl()
            ? [
                ['Zijn deze tools echt gratis?', 'Ja. Elke tool is volledig gratis, zonder accounts, proefperiodes of verborgen limieten. Easy Plugins is gemaakt door webmaster Joris Stolker voor zijn klanten, en is gratis voor iedereen die het wil gebruiken. Zolang de server de drukte aankan, blijft dat zo. Misschien komen er ooit betaalde pro-functies bij, maar daar zijn op dit moment geen plannen voor.'],
                ['Zijn mijn gegevens privé?', 'De meeste tools draaien volledig in je browser, dus je bestanden en tekst verlaten je apparaat niet. Easy Image verwerkt afbeeldingen op onze server voor de beste kwaliteit, en die uploads worden binnen enkele minuten automatisch verwijderd.'],
                ['Moet ik iets installeren?', 'Nee. Alles werkt direct in je browser op desktop, tablet en telefoon.'],
                ['Kan ik meerdere afbeeldingen tegelijk verwerken?', 'Ja. Easy Image verwerkt tot 100 afbeeldingen in één batch en Easy Watermark kan hele series van een watermerk voorzien en als ZIP downloaden.'],
            ]
            : [
                ['Are these tools really free?', 'Yes. Every tool is completely free, without accounts, trials or hidden limits. Easy Plugins is built by webmaster Joris Stolker for his clients, and it is free for anyone who wants to use it. As long as the server can handle the traffic, it stays that way. Paid pro features may be added some day, but there are no plans for that right now.'],
                ['Is my data private?', 'Most tools run entirely in your browser, so your files and text never leave your device. Easy Image processes images on our server for the best quality, and those uploads are deleted automatically within minutes.'],
                ['Do I need to install anything?', 'No. Everything works directly in your browser on desktop, tablet and phone.'],
                ['Can I process multiple images at once?', 'Yes. Easy Image handles up to 100 images in one batch and Easy Watermark can watermark whole sets and download them as a ZIP.'],
            ];
        ?>
        <div class="row mb-5">
            <div class="col-lg-8 mx-auto">
                <h2 class="h3 mb-4 text-center"><?= $L('Frequently asked questions', 'Veelgestelde vragen') ?></h2>
<?php foreach ($homeFaq as $qa): ?>
                <div class="mb-4">
                    <h3 class="h5"><?= htmlspecialchars($qa[0], ENT_QUOTES, 'UTF-8') ?></h3>
                    <p class="mb-0"><?= htmlspecialchars($qa[1], ENT_QUOTES, 'UTF-8') ?></p>
                </div>
<?php endforeach; ?>
            </div>
        </div>

    </div>

    <script type="application/ld+json">
    <?= json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'FAQPage',
        'mainEntity' => array_map(function ($qa) {
            return [
                '@type' => 'Question',
                'name' => $qa[0],
                'acceptedAnswer' => ['@type' => 'Answer', 'text' => $qa[1]],
            ];
        }, $homeFaq),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?>

    </script>

    <?php include 'shared/footer.php'; ?>