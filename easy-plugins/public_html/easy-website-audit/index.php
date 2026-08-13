<?php
$pageTitle = 'Easy Website Audit - Free SEO & Speed Check';
$metaDescription = 'Free website audit: check any page for speed, SEO, technical setup and structured data. Get a 0-100 score and a prioritized list of what to fix. No account.';
$canonicalPath = '/easy-website-audit/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="/libraries/audit/audit-ui.css?v=1.1">

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-website-audit'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="card shadow-sm audit-form-card">
                <div class="card-body">
                    <form id="auditForm" data-audit-tool="seo" data-audit-api="api.php">
                        <label for="auditUrl" class="form-label fw-semibold">
                            <?= easyPluginsText('Which page do you want to audit?', 'Welke pagina wil je controleren?') ?>
                        </label>
                        <div class="audit-form-row">
                            <input type="text" id="auditUrl" class="form-control" inputmode="url"
                                   placeholder="example.com" autocomplete="url" maxlength="2000">
                            <button type="submit" id="auditRunBtn" class="btn audit-run-btn">
                                <i class="fas fa-gauge-high me-1"></i> <?= easyPluginsText('Run audit', 'Start audit') ?>
                            </button>
                        </div>
                        <p class="audit-free-note">
                            <i class="fas fa-info-circle me-1"></i>
                            <?= easyPluginsText(
                                'Free: one page per audit, 5 audits per 10 minutes. The audit takes up to a minute.',
                                'Gratis: één pagina per audit, 5 audits per 10 minuten. De audit duurt maximaal een minuut.'
                            ) ?>
                        </p>
                    </form>
                </div>
            </div>

            <div id="auditStatus" class="audit-status" style="display: none;"></div>
            <div id="auditError" class="audit-error" style="display: none;"></div>
            <div id="auditResults" class="audit-results" style="display: none;"></div>

            <?php $auditUpsellCampaign = 'website-audit'; include __DIR__ . '/../shared/audit-upsell.php'; ?>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="/libraries/audit/audit-ui.js?v=1.1"></script>
