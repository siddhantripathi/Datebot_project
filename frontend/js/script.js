document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const conversationInput = document.getElementById('emailInput');
    const submitButton = document.getElementById('submitButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultContainer = document.getElementById('resultContainer');
    const adviceResult = document.getElementById('jsonResult');
    const errorContainer = document.getElementById('errorContainer');
    const themeToggle = document.getElementById('themeToggle');
    const dropZone = document.getElementById('dropZone');
    const imageInput = document.getElementById('imageInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imageList = document.getElementById('imageList');
    
    let uploadedImages = new Map();
    let worker = null;

    // Add API URL configuration - using window.location to determine environment
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/api'
        : 'https://datebot-project.vercel.app/api';  // Replace with your Vercel domain

    // Initialize Tesseract
    initTesseract();

    async function initTesseract() {
        try {
            worker = await Tesseract.createWorker();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            console.log('Tesseract initialized successfully');
        } catch (error) {
            console.error('Tesseract initialization failed:', error);
            showError('Text recognition system failed to initialize');
        }
    }

    // Theme toggle
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
    });

    // File upload handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    dropZone.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    async function preprocessImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Create canvas
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Draw original image
                    ctx.drawImage(img, 0, 0);
                    
                    // Get image data
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;

                    // Process each pixel
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        
                        // Detect message bubbles by color patterns
                        if (
                            // Blue bubble (light text)
                            (b > 200 && g > 200 && r < 100) ||
                            // Light blue bubble
                            (b > 180 && g > 180 && r > 180) ||
                            // Yellow bubble with dark text
                            (r > 200 && g > 200 && b < 100) ||
                            // Green bubble
                            (r < 100 && g > 180 && b < 100) ||
                            // Gray bubble
                            (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 200)
                        ) {
                            // Convert bubble backgrounds to white and text to black
                            const brightness = (r + g + b) / 3;
                            if (brightness > 160) { // Background
                                data[i] = data[i + 1] = data[i + 2] = 255; // White
                            } else { // Text
                                data[i] = data[i + 1] = data[i + 2] = 0; // Black
                            }
                        } else {
                            // High contrast for other areas
                            const brightness = (r + g + b) / 3;
                            const threshold = 180;
                            
                            if (brightness > threshold) {
                                data[i] = data[i + 1] = data[i + 2] = 255;
                            } else {
                                data[i] = data[i + 1] = data[i + 2] = 0;
                            }
                        }
                    }

                    // Put processed image back
                    ctx.putImageData(imageData, 0, 0);

                    // Scale up the image
                    const scaledCanvas = document.createElement('canvas');
                    const scaledCtx = scaledCanvas.getContext('2d');
                    const scale = 2.5; // Increased scale factor
                    scaledCanvas.width = canvas.width * scale;
                    scaledCanvas.height = canvas.height * scale;
                    
                    // Use better scaling algorithm
                    scaledCtx.imageSmoothingEnabled = false;
                    scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

                    // Apply sharpening
                    const sharpenedData = scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
                    const sharpenKernel = [
                        0, -1, 0,
                        -1, 5, -1,
                        0, -1, 0
                    ];
                    applyKernel(sharpenedData, sharpenKernel);
                    scaledCtx.putImageData(sharpenedData, 0, 0);
                    
                    // Convert to data URL with maximum quality
                    resolve(scaledCanvas.toDataURL('image/png', 1.0));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Helper function to apply kernel (for sharpening)
    function applyKernel(imageData, kernel) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const tempData = new Uint8ClampedArray(data);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                for (let c = 0; c < 3; c++) {
                    let val = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const kidx = ((y + ky) * width + (x + kx)) * 4;
                            val += tempData[kidx + c] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    data[idx + c] = val;
                }
            }
        }
    }

    async function handleFiles(files) {
        if (!worker) {
            showError('Please wait for the text recognition system to initialize');
            return;
        }

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                showError(`File "${file.name}" is not an image`);
                continue;
            }

            const imageId = Date.now().toString();
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <img src="" alt="Screenshot">
                <button class="remove-image" data-id="${imageId}">
                    <i class="fas fa-times"></i>
                </button>
                <div class="ocr-progress">
                    <div class="ocr-progress-bar"></div>
                </div>
            `;
            imageList.appendChild(imageItem);
            imagePreviewContainer.classList.remove('hidden');

            try {
                const imageUrl = URL.createObjectURL(file);
                const img = imageItem.querySelector('img');
                img.src = imageUrl;

                const progressBar = imageItem.querySelector('.ocr-progress-bar');
                
                // Preprocess and recognize
                const processedImageData = await preprocessImage(file);
                const result = await worker.recognize(processedImageData, {
                    lang: 'eng',
                    tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?\'"-:;()[]{}@#$%^&*+=<>/ ',
                    tessedit_pageseg_mode: '6',
                    tessedit_ocr_engine_mode: '2', // Use LSTM only
                    preserve_interword_spaces: '1',
                    textord_heavy_nr: '1',
                    textord_min_linesize: '2.5'
                });

                progressBar.style.width = '100%';

                if (result.data.text.trim()) {
                    console.log('OCR Result:', result.data.text);
                    uploadedImages.set(imageId, result.data.text);
                    updateConversationText();
                } else {
                    throw new Error('No text found in image');
                }

                URL.revokeObjectURL(imageUrl);
            } catch (error) {
                console.error('OCR Error:', error);
                showError(error.message || 'Failed to process image');
                imageItem.remove();
            }
        }
    }

    // Remove image handler
    imageList.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.remove-image');
        if (removeButton) {
            const imageId = removeButton.dataset.id;
            uploadedImages.delete(imageId);
            removeButton.closest('.image-item').remove();
            updateConversationText();
            
            if (imageList.children.length === 0) {
                imagePreviewContainer.classList.add('hidden');
            }
        }
    });

    function updateConversationText() {
        const allTexts = Array.from(uploadedImages.values())
            .filter(text => text.trim()) // Remove empty texts
            .join('\n\n');
        
        if (allTexts) {
            conversationInput.value = allTexts;
            conversationInput.dispatchEvent(new Event('input'));
        }
    }

    // Submit button handler
    submitButton.addEventListener('click', async () => {
        const conversationText = conversationInput.value.trim();
        
        if (!conversationText) {
            showError('Please enter a conversation or upload a screenshot');
            return;
        }

        toggleLoading(true);
        clearResults();

        try {
            const response = await fetch(`${API_URL}/parse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: conversationText })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to get response');
            
            showResult(data);
        } catch (error) {
            console.error('API Error:', error);
            showError(error.message || 'Failed to connect to the server');
        } finally {
            toggleLoading(false);
        }
    });

    function showResult(data) {
        resultContainer.classList.remove('hidden');
        resultContainer.scrollIntoView({ behavior: 'smooth' });
        const formattedResponse = formatResponse(data.response);
        adviceResult.innerHTML = formattedResponse;
    }

    function formatResponse(response) {
        // Remove stars and clean up the text
        const cleanText = response.replace(/\*\*/g, '');
        
        const sections = cleanText.split('\n\n');
        return sections.map(section => {
            if (section.includes('1. Conversation')) {
                return `<div class="response-section analysis">
                    <h3><i class="fas fa-comments"></i> Conversation Analysis</h3>
                    <p>${section.replace('1. Conversation Dynamics Assessment:', '').trim()}</p>
                </div>`;
            } else if (section.includes('2. Two Options')) {
                const options = section.split('Option');
                return `<div class="response-section suggestions">
                    <h3><i class="fas fa-reply"></i> Suggested Responses</h3>
                    <div class="suggestions-grid">
                        ${options.slice(1).map(option => {
                            const [label, text] = option.split(':');
                            if (text) {
                                return `<div class="suggestion-card">
                                    <div class="suggestion-label">Option ${label.trim()}</div>
                                    <p>${text.trim()}</p>
                                </div>`;
                            }
                            return '';
                        }).join('')}
                    </div>
                </div>`;
            }
            return `<div class="response-section">${section}</div>`;
        }).join('');
    }

    function showError(message) {
        errorContainer.classList.remove('hidden');
        errorContainer.textContent = message;
        errorContainer.style.animation = 'none';
        errorContainer.offsetHeight;
        errorContainer.style.animation = 'shake 0.5s ease';
    }

    function clearResults() {
        resultContainer.classList.add('hidden');
        errorContainer.classList.add('hidden');
        adviceResult.textContent = '';
    }

    function toggleLoading(show) {
        submitButton.disabled = show;
        loadingIndicator.classList.toggle('hidden', !show);
        submitButton.innerHTML = show ? 
            '<i class="fas fa-spinner fa-spin"></i> Analyzing...' : 
            '<i class="fas fa-magic"></i> Get Dating Advice';
    }

    // Auto-resize textarea
    conversationInput.addEventListener('input', () => {
        conversationInput.style.height = 'auto';
        conversationInput.style.height = (conversationInput.scrollHeight) + 'px';
    });
});