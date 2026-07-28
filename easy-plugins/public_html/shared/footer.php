<!-- Footer styles now in master.css -->
<!-- Shared Footer Component -->
<?php require_once __DIR__ . '/site-config.php'; ?>
<footer class="footer mt-5 py-4 bg-light">
    <div class="container">
        <div class="row">
            <div class="col-12 text-center">
                <div class="version">
                    <p><strong>Easy Plugins</strong> - <a href="https://jorsites.com">jorsites.com</a></p>
                    <p>Bug reports to <a href="mailto:web@easy-plugins.com">web@easy-plugins.com</a></p>
                    <p>Saved you time? <a target="_blank" href="https://bunq.me/jornature">Buy Joris a coffee ></a></p>
                    <p><span data-translate="FOOTER_LATEST_UPDATE">Latest update</span> <?= SITE_LATEST_UPDATE ?></p>
                    <p><a href="#" class="privacy-link" onclick="showPrivacyModal(); return false;">Privacy and data storage Policy</a></p>
                </div>
            </div>
        </div>
    </div>
</footer>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<!-- Privacy Modal -->
<?php include 'privacy-modal.php'; ?>
</body>
</html>
