// Easy PDF Preflight - PDF Analysis Tool

// Set PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// State
let currentPDFData = null;
let analysisData = {
    client: null,
    server: null
};
let extractedImages = null;
let isExtracting = false;

// DOM Elements (will be set in DOMContentLoaded)
let dropzone, fileInput, loadingIndicator, quickInfo, quickInfoContent;
let resultsPlaceholder, resultsContainer, resetBtn;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    dropzone = document.getElementById('dropzone');
    fileInput = document.getElementById('fileInput');
    loadingIndicator = document.getElementById('loadingIndicator');
    quickInfo = document.getElementById('quickInfo');
    quickInfoContent = document.getElementById('quickInfoContent');
    resultsPlaceholder = document.getElementById('resultsPlaceholder');
    resultsContainer = document.getElementById('resultsContainer');
    resetBtn = document.getElementById('resetBtn');

    if (!dropzone || !fileInput) {
        console.error('Required DOM elements not found');
        return;
    }

    initializeEventListeners();
});

function initializeEventListeners() {
    if (dropzone) {
        dropzone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
        dropzone.addEventListener('dragover', handleDragOver);
        dropzone.addEventListener('dragleave', handleDragLeave);
        dropzone.addEventListener('drop', handleDrop);
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => resetAll(false));
    }

    const extractBtn = document.getElementById('extractImagesBtn');
    if (extractBtn) {
        extractBtn.addEventListener('click', extractImages);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (dropzone) {
        dropzone.classList.add('dragover');
    }
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (dropzone) {
        const rect = dropzone.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            dropzone.classList.remove('dragover');
        }
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (dropzone) {
        dropzone.classList.remove('dragover');
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

async function handleFile(file) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please upload a PDF file');
        return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File size exceeds 50MB limit');
        return;
    }

    currentPDFData = file;
    analysisData = { client: null, server: null };
    extractedImages = null;

    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (quickInfo) quickInfo.style.display = 'none';
    if (resultsPlaceholder) resultsPlaceholder.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'block';

    try {
        await Promise.all([
            analyzePDFClient(file),
            analyzePDFServer(file)
        ]);

        displayResults();
    } catch (error) {
        console.error('Error analyzing PDF:', error);
        alert('Error analyzing PDF: ' + error.message);
        resetAll(true);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

async function analyzePDFClient(file) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js library failed to load');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const numPages = pdf.numPages;
    const metadata = await pdf.getMetadata();

    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1.0 });

    const maxPagesToCheck = Math.min(5, numPages);
    const fonts = new Set();

    for (let i = 1; i <= maxPagesToCheck; i++) {
        try {
            const page = await pdf.getPage(i);
            const opList = await page.getOperatorList();

            for (let j = 0; j < opList.fnArray.length; j++) {
                if (opList.fnArray[j] === pdfjsLib.OPS.setFont) {
                    const fontName = opList.argsArray[j][0];
                    if (fontName) {
                        fonts.add(fontName);
                    }
                }
            }
        } catch (e) {
            console.warn('Error extracting fonts from page', i, e);
        }
    }

    const images = [];
    const imageMap = new Map();

    for (let i = 1; i <= maxPagesToCheck; i++) {
        try {
            const page = await pdf.getPage(i);
            const resources = await page.getResources();

            if (resources) {
                const xObjects = resources.get('XObject');

                if (xObjects) {
                    const xObjectKeys = xObjects.getKeys();

                    for (let j = 0; j < xObjectKeys.length; j++) {
                        const xObjectName = xObjectKeys[j];

                        if (imageMap.has(xObjectName)) continue;

                        try {
                            const xObjectRef = xObjects.get(xObjectName);

                            if (xObjectRef) {
                                const xObject = await xObjectRef;
                                const subtype = xObject.get('Subtype');

                                if (subtype && (subtype.name === 'Image' || subtype === 'Image')) {
                                    const width = xObject.get('Width');
                                    const height = xObject.get('Height');
                                    const colorSpace = xObject.get('ColorSpace');
                                    const filter = xObject.get('Filter');

                                    let format = 'Unknown';
                                    if (filter) {
                                        const filterArray = Array.isArray(filter) ? filter : [filter];

                                        if (filterArray.some(f => (f.name || f) === 'DCTDecode')) {
                                            format = 'JPEG';
                                        } else if (filterArray.some(f => (f.name || f) === 'CCITTFaxDecode')) {
                                            format = 'CCITT';
                                        } else if (filterArray.some(f => (f.name || f) === 'JBIG2Decode')) {
                                            format = 'JBIG2';
                                        } else if (filterArray.some(f => (f.name || f) === 'JPXDecode')) {
                                            format = 'JPEG2000';
                                        } else {
                                            format = 'Other';
                                        }
                                    }

                                    let colorSpaceName = 'Unknown';
                                    if (colorSpace) {
                                        if (colorSpace.name) {
                                            colorSpaceName = colorSpace.name;
                                        } else if (typeof colorSpace === 'string') {
                                            colorSpaceName = colorSpace;
                                        } else if (Array.isArray(colorSpace) && colorSpace.length > 0) {
                                            const cs = colorSpace[0];
                                            colorSpaceName = cs.name || cs || 'Unknown';
                                        }
                                    }

                                    const imgWidth = width ? (typeof width === 'number' ? width : Number(width)) : null;
                                    const imgHeight = height ? (typeof height === 'number' ? height : Number(height)) : null;

                                    images.push({
                                        name: xObjectName,
                                        page: i,
                                        width: imgWidth,
                                        height: imgHeight,
                                        format: format,
                                        colorSpace: colorSpaceName
                                    });

                                    imageMap.set(xObjectName, true);
                                }
                            }
                        } catch (e) {
                            console.warn('Error processing XObject:', xObjectName, e);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Error extracting images from page', i, e);
        }
    }

    analysisData.client = {
        numPages,
        metadata: {
            title: metadata?.info?.Title || 'N/A',
            author: metadata?.info?.Author || 'N/A',
            subject: metadata?.info?.Subject || 'N/A',
            creator: metadata?.info?.Creator || 'N/A',
            producer: metadata?.info?.Producer || 'N/A',
            creationDate: metadata?.info?.CreationDate ? formatPDFDate(metadata.info.CreationDate) : 'N/A',
            modificationDate: metadata?.info?.ModDate ? formatPDFDate(metadata.info.ModDate) : 'N/A',
            pdfVersion: pdf._pdfInfo?.PDFFormatVersion || 'N/A'
        },
        pageDimensions: {
            width: viewport.width,
            height: viewport.height
        },
        fonts: Array.from(fonts),
        images: images,
        imageCount: images.length,
        fileSize: file.size
    };

    displayQuickInfo();
}

function formatPDFDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const match = dateString.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
        if (match) {
            const [, year, month, day, hour, minute, second] = match;
            return new Date(year, month - 1, day, hour, minute, second).toLocaleString();
        }
        return dateString;
    } catch (e) {
        return dateString;
    }
}

function displayQuickInfo() {
    const data = analysisData.client;
    if (!data || !quickInfo || !quickInfoContent) return;

    quickInfoContent.innerHTML = `
        <div class="quick-info-item">
            <label>Pages</label>
            <value>${data.numPages}</value>
        </div>
        <div class="quick-info-item">
            <label>File Size</label>
            <value>${formatFileSize(data.fileSize)}</value>
        </div>
        <div class="quick-info-item">
            <label>PDF Version</label>
            <value>${data.metadata.pdfVersion}</value>
        </div>
        <div class="quick-info-item">
            <label>Fonts Found</label>
            <value>${data.fonts.length}</value>
        </div>
    `;

    quickInfo.style.display = 'block';
}

async function analyzePDFServer(file) {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch('api/analyze.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    });

    let data;
    try {
        data = await response.json();
    } catch (e) {
        throw new Error('Server returned an invalid response');
    }

    if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error || ('Server analysis failed: ' + response.statusText));
    }

    analysisData.server = data.data;

    if (!Array.isArray(analysisData.server.fonts)) {
        analysisData.server.fonts = [];
    }
    if (!Array.isArray(analysisData.server.images)) {
        analysisData.server.images = [];
    }
    if (!analysisData.server.numPages) {
        analysisData.server.numPages = analysisData.client?.numPages || 0;
    }
}

async function extractImages() {
    if (!currentPDFData || isExtracting) return;

    const serverImages = analysisData.server?.images || [];
    if (serverImages.length === 0) {
        alert('No images to extract from this PDF.');
        return;
    }

    const extractBtn = document.getElementById('extractImagesBtn');
    const extractStatus = document.getElementById('extractStatus');

    isExtracting = true;
    if (extractBtn) {
        extractBtn.disabled = true;
        extractBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Extracting...';
    }
    if (extractStatus) {
        extractStatus.textContent = 'Extracting images from PDF...';
        extractStatus.style.display = 'block';
    }

    try {
        const formData = new FormData();
        formData.append('pdf', currentPDFData);

        const response = await fetch('api/extract_images.php', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.data) {
            throw new Error(data.error || 'Image extraction failed');
        }

        extractedImages = data.data.images || [];
        displayImages(analysisData.client, analysisData.server);

        const zipBtn = document.getElementById('downloadZipBtn');
        const hasDownloads = extractedImages.some(img => img.downloadUrl);
        if (zipBtn) {
            zipBtn.style.display = hasDownloads ? 'inline-flex' : 'none';
        }

        if (extractStatus) {
            extractStatus.textContent = `Extracted ${data.data.extractedCount || 0} of ${data.data.totalCount || 0} images.`;
        }
    } catch (error) {
        console.error('Image extraction failed:', error);
        alert('Image extraction failed: ' + error.message);
        if (extractStatus) {
            extractStatus.textContent = 'Extraction failed: ' + error.message;
        }
    } finally {
        isExtracting = false;
        if (extractBtn) {
            extractBtn.disabled = false;
            extractBtn.innerHTML = '<i class="fas fa-download"></i> Extract Images';
        }
    }
}

function getDownloadUrlForImage(image, index) {
    if (!extractedImages || extractedImages.length === 0) {
        return null;
    }

    const byName = extractedImages.find(item => item.name === image.name);
    if (byName?.downloadUrl) {
        return byName.downloadUrl;
    }

    const byPage = extractedImages.find(item =>
        item.page === image.page &&
        item.width === image.width &&
        item.height === image.height
    );
    if (byPage?.downloadUrl) {
        return byPage.downloadUrl;
    }

    return extractedImages[index]?.downloadUrl || null;
}

function displayResults() {
    displayDocumentInfo(analysisData.client, analysisData.server);
    displayFonts(analysisData.client, analysisData.server);
    displayImages(analysisData.client, analysisData.server);
    displayMetadata(analysisData.client, analysisData.server);
    updateImagesActions();
}

function updateImagesActions() {
    const actions = document.getElementById('imagesActions');
    const serverImages = analysisData.server?.images || [];
    const clientImages = analysisData.client?.images || [];

    if (actions) {
        actions.style.display = (serverImages.length > 0 || clientImages.length > 0) ? 'flex' : 'none';
    }
}

function displayDocumentInfo(client, server) {
    const container = document.getElementById('documentInfo');
    const data = server || {};
    const numPages = data.numPages || client?.numPages;
    const pdfVersion = (data.pdfVersion && data.pdfVersion !== 'N/A')
        ? data.pdfVersion
        : client?.metadata?.pdfVersion;

    let html = '';

    if (numPages) {
        html += `
        <div class="info-item">
            <label>Pages</label>
            <value>${numPages}</value>
        </div>`;
    }

    if (client && client.fileSize) {
        html += `
        <div class="info-item">
            <label>File Size</label>
            <value>${formatFileSize(client.fileSize)}</value>
        </div>`;
    }

    if (pdfVersion && pdfVersion !== 'N/A') {
        html += `
        <div class="info-item">
            <label>PDF Version</label>
            <value>${pdfVersion}</value>
        </div>`;
    }

    if (client && client.pageDimensions) {
        html += `
        <div class="info-item">
            <label>Page Dimensions</label>
            <value>${client.pageDimensions.width.toFixed(2)} × ${client.pageDimensions.height.toFixed(2)} pts</value>
        </div>`;
    }

    container.innerHTML = html || '<p class="error-text">Could not load document information.</p>';
}

function displayFonts(client, server) {
    const container = document.getElementById('fontsInfo');

    if (server !== null && server !== undefined) {
        const serverFonts = Array.isArray(server.fonts) ? server.fonts : [];

        if (serverFonts.length > 0) {
            let html = '<table class="info-table">';
            html += '<thead><tr><th>Font Name</th><th>Type</th><th>Embedding</th><th>Subset</th></tr></thead>';
            html += '<tbody>';

            serverFonts.forEach(font => {
                const isEmbedded = font.embedded === true || font.embedded === 'true' || font.embedded === 1;
                const isSubset = font.subset === true || font.subset === 'true' || font.subset === 1;
                const embeddingStatus = isEmbedded ? 'embedded' : (isSubset ? 'subset' : 'not-embedded');
                const embeddingText = isEmbedded ? 'Embedded' : (isSubset ? 'Subset' : 'Not Embedded');

                html += `
                    <tr>
                        <td>${escapeHtml(font.name || 'Unknown')}</td>
                        <td>${escapeHtml(font.type || 'N/A')}</td>
                        <td><span class="status-badge ${embeddingStatus}">${embeddingText}</span></td>
                        <td>${isSubset ? 'Yes' : 'No'}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            container.innerHTML = html;
        } else if (client && client.fonts && client.fonts.length > 0) {
            let html = '<p><small>Server found no embedded fonts. Client-side font references:</small></p>';
            html += '<ul class="font-list">';
            client.fonts.forEach(fontName => {
                html += `<li><code>${escapeHtml(fontName)}</code></li>`;
            });
            html += '</ul>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p>No fonts found in PDF</p>';
        }
    } else {
        container.innerHTML = '<p class="error-text">Could not load font information from server.</p>';
    }
}

function displayImages(client, server) {
    const container = document.getElementById('imagesInfo');

    if (server !== null && server !== undefined) {
        const serverImages = Array.isArray(server.images) ? server.images : [];

        if (serverImages.length > 0) {
            let html = '<table class="info-table">';
            html += '<thead><tr><th>#</th><th>Name</th><th>Page</th><th>Resolution</th><th>Dimensions</th><th>Format</th><th>Color Space</th><th>Download</th></tr></thead>';
            html += '<tbody>';

            serverImages.forEach((image, index) => {
                const dimensions = (image.width && image.height)
                    ? `${image.width} × ${image.height} px`
                    : 'N/A';

                const resolution = image.resolution || (image.dpi ? Math.round(image.dpi) + ' DPI' : 'N/A');
                const imageName = image.name || `img-${index + 1}`;
                const pageNumber = image.page || 'N/A';
                const downloadUrl = getDownloadUrlForImage(image, index);

                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><code>${escapeHtml(imageName)}</code></td>
                        <td>${pageNumber}</td>
                        <td>${resolution}</td>
                        <td>${dimensions}</td>
                        <td>${escapeHtml(image.format || 'N/A')}</td>
                        <td>${escapeHtml(image.colorSpace || 'N/A')}</td>
                        <td>${downloadUrl
                            ? `<a href="${escapeHtml(downloadUrl)}" class="download-link" download><i class="fas fa-download"></i> Download</a>`
                            : '<span class="text-muted">—</span>'}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p>No images found in PDF</p>';
        }
    } else if (client && client.images && client.images.length > 0) {
        let html = '<table class="info-table">';
        html += '<thead><tr><th>#</th><th>Page</th><th>Dimensions</th><th>Format</th><th>Color Space</th></tr></thead>';
        html += '<tbody>';

        client.images.forEach((image, index) => {
            const dimensions = (image.width && image.height)
                ? `${image.width} × ${image.height} px`
                : 'N/A';

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${image.page || 'N/A'}</td>
                    <td>${dimensions}</td>
                    <td>${escapeHtml(image.format || 'N/A')}</td>
                    <td>${escapeHtml(image.colorSpace || 'N/A')}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        html += '<p class="loading-text" style="margin-top: 1rem;"><small><i class="fas fa-info-circle"></i> Server analysis unavailable. Showing client-side image metadata only.</small></p>';
        container.innerHTML = html;
    } else {
        container.innerHTML = '<p>No images found in PDF</p>';
    }
}

function displayMetadata(client, server) {
    const container = document.getElementById('metadataInfo');
    const metadata = server?.metadata || client?.metadata || {};

    const items = [
        { label: 'Title', value: metadata.title },
        { label: 'Author', value: metadata.author },
        { label: 'Subject', value: metadata.subject },
        { label: 'Creator', value: metadata.creator },
        { label: 'Producer', value: metadata.producer },
        { label: 'Creation Date', value: metadata.creationDate },
        { label: 'Modification Date', value: metadata.modificationDate }
    ];

    container.innerHTML = items.map(item => `
        <div class="info-item">
            <label>${item.label}</label>
            <value>${escapeHtml(item.value || 'N/A')}</value>
        </div>
    `).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function resetAll(skipConfirm) {
    if (!skipConfirm && !confirm('Are you sure you want to reset? This will clear the current analysis.')) {
        return;
    }

    currentPDFData = null;
    analysisData = { client: null, server: null };
    extractedImages = null;
    isExtracting = false;

    if (quickInfo) quickInfo.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (resultsPlaceholder) resultsPlaceholder.style.display = 'block';
    if (fileInput) fileInput.value = '';

    const extractStatus = document.getElementById('extractStatus');
    if (extractStatus) {
        extractStatus.style.display = 'none';
        extractStatus.textContent = '';
    }

    const zipBtn = document.getElementById('downloadZipBtn');
    if (zipBtn) zipBtn.style.display = 'none';

    const actions = document.getElementById('imagesActions');
    if (actions) actions.style.display = 'none';
}
