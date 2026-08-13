<?php
$pageTitle = 'Easy Domain Check - Is Your Domain Name Available?';
$metaDescription = 'Free domain name checker: see instantly whether a name is available across .com, .nl, .net, .org, .io, .dev, .app and more. Live registry data, no account.';
$canonicalPath = '/easy-domain-check/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="/libraries/audit/audit-ui.css?v=1.1">
    <style>
        .domain-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }
        .domain-card {
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 10px;
            padding: 0.8rem 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.5rem;
        }
        .domain-card__name {
            font-weight: 600;
            overflow-wrap: anywhere;
        }
        .domain-card__sub {
            display: block;
            font-size: 0.75rem;
            color: #6c757d;
            font-weight: 400;
        }
        .domain-card--available { border-color: rgba(76, 175, 80, 0.5); background: rgba(76, 175, 80, 0.07); }
        .domain-card--taken { opacity: 0.75; }
        .domain-card--maybe { border-color: rgba(240, 173, 78, 0.5); background: rgba(240, 173, 78, 0.06); }
        body.dark .domain-card { border-color: #2a2a2a; }
        body.dark .domain-card--available { border-color: rgba(76, 175, 80, 0.45); background: rgba(76, 175, 80, 0.1); }
        body.dark .domain-card--maybe { border-color: rgba(240, 173, 78, 0.4); background: rgba(240, 173, 78, 0.07); }
    </style>

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-domain-check'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="card shadow-sm audit-form-card">
                <div class="card-body">
                    <form id="auditForm" data-audit-tool="domain" data-audit-api="api.php">
                        <label for="auditUrl" class="form-label fw-semibold">
                            <?= easyPluginsText('Which name do you want to check?', 'Welke naam wil je checken?') ?>
                        </label>
                        <div class="audit-form-row">
                            <input type="text" id="auditUrl" class="form-control"
                                   placeholder="<?= easyPluginsText('myproject or myproject.com', 'mijnproject of mijnproject.nl') ?>"
                                   autocomplete="off" maxlength="253">
                            <button type="submit" id="auditRunBtn" class="btn audit-run-btn">
                                <i class="fas fa-globe me-1"></i> <?= easyPluginsText('Check availability', 'Check beschikbaarheid') ?>
                            </button>
                        </div>
                        <p class="audit-free-note">
                            <i class="fas fa-info-circle me-1"></i>
                            <?= easyPluginsText(
                                'Checks 12 popular extensions with live registry data (RDAP and DNS). Free, 5 checks per 10 minutes.',
                                'Checkt 12 populaire extensies met live registerdata (RDAP en DNS). Gratis, 5 checks per 10 minuten.'
                            ) ?>
                        </p>
                    </form>
                </div>
            </div>

            <div id="auditStatus" class="audit-status" style="display: none;"></div>
            <div id="auditError" class="audit-error" style="display: none;"></div>
            <div id="auditResults" class="audit-results" style="display: none;"></div>

            <!-- Webmaster promo -->
            <section class="audit-upsell">
                <div class="audit-upsell__inner">
                    <div class="audit-upsell__icon" aria-hidden="true">
                        <i class="fas fa-hammer fa-lg"></i>
                    </div>
                    <div class="audit-upsell__content">
                        <p class="audit-upsell__title"><?= easyPluginsText('Found your domain, need a website?', 'Domein gevonden, website nodig?') ?></p>
                        <p class="audit-upsell__text"><?= easyPluginsText(
                            'If you need a webmaster to register it and build the site, Jorsites — the webmaster behind Easy Plugins — is happy to help.',
                            'Zoek je een webmaster om het domein te registreren en de site te bouwen? Jorsites, de webmaster achter Easy Plugins, helpt je graag.'
                        ) ?></p>
                    </div>
                    <a href="https://jorsites.com/?utm_source=easy-plugins&utm_medium=tool&utm_campaign=domain-check" target="_blank" rel="noopener" class="btn audit-upsell__btn">
                        jorsites.com <i class="fas fa-arrow-right ms-1"></i>
                    </a>
                </div>
            </section>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="/libraries/audit/audit-ui.js?v=1.1"></script>
