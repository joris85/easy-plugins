// Make functions available globally
window.toggleAdvanced = function() {
    const header = document.querySelector('.advanced-header');
    const content = document.querySelector('.advanced-content');
    const icon = header.querySelector('i');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        header.classList.add('active');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        content.style.display = 'none';
        header.classList.remove('active');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
};

window.showQualityInfo = function() {
    document.getElementById('qualityInfoModal').style.display = 'block';
};

window.showFormatInfo = function() {
    document.getElementById('formatInfoModal').style.display = 'block';
};

// Global variables
let uploadedFiles = [];
let processedImages = [];
let currentMode = 'resize';
let currentQuality = 70; // Default to medium (70%)
let selectedDimension = 'width';
let selectedAlignment = 'center-middle'; // Default to center-middle
let selectedFormat = 'webp'; // Default to WebP
let currentImageIndex = 0;
let cropper = null;
let effectSettings = {
    blur: 0,
    sharpen: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    normalize: false,
    equalize: false,
    enhance: false,
    emboss: false,
    edge: false,
    charcoal: false
};

document.addEventListener('DOMContentLoaded', function() {
    // Check if Imagick is available
    fetch('check_imagick.php')
        .then(response => response.json())
        .then(data => {
            if (!data.available) {
                alert('Please enable Imagick on your server.');
                // Disable all interactive elements
                document.querySelectorAll('button, input').forEach(element => {
                    element.disabled = true;
                });
                // Show error message in the container
                const container = document.querySelector('.container');
                container.innerHTML = `
                    <div class="error-message">
                        <h1>Imagick Not Available</h1>
                        <p>Please enable Imagick on your server to use this application.</p>
                        <p>Contact your server administrator for assistance.</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error checking Imagick:', error);
        });

    // DOM elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const processBtn = document.querySelector('.settings-controls .process-btn');

    // Initialize dropzone
    initializeDropzone();

    // Initialize all event listeners
    initializeEventListeners();

    // Functions
    function initializeDropzone() {
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', handleDragOver);
        dropzone.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);
        
        // Add drag and drop to the entire page
        document.addEventListener('dragover', handlePageDragOver);
        document.addEventListener('drop', handlePageDrop);
        document.addEventListener('dragleave', handlePageDragLeave);
    }

    function initializeEventListeners() {
        // Mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentMode = btn.dataset.mode;
                updateModeOptions();
            });
        });

        // Dimension selection
        document.querySelectorAll('.dimension-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.dimension-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedDimension = btn.dataset.dimension;
                updateDimensionInputs();
            });
        });

        // Quality selection
        document.querySelectorAll('.quality-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.quality) {
                    // Quality buttons - only affect other quality buttons
                    document.querySelectorAll('.quality-btn[data-quality]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentQuality = btn.dataset.quality;
                    updateQualitySlider();
                } else if (btn.dataset.width && btn.dataset.height) {
                    // Preset size buttons - only affect other preset buttons
                    document.querySelectorAll('.quality-btn[data-width][data-height]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById('width').value = btn.dataset.width;
                    document.getElementById('height').value = btn.dataset.height;
                } else if (btn.dataset.cropMode) {
                    // Crop mode buttons
                    document.querySelectorAll('.quality-btn[data-crop-mode]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    updateCropModeOptions();
                } else if (btn.dataset.effect) {
                    // Effect buttons
                    btn.classList.toggle('active');
                    effectSettings[btn.dataset.effect] = btn.classList.contains('active');
                }
            });
        });

        // Alignment selection - separate event listener for alignment buttons
        document.querySelectorAll('.alignment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.alignment-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedAlignment = btn.dataset.align;
                console.log('Alignment button clicked:', btn.dataset.align, 'Selected alignment:', selectedAlignment);
            });
        });

        // Quality slider
        const qualitySlider = document.getElementById('qualitySlider');
        if (qualitySlider) {
            qualitySlider.addEventListener('input', (e) => {
                currentQuality = e.target.value;
                document.getElementById('qualityValue').textContent = currentQuality + '%';
            });
        }

        // Effect sliders
        const effectSliders = ['blurSlider', 'sharpenSlider', 'brightnessSlider', 'contrastSlider', 'saturationSlider'];
        effectSliders.forEach(sliderId => {
            const slider = document.getElementById(sliderId);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const effectName = sliderId.replace('Slider', '');
                    effectSettings[effectName] = e.target.value;
                    e.target.nextElementSibling.textContent = e.target.value + '%';
                });
            }
        });

        // Effect info icons
        document.querySelectorAll('.effect-info').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('effectsInfoModal').style.display = 'block';
            });
        });

        // Quality and Format info icons
        document.querySelectorAll('.quality-info, .format-info').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modals when clicking X button
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Effects buttons
        document.querySelectorAll('.effect-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                effectSettings[btn.dataset.effect] = btn.classList.contains('active');
                console.log('Effect button clicked:', btn.dataset.effect, 'Active:', btn.classList.contains('active'));
                console.log('Current effectSettings:', effectSettings);
            });
        });

        // Format buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedFormat = btn.dataset.format;
                console.log('Format button clicked:', btn.dataset.format, 'Selected format:', selectedFormat);
            });
        });

        // Log initialization
        const effectButtons = document.querySelectorAll('.effect-btn');
        console.log('Found', effectButtons.length, 'effect buttons on page load');
        effectButtons.forEach((btn, index) => {
            console.log(`Effect button ${index + 1}:`, btn.dataset.effect, 'Element:', btn);
        });

        const formatButtons = document.querySelectorAll('.format-btn');
        console.log('Found', formatButtons.length, 'format buttons on page load');
        formatButtons.forEach((btn, index) => {
            console.log(`Format button ${index + 1}:`, btn.dataset.format, 'Element:', btn);
        });

        // Initialize process button as disabled
        if (processBtn) {
            processBtn.style.display = 'flex';
            processBtn.disabled = true;
            processBtn.innerHTML = '<i class="fas fa-cog"></i> Process Images';
        }
    }

    function updateModeOptions() {
        const cropOptions = document.getElementById('cropOptions');
        const resizeOptions = document.getElementById('resizeOptions');
        const cropModeOptions = document.getElementById('cropModeOptions');
        const alignmentOptions = document.getElementById('alignmentOptions');
        const widthInput = document.getElementById('widthInput');
        const heightInput = document.getElementById('heightInput');

        if (currentMode === 'crop') {
            cropOptions.style.display = 'block';
            resizeOptions.style.display = 'none';
            cropModeOptions.style.display = 'block';
            // Hide alignment options by default - they will show only when Automatic is selected
            alignmentOptions.style.display = 'none';
            // Show both inputs in crop mode
            widthInput.style.display = 'block';
            heightInput.style.display = 'block';
        } else {
            cropOptions.style.display = 'none';
            resizeOptions.style.display = 'block';
            cropModeOptions.style.display = 'none';
            alignmentOptions.style.display = 'none';
            // Show only selected dimension in resize mode
            updateDimensionInputs();
        }
    }

    function updateDimensionInputs() {
        const widthInput = document.getElementById('widthInput');
        const heightInput = document.getElementById('heightInput');

        if (selectedDimension === 'width') {
            widthInput.style.display = 'block';
            heightInput.style.display = 'none';
        } else {
            widthInput.style.display = 'none';
            heightInput.style.display = 'block';
        }
    }

    function updateQualitySlider() {
        const customQualitySlider = document.getElementById('customQualitySlider');
        const qualitySlider = document.getElementById('qualitySlider');
        const qualityValue = document.getElementById('qualityValue');

        if (currentQuality === 'custom') {
            customQualitySlider.style.display = 'block';
        } else {
            customQualitySlider.style.display = 'none';
            if (qualitySlider && qualityValue) {
                qualitySlider.value = currentQuality;
                qualityValue.textContent = currentQuality + '%';
            }
        }
    }

    function updateCropModeOptions() {
        const alignmentOptions = document.getElementById('alignmentOptions');
        const activeCropMode = document.querySelector('.quality-btn[data-crop-mode].active');
        
        if (activeCropMode && activeCropMode.dataset.cropMode === 'auto') {
            alignmentOptions.style.display = 'block';
        } else {
            alignmentOptions.style.display = 'none';
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent page drag from interfering
        dropzone.classList.add('dragover');
        // Remove page drag class when over dropzone
        document.body.classList.remove('page-dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent page drop from interfering
        dropzone.classList.remove('dragover');
        document.body.classList.remove('page-dragover');
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = Array.from(e.target.files);
        handleFiles(files);
    }

    function handleFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            const isValid = Config.validateFile(file);
            if (!isValid) {
                alert(`Invalid file: ${file.name}. Please select a valid image file.`);
            }
            return isValid;
        });

        if (validFiles.length === 0) return;

        // Check individual file sizes (MAMP FIX: Stricter limits for large images)
        const maxFileSize = 50 * 1024 * 1024; // 50MB per file
        const oversizedFiles = validFiles.filter(file => file.size > maxFileSize);
        
        if (oversizedFiles.length > 0) {
            const fileNames = oversizedFiles.map(f => f.name).join(', ');
            alert(`The following files are too large (max 50MB each): ${fileNames}\n\nFor large images, try:\n1. Resizing them first\n2. Converting to WebP format\n3. Processing fewer images at once`);
            return;
        }

        // Check total size of all files
        const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
        const maxTotalSize = 100 * 1024 * 1024; // 100MB limit (reduced for MAMP)
        const maxFiles = 20; // Maximum number of files (reduced for MAMP)

        if (totalSize > maxTotalSize) {
            alert(`Total file size (${(totalSize / 1024 / 1024).toFixed(1)}MB) exceeds the maximum limit of 100MB. Please select fewer images or smaller images.`);
            return;
        }

        if (validFiles.length > maxFiles) {
            alert(`Maximum ${maxFiles} images allowed. Please select fewer images.`);
            return;
        }

        // Append new files to existing ones
        uploadedFiles = [...uploadedFiles, ...validFiles];
        
        // Show previews
        showPreviews();

        // Show process button
        if (processBtn) {
            processBtn.style.display = 'flex';
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="fas fa-cog"></i> Process Images';
        }

        // Reset the file input
        fileInput.value = '';
    }

    function showPreviews() {
        previewContainer.innerHTML = '';
        
        if (uploadedFiles.length === 0) {
            previewContainer.classList.remove('has-images');
            return;
        }
        
        previewContainer.classList.add('has-images');
        
        uploadedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <div class="preview-info">
                        <p>${file.name}</p>
                        <p>${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button class="remove-btn" onclick="removeFile(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                previewContainer.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    }

    window.removeFile = function(index) {
        uploadedFiles.splice(index, 1);
        showPreviews();
        
        // Disable process button if no files
        if (uploadedFiles.length === 0 && processBtn) {
            processBtn.disabled = true;
            processBtn.innerHTML = '<i class="fas fa-cog"></i> Process Images';
        }
    };

    window.processImages = async function() {
        console.log('=== PROCESS IMAGES START ===');
        console.log('Uploaded files count:', uploadedFiles.length);
        console.log('Current mode:', currentMode);
        
        if (!uploadedFiles || uploadedFiles.length === 0) {
            console.log('ERROR: No uploaded files');
            alert('Please upload at least one image');
            return;
        }

        // Get current settings
        const activeCropModeBtn = document.querySelector('.quality-btn[data-crop-mode].active');
        console.log('Active crop mode button:', activeCropModeBtn);
        console.log('Active crop mode:', activeCropModeBtn ? activeCropModeBtn.dataset.cropMode : 'none');
        
        if (!activeCropModeBtn && currentMode === 'crop') {
            console.log('ERROR: No crop mode selected');
            alert('Please select a crop mode (Automatic or Manual)');
            return;
        }

        // Always get dimensions from input fields
        let width = parseInt(document.getElementById('width').value) || 0;
        let height = parseInt(document.getElementById('height').value) || 0;
        console.log('Dimensions - Width:', width, 'Height:', height);

        const settings = {
            mode: currentMode,
            cropMode: activeCropModeBtn ? activeCropModeBtn.dataset.cropMode : 'manual',
            width: width,
            height: height,
            quality: currentQuality || 70,
            alignment: selectedAlignment || 'top-left',
            format: selectedFormat || 'jpg',
            effects: {
                // Basic effects
                blur: parseInt(effectSettings.blur) || 0,
                sharpen: parseInt(effectSettings.sharpen) || 0,
                brightness: parseInt(effectSettings.brightness) || 100,
                contrast: parseInt(effectSettings.contrast) || 100,
                saturation: parseInt(effectSettings.saturation) || 100,
                // Special effects
                normalize: effectSettings.normalize || false,
                equalize: effectSettings.equalize || false,
                enhance: effectSettings.enhance || false,
                emboss: effectSettings.emboss || false,
                edge: effectSettings.edge || false,
                charcoal: effectSettings.charcoal || false
            }
        };
        
        console.log('Settings object:', settings);
        console.log('Effects settings being sent:', settings.effects);
        console.log('Current effectSettings object:', effectSettings);
        console.log('Selected format for processing:', settings.format);
        console.log('Current selectedFormat variable:', selectedFormat);

        // Validate settings
        if (settings.mode === 'crop' && (!settings.width || !settings.height)) {
            console.log('ERROR: Missing dimensions for crop mode');
            alert('Please enter both width and height for crop mode');
            return;
        }

        if (settings.mode === 'resize' && selectedDimension === 'width' && !settings.width) {
            console.log('ERROR: Missing width for resize mode');
            alert('Please enter a width for resize mode');
            return;
        }

        if (settings.mode === 'resize' && selectedDimension === 'height' && !settings.height) {
            console.log('ERROR: Missing height for resize mode');
            alert('Please enter a height for resize mode');
            return;
        }

        // If in manual crop mode, show crop step for first image
        if (settings.mode === 'crop' && settings.cropMode === 'manual') {
            console.log('=== MANUAL CROP MODE DETECTED ===');
            console.log('Starting manual crop for image index:', 0);
            currentImageIndex = 0;
            editCrop(currentImageIndex);
            return;
        }

        console.log('=== STARTING SERVER PROCESSING ===');
        try {
            // Disable process button and show loading
            if (processBtn) {
                console.log('Disabling process button');
                processBtn.disabled = true;
                processBtn.innerHTML = '<i class="fas fa-cog spinning"></i> Processing...';
            }

            // Process images in smaller batches
            const batchSize = 3;
            const allProcessedImages = [];
            const totalBatches = Math.ceil(uploadedFiles.length / batchSize);
            console.log('Processing in batches - Total batches:', totalBatches, 'Batch size:', batchSize);
            
            for (let i = 0; i < uploadedFiles.length; i += batchSize) {
                const batch = uploadedFiles.slice(i, i + batchSize);
                const currentBatch = Math.floor(i / batchSize) + 1;
                console.log(`Processing batch ${currentBatch}/${totalBatches} with ${batch.length} images`);
                
                // Update progress message
                if (processBtn) {
                    processBtn.innerHTML = `<i class="fas fa-cog spinning"></i> Processing batch ${currentBatch}/${totalBatches}...`;
                }

                const formData = new FormData();
                formData.append('settings', JSON.stringify(settings));
                console.log('FormData settings:', JSON.stringify(settings));

                batch.forEach((file, index) => {
                    formData.append('images[]', file);
                    console.log(`Added file ${index + 1} to batch:`, file.name);
                });

                try {
                    console.log('Sending request to process.php...');
                    const response = await fetch('process.php', {
                        method: 'POST',
                        body: formData
                    });

                    console.log('Response status:', response.status);
                    console.log('Response ok:', response.ok);

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Server response error:', errorText);
                        
                        // MAMP FIX: Better error messages for large images
                        if (response.status === 500) {
                            throw new Error(`Server error (500) - This usually means your images are too large for the server to process. Try:\n1. Using smaller images (under 10MB each)\n2. Processing fewer images at once\n3. Converting to WebP format first\n\nTechnical details: ${errorText}`);
                        } else {
                            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
                        }
                    }

                    const result = await response.json();
                    console.log('Server response result:', result);
                    
                    if (result.success) {
                        allProcessedImages.push(...result.images);
                        console.log(`Batch ${currentBatch} processed successfully. Total processed:`, allProcessedImages.length);
                        // Update progress
                        const progress = Math.min(100, Math.round((i + batch.length) / uploadedFiles.length * 100));
                        if (processBtn) {
                            processBtn.innerHTML = `<i class="fas fa-cog spinning"></i> Processing... ${progress}%`;
                        }
                    } else {
                        console.error('Server returned error:', result.error);
                        throw new Error(result.error || 'Processing failed');
                    }
                } catch (error) {
                    console.error(`Error processing batch ${currentBatch}:`, error);
                    // Continue with next batch even if current batch fails
                    continue;
                }

                // Add a small delay between batches to prevent server overload
                console.log('Waiting 1 second before next batch...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log('All batches processed. Total images:', allProcessedImages.length);
            if (allProcessedImages.length > 0) {
                processedImages = allProcessedImages;
                console.log('About to show download step with images:', allProcessedImages);
                
                // Direct inline approach - no function calls
                console.log('=== DIRECT DOWNLOAD STEP START ===');
                
                // Hide split screen
                const splitScreen = document.querySelector('.split-screen');
                console.log('Split screen element:', splitScreen);
                if (splitScreen) {
                    splitScreen.style.display = 'none';
                    console.log('Split screen hidden');
                }
                
                // Hide crop step if it's visible
                const cropStep = document.getElementById('cropStep');
                if (cropStep && cropStep.style.display !== 'none') {
                    cropStep.style.display = 'none';
                    cropStep.classList.remove('active');
                    console.log('Crop step hidden');
                }
                
                // Show download step
                const downloadStep = document.getElementById('downloadStep');
                console.log('Download step element:', downloadStep);
                if (downloadStep) {
                    downloadStep.style.display = 'block';
                    downloadStep.classList.add('active');
                    console.log('Download step shown and active class added');
                } else {
                    console.error('Download step element not found!');
                }
                
                // Show processed images directly
                console.log('=== SHOWING PROCESSED IMAGES DIRECTLY ===');
                const container = document.getElementById('processedImages');
                console.log('Processed images container:', container);
                if (container) {
                    container.innerHTML = '';
                    console.log('Container cleared');

                    allProcessedImages.forEach((image, index) => {
                        console.log(`Creating display item for image ${index + 1}:`, image);
                        const item = document.createElement('div');
                        item.className = 'processed-item';
                        item.innerHTML = `
                            <img src="${image.url}" alt="Processed image">
                            <div class="processed-item-info">
                                <p>${image.name}</p>
                                <p>${image.size ? (image.size / 1024 / 1024).toFixed(2) + ' MB' : ''}</p>
                            </div>
                            <div class="processed-item-actions">
                                <button class="download-btn" onclick="downloadImage('${image.url}', '${image.name}')">
                                    <i class="fas fa-download"></i>
                                </button>
                                <button class="delete-btn" onclick="deleteProcessedImage(${index})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                        container.appendChild(item);
                        console.log(`Image ${index + 1} added to container`);
                    });

                    // Show download all button if multiple images
                    if (allProcessedImages.length > 1) {
                        console.log('Multiple images detected, showing download all button');
                        const downloadAllBtn = document.querySelector('.download-all');
                        if (downloadAllBtn) {
                            downloadAllBtn.style.display = 'inline-flex';
                            console.log('Download all button shown');
                        } else {
                            console.log('Download all button not found');
                        }
                    } else {
                        console.log('Single image, download all button not needed');
                    }
                } else {
                    console.error('Processed images container not found!');
                }
                
                console.log('=== DIRECT DOWNLOAD STEP END ===');
            } else {
                console.error('No images were successfully processed');
                throw new Error('No images were successfully processed');
            }

        } catch (error) {
            console.error('Error processing images:', error);
            alert('Error processing images: ' + error.message);
        } finally {
            // Reset process button
            console.log('Resetting process button');
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.innerHTML = '<i class="fas fa-cog"></i> Process Images';
            }
        }
        console.log('=== PROCESS IMAGES END ===');
    };

    // Initialize the interface
    updateModeOptions();
    updateDimensionInputs();
    updateQualitySlider();
    
    // Set default crop mode to manual
    const manualCropBtn = document.querySelector('.quality-btn[data-crop-mode="manual"]');
    if (manualCropBtn) {
        manualCropBtn.classList.add('active');
        updateCropModeOptions();
    }

    // Crop functionality
    function editCrop(index) {
        console.log('=== EDIT CROP START ===');
        console.log('Editing crop for image index:', index);
        console.log('Total uploaded files:', uploadedFiles.length);
        
        currentImageIndex = index;
        const file = uploadedFiles[index];
        console.log('File to crop:', file.name, 'Size:', file.size);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('File loaded successfully, showing crop step');
            document.getElementById('cropImage').src = e.target.result;
            showCropStep();
            
            // Wait for image to load before initializing cropper
            document.getElementById('cropImage').onload = () => {
                console.log('Image loaded, initializing cropper');
                initCropper();
            };
        };
        reader.onerror = (e) => {
            console.error('Error reading file:', e);
        };
        reader.readAsDataURL(file);
        console.log('=== EDIT CROP END ===');
    }

    function initCropper() {
        console.log('=== INIT CROPPER START ===');
        if (cropper) {
            console.log('Destroying existing cropper');
            cropper.destroy();
        }

        const width = parseInt(document.getElementById('width').value) || 400;
        const height = parseInt(document.getElementById('height').value) || 300;
        const aspectRatio = width / height;
        console.log('Cropper settings - Width:', width, 'Height:', height, 'Aspect ratio:', aspectRatio);

        try {
            cropper = new Cropper(document.getElementById('cropImage'), {
                aspectRatio: aspectRatio,
                viewMode: 2,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                zoomable: false,
                minCropBoxWidth: width,
                minCropBoxHeight: height
            });
            console.log('Cropper initialized successfully');
        } catch (error) {
            console.error('Error initializing cropper:', error);
        }
        console.log('=== INIT CROPPER END ===');
    }

    function showCropStep() {
        console.log('=== SHOW CROP STEP ===');
        // Hide split screen
        document.querySelector('.split-screen').style.display = 'none';
        console.log('Split screen hidden');
        
        // Show crop step
        const cropStep = document.getElementById('cropStep');
        cropStep.style.display = 'block';
        cropStep.classList.add('active');
        console.log('Crop step shown');
    }

    window.applyCrop = function() {
        console.log('=== APPLY CROP START ===');
        if (!cropper) {
            console.error('No cropper instance found');
            return;
        }
        
        console.log('Applying crop for image index:', currentImageIndex);
        
        // Add loading state to the button
        const cropButton = document.querySelector('.crop-controls .btn');
        const originalButtonContent = cropButton.innerHTML;
        cropButton.disabled = true;
        cropButton.innerHTML = '<i class="fas fa-cog spinning"></i> Processing...';
        console.log('Crop button disabled and showing loading state');

        try {
            // Get the cropped canvas
            const canvas = cropper.getCroppedCanvas({
                width: parseInt(document.getElementById('width').value),
                height: parseInt(document.getElementById('height').value)
            });
            console.log('Cropped canvas created');

            // Convert canvas to blob
            canvas.toBlob(async (blob) => {
                console.log('Canvas converted to blob, size:', blob.size);
                
                // Create a new file from the blob
                const croppedFile = new File([blob], uploadedFiles[currentImageIndex].name, {
                    type: 'image/jpeg'
                });
                console.log('Cropped file created:', croppedFile.name, 'Size:', croppedFile.size);

                // Store the cropped file
                uploadedFiles[currentImageIndex] = croppedFile;
                console.log('Cropped file stored in uploadedFiles array');

                // Move to next image or process all images
                if (currentImageIndex < uploadedFiles.length - 1) {
                    console.log('Moving to next image. Current:', currentImageIndex, 'Total:', uploadedFiles.length);
                    editCrop(currentImageIndex + 1);
                    // Reset button state after a short delay
                    setTimeout(() => {
                        cropButton.disabled = false;
                        cropButton.innerHTML = originalButtonContent;
                        console.log('Crop button reset for next image');
                    }, 500);
                } else {
                    console.log('All images cropped, starting final processing');
                    // All images have been cropped, now process them
                    processImagesAfterCrop();
                }
            }, 'image/jpeg', currentQuality / 100);
        } catch (error) {
            console.error('Error during crop:', error);
            alert('Error processing images: ' + error.message);
            cropButton.disabled = false;
            cropButton.innerHTML = originalButtonContent;
        }
        console.log('=== APPLY CROP END ===');
    };

    async function processImagesAfterCrop() {
        console.log('=== PROCESS IMAGES AFTER CROP START ===');
        console.log('Processing', uploadedFiles.length, 'cropped images');
        
        // Get current settings
        const activeCropModeBtn = document.querySelector('.quality-btn[data-crop-mode].active');
        let width = parseInt(document.getElementById('width').value) || 0;
        let height = parseInt(document.getElementById('height').value) || 0;

        const settings = {
            mode: currentMode,
            cropMode: activeCropModeBtn ? activeCropModeBtn.dataset.cropMode : 'manual',
            width: width,
            height: height,
            quality: currentQuality || 70,
            alignment: selectedAlignment || 'top-left',
            format: selectedFormat || 'jpg',
            effects: {
                blur: parseInt(effectSettings.blur) || 0,
                sharpen: parseInt(effectSettings.sharpen) || 0,
                brightness: parseInt(effectSettings.brightness) || 100,
                contrast: parseInt(effectSettings.contrast) || 100,
                saturation: parseInt(effectSettings.saturation) || 100,
                normalize: effectSettings.normalize || false,
                equalize: effectSettings.equalize || false,
                enhance: effectSettings.enhance || false,
                emboss: effectSettings.emboss || false,
                edge: effectSettings.edge || false,
                charcoal: effectSettings.charcoal || false
            }
        };
        
        console.log('Settings for final processing:', settings);

        try {
            // Process images in batches
            const batchSize = 3;
            const allProcessedImages = [];
            const totalBatches = Math.ceil(uploadedFiles.length / batchSize);
            console.log('Processing cropped images in batches - Total batches:', totalBatches);
            
            // Get the crop controls button for progress updates
            const cropControlsBtn = document.querySelector('.crop-controls .btn');
            
            for (let i = 0; i < uploadedFiles.length; i += batchSize) {
                const batch = uploadedFiles.slice(i, i + batchSize);
                const currentBatch = Math.floor(i / batchSize) + 1;
                console.log(`Processing batch ${currentBatch}/${totalBatches} with ${batch.length} cropped images`);

                // Update progress message
                if (cropControlsBtn) {
                    const progress = Math.min(100, Math.round((i + batch.length) / uploadedFiles.length * 100));
                    cropControlsBtn.innerHTML = `<i class="fas fa-cog spinning"></i> Processing batch ${currentBatch}/${totalBatches}... ${progress}%`;
                    cropControlsBtn.disabled = true;
                }

                const formData = new FormData();
                formData.append('settings', JSON.stringify(settings));

                batch.forEach((file, index) => {
                    formData.append('images[]', file);
                    console.log(`Added cropped file ${index + 1} to batch:`, file.name);
                });

                try {
                    console.log('Sending cropped images to process.php...');
                    const response = await fetch('process.php', {
                        method: 'POST',
                        body: formData
                    });

                    console.log('Response status:', response.status);

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Server response error:', errorText);
                        
                        // MAMP FIX: Better error messages for large images
                        if (response.status === 500) {
                            throw new Error(`Server error (500) - This usually means your images are too large for the server to process. Try:\n1. Using smaller images (under 10MB each)\n2. Processing fewer images at once\n3. Converting to WebP format first\n\nTechnical details: ${errorText}`);
                        } else {
                            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
                        }
                    }

                    const result = await response.json();
                    console.log('Server response for cropped images:', result);
                    
                    if (result.success) {
                        allProcessedImages.push(...result.images);
                        console.log(`Batch ${currentBatch} processed successfully. Total processed:`, allProcessedImages.length);
                    } else {
                        console.error('Server returned error:', result.error);
                        throw new Error(result.error || 'Processing failed');
                    }
                } catch (error) {
                    console.error(`Error processing batch ${currentBatch}:`, error);
                    continue;
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Reset button after processing
            if (cropControlsBtn) {
                cropControlsBtn.disabled = false;
                cropControlsBtn.innerHTML = '<i class="fas fa-check"></i> Apply & Next <i class="fas fa-chevron-right"></i>';
            }

            console.log('All cropped images processed. Total:', allProcessedImages.length);
            if (allProcessedImages.length > 0) {
                processedImages = allProcessedImages;
                console.log('About to show download step with images:', allProcessedImages);
                
                // Direct inline approach - no function calls
                console.log('=== DIRECT DOWNLOAD STEP START ===');
                
                // Hide split screen
                const splitScreen = document.querySelector('.split-screen');
                console.log('Split screen element:', splitScreen);
                if (splitScreen) {
                    splitScreen.style.display = 'none';
                    console.log('Split screen hidden');
                }
                
                // Hide crop step if it's visible
                const cropStep = document.getElementById('cropStep');
                if (cropStep && cropStep.style.display !== 'none') {
                    cropStep.style.display = 'none';
                    cropStep.classList.remove('active');
                    console.log('Crop step hidden');
                }
                
                // Show download step
                const downloadStep = document.getElementById('downloadStep');
                console.log('Download step element:', downloadStep);
                if (downloadStep) {
                    downloadStep.style.display = 'block';
                    downloadStep.classList.add('active');
                    console.log('Download step shown and active class added');
                } else {
                    console.error('Download step element not found!');
                }
                
                // Show processed images directly
                console.log('=== SHOWING PROCESSED IMAGES DIRECTLY ===');
                const container = document.getElementById('processedImages');
                console.log('Processed images container:', container);
                if (container) {
                    container.innerHTML = '';
                    console.log('Container cleared');

                    allProcessedImages.forEach((image, index) => {
                        console.log(`Creating display item for image ${index + 1}:`, image);
                        const item = document.createElement('div');
                        item.className = 'processed-item';
                        item.innerHTML = `
                            <img src="${image.url}" alt="Processed image">
                            <div class="processed-item-info">
                                <p>${image.name}</p>
                                <p>${image.size ? (image.size / 1024 / 1024).toFixed(2) + ' MB' : ''}</p>
                            </div>
                            <div class="processed-item-actions">
                                <button class="download-btn" onclick="downloadImage('${image.url}', '${image.name}')">
                                    <i class="fas fa-download"></i>
                                </button>
                                <button class="delete-btn" onclick="deleteProcessedImage(${index})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                        container.appendChild(item);
                        console.log(`Image ${index + 1} added to container`);
                    });

                    // Show download all button if multiple images
                    if (allProcessedImages.length > 1) {
                        console.log('Multiple images detected, showing download all button');
                        const downloadAllBtn = document.querySelector('.download-all');
                        if (downloadAllBtn) {
                            downloadAllBtn.style.display = 'inline-flex';
                            console.log('Download all button shown');
                        } else {
                            console.log('Download all button not found');
                        }
                    } else {
                        console.log('Single image, download all button not needed');
                    }
                } else {
                    console.error('Processed images container not found!');
                }
                
                console.log('=== DIRECT DOWNLOAD STEP END ===');
            } else {
                console.error('No cropped images were successfully processed');
                throw new Error('No cropped images were successfully processed');
            }

        } catch (error) {
            console.error('Error processing cropped images:', error);
            alert('Error processing cropped images: ' + error.message);
        }
        console.log('=== PROCESS IMAGES AFTER CROP END ===');
    };

    function handlePageDragOver(e) {
        e.preventDefault();
        // Only show page drag feedback if we're not over the dropzone
        if (!dropzone.contains(e.target)) {
            document.body.classList.add('page-dragover');
        }
    }

    function handlePageDrop(e) {
        e.preventDefault();
        document.body.classList.remove('page-dragover');
        
        // Only handle if we're not dropping on the dropzone (to avoid double handling)
        if (!dropzone.contains(e.target)) {
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
        }
    }

    function handlePageDragLeave(e) {
        // Only remove the class if we're leaving the page entirely
        if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
            document.body.classList.remove('page-dragover');
        }
    }
});

// Download functions
window.downloadImage = function(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.downloadAll = async function() {
    if (!processedImages || processedImages.length === 0) {
        alert('No images to download');
        return;
    }

    try {
        const zip = new JSZip();
        
        // Add each image to the zip
        for (let i = 0; i < processedImages.length; i++) {
            const image = processedImages[i];
            const response = await fetch(image.url);
            const blob = await response.blob();
            zip.file(image.name, blob);
        }
        
        // Generate and download zip
        const content = await zip.generateAsync({type: 'blob'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'processed_images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error creating zip:', error);
        alert('Error creating zip file. Please try downloading images individually.');
    }
};

window.deleteProcessedImage = function(index) {
    if (confirm('Are you sure you want to delete this image?')) {
        processedImages.splice(index, 1);
        
        // Re-render the processed images
        const container = document.getElementById('processedImages');
        if (container) {
            container.innerHTML = '';
            
            processedImages.forEach((image, idx) => {
                const item = document.createElement('div');
                item.className = 'processed-item';
                item.innerHTML = `
                    <img src="${image.url}" alt="Processed image">
                    <div class="processed-item-info">
                        <p>${image.name}</p>
                        <p>${image.size ? (image.size / 1024 / 1024).toFixed(2) + ' MB' : ''}</p>
                    </div>
                    <div class="processed-item-actions">
                        <button class="download-btn" onclick="downloadImage('${image.url}', '${image.name}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteProcessedImage(${idx})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
            
            // Update download all button visibility
            const downloadAllBtn = document.querySelector('.download-all');
            if (downloadAllBtn) {
                downloadAllBtn.style.display = processedImages.length > 1 ? 'inline-flex' : 'none';
            }
        }
    }
};

// Global test function for effects
window.testEffects = function() {
    console.log('=== EFFECTS TEST ===');
    console.log('Current effectSettings:', effectSettings);
    
    // Test clicking all effect buttons
    document.querySelectorAll('.effect-btn').forEach(btn => {
        console.log('Testing button:', btn.dataset.effect);
        btn.click();
        console.log('After click - Active:', btn.classList.contains('active'));
    });
    
    console.log('Final effectSettings:', effectSettings);
    
    // Test creating settings object
    const testSettings = {
        mode: 'resize',
        width: 800,
        height: 600,
        quality: 80,
        format: 'jpg',
        effects: {
            blur: parseInt(effectSettings.blur) || 0,
            sharpen: parseInt(effectSettings.sharpen) || 0,
            brightness: parseInt(effectSettings.brightness) || 50,
            contrast: parseInt(effectSettings.contrast) || 50,
            saturation: parseInt(effectSettings.saturation) || 50,
            normalize: effectSettings.normalize || false,
            equalize: effectSettings.equalize || false,
            enhance: effectSettings.enhance || false,
            emboss: effectSettings.emboss || false,
            edge: effectSettings.edge || false,
            charcoal: effectSettings.charcoal || false
        }
    };
    
    console.log('Test settings object:', testSettings);
    console.log('Effects in settings:', testSettings.effects);
    
    return testSettings;
};

// Global test function for format buttons
window.testFormats = function() {
    console.log('=== FORMAT TEST ===');
    console.log('Current selectedFormat:', selectedFormat);
    
    // Test clicking all format buttons
    document.querySelectorAll('.format-btn').forEach(btn => {
        console.log('Testing format button:', btn.dataset.format);
        btn.click();
        console.log('After click - Active:', btn.classList.contains('active'));
        console.log('Selected format after click:', selectedFormat);
    });
    
    console.log('Final selectedFormat:', selectedFormat);
    return selectedFormat;
};

// Effects info modal functions
function showEffectsInfo() {
    document.getElementById('effectsInfoModal').style.display = 'block';
}

function closeEffectsInfo() {
    document.getElementById('effectsInfoModal').style.display = 'none';
}

// Quality info modal functions
function showQualityInfo() {
    document.getElementById('qualityInfoModal').style.display = 'block';
}

function closeQualityInfo() {
    document.getElementById('qualityInfoModal').style.display = 'none';
}

// Format info modal functions
function showFormatInfo() {
    document.getElementById('formatInfoModal').style.display = 'block';
}

function closeFormatInfo() {
    document.getElementById('formatInfoModal').style.display = 'none';
}

// Crop info modal functions
function showCropInfo() {
    document.getElementById('cropInfoModal').style.display = 'block';
}

function closeCropInfo() {
    document.getElementById('cropInfoModal').style.display = 'none';
}

// Privacy modal functions - uses Bootstrap modal
function showPrivacyModal() {
    const modal = new bootstrap.Modal(document.getElementById('privacyModal'));
    modal.show();
}

// Close modals when clicking outside
window.onclick = function(event) {
    const qualityModal = document.getElementById('qualityInfoModal');
    const formatModal = document.getElementById('formatInfoModal');
    const cropModal = document.getElementById('cropInfoModal');
    const effectsModal = document.getElementById('effectsInfoModal');
    if (event.target === qualityModal) {
        closeQualityInfo();
    }
    if (event.target === formatModal) {
        closeFormatInfo();
    }
    if (event.target === cropModal) {
        closeCropInfo();
    }
    if (event.target === effectsModal) {
        closeEffectsInfo();
    }
}