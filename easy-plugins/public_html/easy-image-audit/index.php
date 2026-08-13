<?php
$pageTitle = 'Easy Image Audit - Check Images for Size, Format & Alt Text';
$metaDescription = 'Free image audit: every image on a page graded on format, file size, lazy loading and alt text, with the KB you can save per image. Like Lighthouse, but readable.';
$canonicalPath = '/easy-image-audit/';
$faviconPath = '../favicon.ico';
$cssPath = '../shared/master.css';
$themePath = '../shared/theme.js';
include '../shared/header.php';
?>

    <link rel="stylesheet" href="/libraries/audit/audit-ui.css?v=1.4">

    <div class="container-fluid">
        <div class="container tool-page-inner">
            <?php $toolInfoSlug = 'easy-image-audit'; include __DIR__ . '/../shared/tool-info-bar.php'; ?>

            <div class="card shadow-sm audit-form-card">
                <div class="card-body">
                    <form id="auditForm" data-audit-tool="images" data-audit-api="api.php">
                        <label for="auditUrl" class="form-label fw-semibold">
                            <?= easyPluginsText('Which page\'s images do you want to check?', 'Van welke pagina wil je de afbeeldingen controleren?') ?>
                        </label>
                        <div class="audit-form-row">
                            <input type="text" id="auditUrl" class="form-control" inputmode="url"
                                   placeholder="example.com" autocomplete="url" maxlength="2000">
                            <button type="submit" id="auditRunBtn" class="btn audit-run-btn">
                                <i class="fas fa-images me-1"></i> <?= easyPluginsText('Audit images', 'Controleer afbeeldingen') ?>
                            </button>
                        </div>
                        <p class="audit-free-note">
                            <i class="fas fa-info-circle me-1"></i>
                            <?= easyPluginsText(
                                'Free: one page, up to 30 images per audit, 5 audits per 10 minutes.',
                                'Gratis: één pagina, tot 30 afbeeldingen per audit, 5 audits per 10 minuten.'
                            ) ?>
                        </p>
                    </form>
                </div>
            </div>

            <div id="auditStatus" class="audit-status" style="display: none;"></div>
            <div id="auditError" class="audit-error" style="display: none;"></div>
            <div id="auditResults" class="audit-results" style="display: none;"></div>

            <?php $auditUpsellCampaign = 'image-audit'; include __DIR__ . '/../shared/audit-upsell.php'; ?>
        </div>

        <?php include '../shared/footer.php'; ?>
    </div>

    <script src="/libraries/audit/audit-ui.js?v=1.4"></script>
