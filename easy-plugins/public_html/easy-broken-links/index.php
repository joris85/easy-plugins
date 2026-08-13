<?php
$pageTitle = 'Easy Broken Links - Find Broken Links on Any Page';
$metaDescription = 'Free broken link checker: every link on the page is verified with a real HTTP request. Internal and external links, with status codes and where each link lives.';
$canonicalPath = '/easy-broken-links/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="/libraries/audit/audit-ui.css?v=1.2">

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-broken-links'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="card shadow-sm audit-form-card">
                <div class="card-body">
                    <form id="auditForm" data-audit-tool="links" data-audit-api="api.php">
                        <label for="auditUrl" class="form-label fw-semibold">
                            <?= easyPluginsText('Which page do you want to check for broken links?', 'Welke pagina wil je controleren op kapotte links?') ?>
                        </label>
                        <div class="audit-form-row">
                            <input type="text" id="auditUrl" class="form-control" inputmode="url"
                                   placeholder="example.com" autocomplete="url" maxlength="2000">
                            <button type="submit" id="auditRunBtn" class="btn audit-run-btn">
                                <i class="fas fa-link-slash me-1"></i> <?= easyPluginsText('Check links', 'Controleer links') ?>
                            </button>
                        </div>
                        <p class="audit-free-note">
                            <i class="fas fa-info-circle me-1"></i>
                            <?= easyPluginsText(
                                'Free: the page plus two linked pages, up to 40 links per run, 5 runs per 10 minutes.',
                                'Gratis: de pagina plus twee gelinkte pagina\'s, tot 40 links per run, 5 runs per 10 minuten.'
                            ) ?>
                        </p>
                    </form>
                </div>
            </div>

            <div id="auditStatus" class="audit-status" style="display: none;"></div>
            <div id="auditError" class="audit-error" style="display: none;"></div>
            <div id="auditResults" class="audit-results" style="display: none;"></div>

            <?php $auditUpsellCampaign = 'broken-links'; include __DIR__ . '/../shared/audit-upsell.php'; ?>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="/libraries/audit/audit-ui.js?v=1.2"></script>
