<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Easy Image - Image Processing Made Simple</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <!-- Bootstrap for modal -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container">
        <header class="main-header">
            <h1><i class="fas fa-image"></i> Easy Image</h1>
            <p>Image Processing Made Simple</p>
        </header>

        <div class="plans-container">
            <div class="plan-card free">
                <div class="plan-header">
                    <h2>Easy Image</h2>
                    <p class="price">Free</p>
                </div>
                <div class="plan-features">
                    <ul>
                        <li><i class="fas fa-check"></i> Image resizing</li>
                        <li><i class="fas fa-check"></i> Automatic cropping</li>
                        <li><i class="fas fa-check"></i> Quality adjustment</li>
                        <li><i class="fas fa-check"></i> Multiple image upload</li>
                        <li><i class="fas fa-check"></i> Instant download</li>
                        <li><i class="fas fa-check"></i> Batch processing</li>
                        <li><i class="fas fa-check"></i> Advanced cropping tools</li>
                        <li><i class="fas fa-check"></i> Image effects</li>
                    </ul>
                </div>
                <a href="index.html" class="btn">Get Started</a>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="text-center py-4 mt-5" style="background-color: #f8f9fa; border-top: 1px solid #dee2e6;">
        <div class="container">
            <p class="mb-2">&copy; 2024 Easy Plugins. All rights reserved.</p>
            <p class="mb-0">
                <a href="#" onclick="showPrivacyModal()" class="text-decoration-none">
                    <i class="fas fa-shield-alt me-1"></i>Privacy & Data Storage Policy
                </a>
            </p>
        </div>
    </footer>

    <!-- Privacy Modal -->
    <?php include '../shared/privacy-modal.php'; ?>

    <!-- Bootstrap JS for modal -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html> 