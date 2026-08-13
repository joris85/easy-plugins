<?php
// Privacy Modal Component
?>
<!-- Privacy Modal -->
<div class="modal fade" id="privacyModal" tabindex="-1" aria-labelledby="privacyModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="privacyModalLabel" data-translate="PRIVACY_TITLE">Privacy and Data Storage Policy</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fas fa-shield-alt text-success me-2"></i><span data-translate="PRIVACY_DATA_COLLECTION_TITLE">Data Collection & Privacy</span></h6>
                        <p data-translate="PRIVACY_DATA_COLLECTION_DESC">Easy Plugins tools are designed with privacy-first principles. Most tools process data entirely in your browser without sending anything to our servers.</p>
                        
                        <h6><i class="fas fa-lock text-success me-2"></i><span data-translate="PRIVACY_LOCAL_TOOLS_TITLE">Local Processing Tools</span></h6>
                        <p data-translate="PRIVACY_LOCAL_TOOLS_DESC">These tools process data entirely in your browser:</p>
                        <ul class="list-unstyled">
                            <li><strong>Easy HTML:</strong> <span data-translate="PRIVACY_EASY_HTML_DESC">Text cleaning and formatting happens in your browser</span></li>
                            <li><strong>Easy Pricing:</strong> <span data-translate="PRIVACY_EASY_PRICING_DESC">All calculations are performed locally</span></li>
                            <li><strong>Easy Text:</strong> <span data-translate="PRIVACY_EASY_TEXT_DESC">Text conversion happens in your browser</span></li>
                            <li><strong>Easy CSV:</strong> <span data-translate="PRIVACY_EASY_CSV_DESC">CSV conversion, search & replace, and date transformation happen in your browser</span></li>
                            <li><strong>Easy Search & Replace:</strong> <span data-translate="PRIVACY_EASY_SEARCH_DESC">Text search, replace, truncate, and line numbering happen in your browser</span></li>
                            <li><strong>Easy PNG:</strong> <span data-translate="PRIVACY_EASY_PNG_DESC">Background addition to images happens in your browser</span></li>
                            <li><strong>Easy Watermark:</strong> <span data-translate="PRIVACY_EASY_WATERMARK_DESC">Watermark addition to images happens in your browser</span></li>
                            <li><strong>Easy Image Rotate:</strong> <span data-translate="PRIVACY_EASY_IMAGE_ROTATE_DESC">Image rotation happens entirely in your browser</span></li>
                            <li><strong>Easy Less:</strong> <span data-translate="PRIVACY_EASY_LESS_DESC">LESS compilation happens entirely in your browser</span></li>
                            <li><strong>Easy SASS:</strong> <span data-translate="PRIVACY_EASY_SASS_DESC">SASS/SCSS compilation happens entirely in your browser</span></li>
                        </ul>

                        <h6><i class="fas fa-globe text-info me-2"></i><span data-translate="PRIVACY_EXTERNAL_TOOLS_TITLE">Tools Using External Services</span></h6>
                        <p><strong>Easy Identify Me:</strong> <span data-translate="PRIVACY_EASY_IDENTIFY_DESC">Looks up your public IP address via a third-party service (ipwho.is) to show location and ISP information. Your IP is sent to those services only when you use this tool.</span></p>
                        
                        <h6><i class="fas fa-image text-warning me-2"></i><span data-translate="PRIVACY_EASY_IMAGE_TITLE">Easy Image Tool</span></h6>
                        <p data-translate="PRIVACY_EASY_IMAGE_DESC">This tool requires server processing for image manipulation. Here's how we handle your images:</p>
                        <ul>
                            <li data-translate="PRIVACY_EASY_IMAGE_1">Images are temporarily stored on our server for processing</li>
                            <li data-translate="PRIVACY_EASY_IMAGE_2">Automatic deletion within about 40 minutes — no action needed</li>
                            <li data-translate="PRIVACY_EASY_IMAGE_4">No sharing or commercial use of your images</li>
                        </ul>
                    </div>
                    
                    <div class="col-md-6">
                        <h6><i class="fas fa-trash-alt text-info me-2"></i><span data-translate="PRIVACY_DATA_RETENTION_TITLE">Data Retention</span></h6>
                        <p><strong data-translate="PRIVACY_DATA_RETENTION_IMAGES">Images:</strong> Automatically deleted within about 40 minutes<br>
                        <strong data-translate="PRIVACY_DATA_RETENTION_TEXT">Text/HTML:</strong> Never stored on our servers<br>
                        <strong data-translate="PRIVACY_DATA_RETENTION_CSV">CSV Data:</strong> <span data-translate="PRIVACY_DATA_RETENTION_CSV_DESC">Never stored on our servers, processed entirely in your browser</span><br>
                        <strong data-translate="PRIVACY_DATA_RETENTION_CALC">Calculations:</strong> Performed locally, not stored</p>
                        
                        <h6><i class="fas fa-cookie-bite text-secondary me-2"></i><span data-translate="PRIVACY_COOKIES_TITLE">Cookies & Tracking</span></h6>
                        <p data-translate="PRIVACY_COOKIES_DESC">We use minimal cookies only for:</p>
                        <ul>
                            <li data-translate="PRIVACY_COOKIES_THEME">Theme preferences (dark/light mode)</li>
                            <li data-translate="PRIVACY_COOKIES_LANG">Language settings</li>
                            <li data-translate="PRIVACY_COOKIES_NO_TRACK">No tracking or analytics cookies</li>
                        </ul>
                        
                        <h6><i class="fas fa-external-link-alt text-primary me-2"></i><span data-translate="PRIVACY_THIRD_PARTY_TITLE">Third-Party Services</span></h6>
                        <p data-translate="PRIVACY_THIRD_PARTY_DESC">We use these external services:</p>
                        <ul>
                            <li data-translate="PRIVACY_BOOTSTRAP"><strong>Bootstrap CDN:</strong> For styling (may collect anonymous stats)</li>
                            <li data-translate="PRIVACY_FONT_AWESOME"><strong>Font Awesome:</strong> For icons (may collect anonymous stats)</li>
                            <li data-translate="PRIVACY_GOOGLE_FONTS"><strong>Google Fonts:</strong> For typography (may collect anonymous stats)</li>
                            <li data-translate="PRIVACY_CODEMIRROR"><strong>CodeMirror CDN:</strong> Code editor in Easy HTML, Less, and SASS tools</li>
                            <li data-translate="PRIVACY_TINYMCE"><strong>TinyMCE CDN:</strong> Rich text editor in Easy HTML</li>
                            <li data-translate="PRIVACY_IP_API"><strong>ipwho.is:</strong> Public IP lookup in Easy Identify Me only</li>
                        </ul>
                    </div>
                </div>
                
                <hr>
                
                <div class="row">
                    <div class="col-12">
                        <h6><i class="fas fa-tools text-success me-2"></i><span data-translate="PRIVACY_AVAILABLE_TOOLS">Available Tools</span></h6>
                        <div class="row">
                            <div class="col-md-3 mb-3">
                                <div class="card border-warning">
                                    <div class="card-body text-center">
                                        <i class="fas fa-image text-warning mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy Image</h6>
                                        <p class="card-text small">Resize, crop, and optimize images</p>
                                        <span class="badge bg-warning">Server Processing</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-success">
                                    <div class="card-body text-center">
                                        <i class="fas fa-file-image text-success mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy PNG</h6>
                                        <p class="card-text small">Add backgrounds to PNG and WebP</p>
                                        <span class="badge bg-success">100% Local</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-success">
                                    <div class="card-body text-center">
                                        <i class="fas fa-tint text-success mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy Watermark</h6>
                                        <p class="card-text small">Add watermarks with positioning control</p>
                                        <span class="badge bg-success">100% Local</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-success">
                                    <div class="card-body text-center">
                                        <i class="fas fa-redo text-success mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy Image Rotate</h6>
                                        <p class="card-text small">Rotate images with live preview</p>
                                        <span class="badge bg-success">100% Local</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-success">
                                    <div class="card-body text-center">
                                        <i class="fas fa-code text-success mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy HTML</h6>
                                        <p class="card-text small">Clean and format HTML content</p>
                                        <span class="badge bg-success">100% Local</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-success">
                                    <div class="card-body text-center">
                                        <i class="fas fa-calculator text-success mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy Pricing</h6>
                                        <p class="card-text small">Calculate percentages and VAT</p>
                                        <span class="badge bg-success">100% Local</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-success">
                                    <div class="card-body text-center">
                                        <i class="fas fa-file-alt text-success mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy Text</h6>
                                        <p class="card-text small">Convert and format text</p>
                                        <span class="badge bg-success">100% Local</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-success">
                                    <div class="card-body text-center">
                                        <i class="fas fa-file-csv text-success mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy CSV</h6>
                                        <p class="card-text small" data-translate="PRIVACY_EASY_CSV_CARD_TEXT">Convert CSV delimiters and transform data</p>
                                        <span class="badge bg-success">100% Local</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-success">
                                    <div class="card-body text-center">
                                        <i class="fas fa-search text-success mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy Search & Replace</h6>
                                        <p class="card-text small">Search, replace, truncate, line numbers</p>
                                        <span class="badge bg-success">100% Local</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-info">
                                    <div class="card-body text-center">
                                        <i class="fas fa-id-card text-info mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy Identify Me</h6>
                                        <p class="card-text small">System and IP information</p>
                                        <span class="badge bg-info">External IP lookup</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-success">
                                    <div class="card-body text-center">
                                        <i class="fas fa-file-code text-success mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy Less</h6>
                                        <p class="card-text small">Compile LESS to CSS in browser</p>
                                        <span class="badge bg-success">100% Local</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3 mb-3">
                                <div class="card border-success">
                                    <div class="card-body text-center">
                                        <i class="fas fa-code text-success mb-2" style="font-size: 2rem;"></i>
                                        <h6 class="card-title">Easy SASS</h6>
                                        <p class="card-text small">Compile SASS/SCSS to CSS in browser</p>
                                        <span class="badge bg-success">100% Local</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <hr>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fas fa-user text-primary me-2"></i><span data-translate="PRIVACY_PROJECT_TITLE">About This Project</span></h6>
                        <p data-translate="PRIVACY_PROJECT_DESC">This is a personal project created with AI assistance to help people save time with common web development tasks. No financial gain, just a fun project to help others.</p>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="fas fa-envelope text-primary me-2"></i><span data-translate="PRIVACY_CONTACT_TITLE">Contact</span></h6>
                        <p data-translate="PRIVACY_CONTACT_DESC">For privacy questions or concerns:</p>
                        <a href="mailto:web@easy-plugins.com" id="privacyEmailLink" class="btn btn-outline-primary btn-sm mt-2">
                            <i class="fas fa-envelope me-1"></i>web@easy-plugins.com
                        </a>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-translate="PRIVACY_CLOSE">Close</button>
            </div>
        </div>
    </div>
</div>

<script>
(function() {
    const part1 = 'web';
    const part2 = '@';
    const part3 = 'easy-plugins';
    const part4 = '.com';
    const email = part1 + part2 + part3 + part4;
    
    function setupEmail() {
        const emailLink = document.getElementById('privacyEmailLink');
        if (emailLink) {
            emailLink.href = 'mailto:' + email;
            emailLink.innerHTML = '<i class="fas fa-envelope me-1"></i>' + email;
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupEmail);
    } else {
        setupEmail();
    }
    
    document.addEventListener('DOMContentLoaded', function() {
        const modalElement = document.getElementById('privacyModal');
        if (modalElement) {
            modalElement.addEventListener('shown.bs.modal', setupEmail);
        }
    });
})();

function showPrivacyModal() {
    const modalElement = document.getElementById('privacyModal');
    const modal = new bootstrap.Modal(modalElement);
    
    modalElement.addEventListener('shown.bs.modal', function() {
        modalElement.setAttribute('aria-hidden', 'false');
        modalElement.removeAttribute('inert');
    }, { once: true });
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.setAttribute('inert', '');
    }, { once: true });
    
    modal.show();
}
</script>
