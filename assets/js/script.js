// OCR 工具主要 JavaScript 文件
// 全域變數
let currentImageFile = null;
let ocrResult = '';
let isProcessing = false;
let currentSelection = null;
let isSelecting = false;
let selectionStart = null;
let imageWrapper = null;
let currentZoom = 1;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let scrollStart = { x: 0, y: 0 };

// DOM 元素
const imageInput = document.getElementById('imageInput');
const uploadArea = document.getElementById('uploadArea');
const previewContainer = document.getElementById('previewContainer');
const startOcrBtn = document.getElementById('startOcrBtn');
const showPreprocessedCheckbox = document.getElementById('showPreprocessed');
const advancedModeCheckbox = document.getElementById('advancedMode');
const binaryModeCheckbox = document.getElementById('binaryMode');
const removeTableLinesCheckbox = document.getElementById('removeTableLines');
const regionBasedOCRCheckbox = document.getElementById('regionBasedOCR');

// 辨識類型選擇器
const recognitionTypeRadios = document.querySelectorAll('input[name="recognitionType"]');
const ocrModeSelect = document.getElementById('ocrModeSelect');
const languageSelect = document.getElementById('languageSelect');
const languageGroup = document.getElementById('languageGroup');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressStatus = document.getElementById('progressStatus');
const resultContainer = document.getElementById('resultContainer');
const actionButtons = document.getElementById('actionButtons');
const copyBtn = document.getElementById('copyBtn');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');
const downloadMdBtn = document.getElementById('downloadMdBtn');
const selectionHint = document.getElementById('selectionHint');
const selectionControls = document.getElementById('selectionControls');
const clearSelectionBtn = document.getElementById('clearSelection');
const selectAllBtn = document.getElementById('selectAll');
const selectionInfo = document.getElementById('selectionInfo');
const zoomControls = document.getElementById('zoomControls');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const resetZoomBtn = document.getElementById('resetZoom');
const zoomLevelSpan = document.getElementById('zoomLevel');

// 初始化事件監聽器
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    // 設置默認辨識類型
    handleRecognitionTypeChange();
});

/**
 * 初始化所有事件監聽器
 */
function initializeEventListeners() {
    // 圖片上傳事件
    imageInput.addEventListener('change', handleImageUpload);
    
    // 拖放事件
    setupDragAndDrop();
    
    // 預處理選項變更事件
    showPreprocessedCheckbox.addEventListener('change', handlePreprocessToggle);
    
    // OCR 開始按鈕事件
    startOcrBtn.addEventListener('click', handleStartOCR);
    
    // 複製按鈕事件
    copyBtn.addEventListener('click', handleCopyText);
    
    // 下載按鈕事件
    downloadTxtBtn.addEventListener('click', () => handleDownload('txt'));
    downloadMdBtn.addEventListener('click', () => handleDownload('md'));
    
    // 區域選擇按鈕事件
    clearSelectionBtn.addEventListener('click', clearSelection);
    selectAllBtn.addEventListener('click', selectAllImage);
    
    // OCR模式選擇事件
    ocrModeSelect.addEventListener('change', handleModeChange);
    
    // 縮放控制事件
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    resetZoomBtn.addEventListener('click', resetZoom);
    
    // 辨識類型變更事件
    recognitionTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleRecognitionTypeChange);
    });
}

/**
 * 設置拖放功能
 */
function setupDragAndDrop() {
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
}

/**
 * 處理拖拽懸停
 */
function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

/**
 * 處理拖拽離開
 */
function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

/**
 * 處理文件拖放
 */
function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

/**
 * 處理圖片上傳
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    
    if (!file) {
        resetPreview();
        return;
    }

    processFile(file);
}

/**
 * 處理文件（統一的文件處理邏輯）
 */
function processFile(file) {
    console.log('開始處理檔案:', file.name, '類型:', file.type, '大小:', file.size);
    
    // 更寬鬆的文件類型檢查
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        console.log('不支援的檔案類型:', file.type);
        showNotification('請選擇圖片文件！支援 JPG, PNG, GIF, BMP 等格式', 'error');
        return;
    }

    // 檢查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('文件大小不能超過 10MB！', 'error');
        return;
    }

    console.log('檔案驗證通過，開始處理...');
    
    try {
        currentImageFile = file;
        displayImagePreview(file);
        startOcrBtn.disabled = false;
        hideResults();
        
        showNotification('文件上傳成功！', 'success');
        
        // 如果選擇顯示預處理圖片，自動顯示預處理結果
        if (showPreprocessedCheckbox && showPreprocessedCheckbox.checked) {
            setTimeout(() => {
                showPreprocessedPreview(file).catch(error => {
                    console.error('預處理預覽錯誤:', error);
                    displayImagePreview(file); // 失敗時顯示原圖
                });
            }, 100);
        }
    } catch (error) {
        console.error('處理檔案時發生錯誤:', error);
        showNotification('處理檔案時發生錯誤: ' + error.message, 'error');
    }
}

/**
 * 處理預處理選項切換
 */
function handlePreprocessToggle() {
    if (currentImageFile) {
        if (showPreprocessedCheckbox.checked) {
            showPreprocessedPreview(currentImageFile);
        } else {
            displayImagePreview(currentImageFile);
        }
    }
}

/**
 * 顯示原始圖片預覽
 */
function displayImagePreview(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        previewContainer.innerHTML = `
            <div class="image-wrapper" id="imageWrapper">
                <img src="${e.target.result}" alt="原始圖片" class="preview-image" id="previewImage">
            </div>
        `;
        previewContainer.classList.add('has-image');
        
        // 初始化區域選擇功能
        initializeSelection();
        
        // 顯示提示和控制按鈕
        selectionHint.style.display = 'inline';
        selectionControls.style.display = 'block';
        zoomControls.style.display = 'block';
        
        // 初始化模式設定
        handleModeChange();
        
        // 初始化縮放和拖拽功能
        initializeZoomAndPan();
    };
    
    reader.readAsDataURL(file);
}

/**
 * 顯示預處理後的圖片預覽
 */
async function showPreprocessedPreview(file) {
    try {
        console.log('開始預處理預覽...');
        const useAdvancedMode = advancedModeCheckbox ? advancedModeCheckbox.checked : true;
        const useBinaryMode = binaryModeCheckbox ? binaryModeCheckbox.checked : false;
        const removeTableLines = removeTableLinesCheckbox ? removeTableLinesCheckbox.checked : false;
        const processedBlob = await preprocessImage(file, useAdvancedMode, useBinaryMode, removeTableLines);
        const processedUrl = URL.createObjectURL(processedBlob);
        
        previewContainer.innerHTML = `
            <div class="image-wrapper" id="imageWrapper">
                <div class="preview-comparison">
                    <img src="${processedUrl}" alt="預處理後圖片" class="preview-image" id="previewImage">
                    <div class="preview-label">預處理後 (已優化辨識)</div>
                </div>
            </div>
        `;
        previewContainer.classList.add('has-image');
        
        // 初始化區域選擇功能
        initializeSelection();
        
        // 顯示提示和控制按鈕
        selectionHint.style.display = 'inline';
        selectionControls.style.display = 'block';
        zoomControls.style.display = 'block';
        
        // 初始化模式設定
        handleModeChange();
        
        // 初始化縮放和拖拽功能
        initializeZoomAndPan();
        
        console.log('預處理預覽完成');
    } catch (error) {
        console.error('預處理預覽錯誤:', error);
        // 回退到原始圖片預覽
        displayImagePreview(file);
    }
}

/**
 * 重置預覽區域
 */
function resetPreview() {
    previewContainer.innerHTML = `
        <div class="preview-placeholder">
            <p>請選擇圖片進行預覽</p>
        </div>
    `;
    previewContainer.classList.remove('has-image');
    currentImageFile = null;
    currentSelection = null;
    imageWrapper = null;
    startOcrBtn.disabled = true;
    hideResults();
    
    // 隱藏選擇相關元素
    selectionHint.style.display = 'none';
    selectionControls.style.display = 'none';
    zoomControls.style.display = 'none';
    updateSelectionInfo();
    
    // 重置縮放
    currentZoom = 1;
    updateZoomDisplay();
}

/**
 * 處理開始 OCR 辨識
 */
async function handleStartOCR() {
    if (!currentImageFile) {
        showNotification('請先選擇要辨識的圖片！', 'warning');
        return;
    }
    
    if (isProcessing) {
        return;
    }
    
    isProcessing = true;
    startOcrBtn.disabled = true;
    showProgress();
    hideResults();
    
    try {
        // 使用 Tesseract.js 進行 OCR
        const result = await performOCR(currentImageFile);
        const processedText = processOCRText(result.data.text);
        
        ocrResult = processedText;
        displayResults(processedText);
        showActionButtons();
        showNotification('文字辨識完成！', 'success');
        
    } catch (error) {
        console.error('OCR 處理錯誤:', error);
        showNotification('OCR 辨識過程中發生錯誤，請重試！', 'error');
    } finally {
        hideProgress();
        startOcrBtn.disabled = false;
        isProcessing = false;
    }
}

/**
 * 高精度OCR圖片預處理 - 大幅提升辨識準確度
 */
async function preprocessImage(imageInput, useAdvancedMode = true, useBinaryMode = false, removeTableLines = false) {
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 策略1: 強制放大2.5倍以提升辨識率
            const scaleFactor = 2.5; // 固定放大2.5倍
            const finalWidth = Math.round(img.width * scaleFactor);
            const finalHeight = Math.round(img.height * scaleFactor);
            
            canvas.width = finalWidth;
            canvas.height = finalHeight;
            
            // 超高質量縮放設定
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
            
            if (useAdvancedMode) {
                console.log('開始高精度圖像預處理...');
                
                // 獲取圖像數據
                const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
                const data = imageData.data;
                
                // 策略2: 增強對比度和二值化處理
                let processedData;
                if (useBinaryMode) {
                    processedData = applyPureBinarization(data);
                    console.log('套用極限二值化模式');
                } else {
                    processedData = enhanceImageForOCR(data);
                }
                
                // 應用處理結果
                for (let i = 0; i < data.length; i++) {
                    data[i] = processedData[i];
                }
                
                ctx.putImageData(imageData, 0, 0);
                
                // 策略3: 進階銳化處理 (二值化模式下跳過，避免過度處理)
                if (!useBinaryMode) {
                    applyAdvancedSharpen(ctx, finalWidth, finalHeight);
                }
                
                // 策略4: 降噪處理 (二值化模式下跳過)
                if (!useBinaryMode) {
                    applyNoiseReduction(ctx, finalWidth, finalHeight);
                }
                
                // 策略5: 表格線移除 (在最後執行，避免影響其他處理)
                if (removeTableLines) {
                    removeTableLinesFromImage(ctx, finalWidth, finalHeight);
                    console.log('表格線移除完成');
                }
                
                console.log('高精度預處理完成');
            }
            
            canvas.toBlob(resolve, 'image/png', 1.0); // 最高品質輸出
        };
        
        // 處理不同類型的輸入（File 或 Blob）
        if (imageInput instanceof Blob) {
            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
            };
            reader.readAsDataURL(imageInput);
        } else {
            // 假設是 URL
            img.src = imageInput;
        }
    });
}

/**
 * 高效的圖像增強處理 - 專為OCR優化
 */
function enhanceImageForOCR(data) {
    const enhanced = new Uint8ClampedArray(data.length);
    
    // 暫時停用黑底白字檢測，使用基礎處理
    // const hasInvertedRegions = detectInvertedTextRegions(data);
    
    for (let i = 0; i < data.length; i += 4) {
        // 轉灰階
        let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        
        // 暫時停用反色處理
        // if (hasInvertedRegions && isInInvertedRegion(data, i, gray)) {
        //     gray = 255 - gray; // 反色：黑底白字變白底黑字
        // }
        
        // 高對比度增強 - 更激進的處理
        let processed = gray;
        
        // Gamma校正強化
        processed = Math.pow(processed / 255, 0.6) * 255;
        
        // 極強對比度 - 讓文字更突出
        processed = ((processed - 128) * 2.5) + 128;
        
        // 接近二值化的處理
        if (processed > 140) {
            processed = Math.min(255, processed * 1.1); // 亮部更亮
        } else if (processed < 115) {
            processed = Math.max(0, processed * 0.7);   // 暗部更暗
        }
        
        processed = Math.max(0, Math.min(255, processed));
        
        enhanced[i] = processed;
        enhanced[i + 1] = processed;
        enhanced[i + 2] = processed;
        enhanced[i + 3] = 255; // Alpha通道
    }
    
    return enhanced;
}

/**
 * 檢測圖像中是否有黑底白字區域
 */
function detectInvertedTextRegions(data) {
    let darkRegionCount = 0;
    let brightTextInDarkCount = 0;
    const sampleSize = Math.min(10000, data.length / 16); // 採樣檢測
    
    for (let i = 0; i < data.length; i += Math.floor(data.length / sampleSize)) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        
        if (gray < 80) { // 深色背景
            darkRegionCount++;
            // 檢查周圍是否有亮色文字
            if (hasBrightNeighbors(data, i, Math.sqrt(data.length / 4))) {
                brightTextInDarkCount++;
            }
        }
    }
    
    const invertedRatio = brightTextInDarkCount / Math.max(darkRegionCount, 1);
    return invertedRatio > 0.3; // 30%以上的深色區域包含亮色文字
}

/**
 * 檢查周圍是否有亮色像素（用於檢測黑底白字）
 */
function hasBrightNeighbors(data, index, width) {
    const x = (index / 4) % width;
    const y = Math.floor((index / 4) / width);
    
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            const neighborIndex = (ny * width + nx) * 4;
            
            if (neighborIndex >= 0 && neighborIndex < data.length - 3) {
                const neighborGray = data[neighborIndex] * 0.299 + data[neighborIndex + 1] * 0.587 + data[neighborIndex + 2] * 0.114;
                if (neighborGray > 180) { // 亮色文字
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * 判斷像素是否在黑底白字區域
 */
function isInInvertedRegion(data, pixelIndex, grayValue) {
    // 簡化判斷：如果當前像素較亮且周圍有深色背景
    if (grayValue > 150) { // 亮色像素
        return true; // 在黑底白字區域中的白色文字
    }
    return false;
}

/**
 * 進階銳化處理 - 快速高效
 */
function applyAdvancedSharpen(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);
    
    // 高效銳化核心
    const kernel = [
        -1, -1, -1,
        -1,  9, -1,
        -1, -1, -1
    ];
    
    // 只處理內部像素，跳過邊緣
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sum = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const weight = kernel[(ky + 1) * 3 + (kx + 1)];
                    sum += data[idx] * weight;
                }
            }
            
            const idx = (y * width + x) * 4;
            const sharpened = Math.max(0, Math.min(255, sum));
            output[idx] = output[idx + 1] = output[idx + 2] = sharpened;
            output[idx + 3] = 255;
        }
    }
    
    // 快速邊緣複製
    for (let x = 0; x < width; x++) {
        // 上下邊緣
        for (let edge of [0, height - 1]) {
            const idx = (edge * width + x) * 4;
            output[idx] = output[idx + 1] = output[idx + 2] = data[idx];
            output[idx + 3] = 255;
        }
    }
    for (let y = 0; y < height; y++) {
        // 左右邊緣
        for (let edge of [0, width - 1]) {
            const idx = (y * width + edge) * 4;
            output[idx] = output[idx + 1] = output[idx + 2] = data[idx];
            output[idx + 3] = 255;
        }
    }
    
    ctx.putImageData(new ImageData(output, width, height), 0, 0);
}

/**
 * 快速降噪處理
 */
function applyNoiseReduction(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // 簡單中值濾波 - 只對孤立的黑點或白點進行處理
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const current = data[idx];
            
            // 檢查周圍8個像素
            const neighbors = [];
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nIdx = ((y + dy) * width + (x + dx)) * 4;
                    neighbors.push(data[nIdx]);
                }
            }
            
            // 如果當前像素與周圍像素差異很大，進行平滑
            const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
            if (Math.abs(current - avgNeighbor) > 60) {
                const smoothed = (current + avgNeighbor) / 2;
                data[idx] = data[idx + 1] = data[idx + 2] = smoothed;
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

/**
 * 極限二值化處理 - 純黑白對比
 */
function applyPureBinarization(data) {
    const binarized = new Uint8ClampedArray(data.length);
    
    // 第一步：計算整體亮度分佈來決定閾值
    const grayValues = [];
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        grayValues.push(gray);
    }
    
    // 使用Otsu算法的簡化版本來自動計算最佳閾值
    const threshold = calculateOptimalThreshold(grayValues);
    console.log('自動閾值:', threshold);
    
    // 第二步：應用極限二值化
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        
        // 極限二值化：只有純黑(0)和純白(255)
        const binaryValue = gray > threshold ? 255 : 0;
        
        binarized[i] = binaryValue;
        binarized[i + 1] = binaryValue;
        binarized[i + 2] = binaryValue;
        binarized[i + 3] = 255; // Alpha通道
    }
    
    return binarized;
}

/**
 * 計算最佳二值化閾值 (簡化版Otsu算法)
 */
function calculateOptimalThreshold(grayValues) {
    // 建立直方圖
    const histogram = new Array(256).fill(0);
    for (const gray of grayValues) {
        histogram[Math.floor(gray)]++;
    }
    
    const total = grayValues.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 0;
    
    for (let i = 0; i < 256; i++) {
        wB += histogram[i];
        if (wB === 0) continue;
        
        wF = total - wB;
        if (wF === 0) break;
        
        sumB += i * histogram[i];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        
        const varBetween = wB * wF * (mB - mF) * (mB - mF);
        
        if (varBetween > varMax) {
            varMax = varBetween;
            threshold = i;
        }
    }
    
    return threshold;
}

/**
 * 表格線和圓形框線移除功能 - 大幅提升數字辨識率
 */
function removeTableLinesFromImage(ctx, width, height) {
    console.log('開始移除表格線和圓形框線...');
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // 轉換為灰階進行線條檢測
    const grayData = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        grayData[i / 4] = gray;
    }
    
    // 檢測並移除水平線
    const horizontalLines = detectHorizontalLines(grayData, width, height);
    removeHorizontalLines(data, horizontalLines, width, height);
    
    // 檢測並移除垂直線
    const verticalLines = detectVerticalLines(grayData, width, height);
    removeVerticalLines(data, verticalLines, width, height);
    
    // 暫時停用圓形框線檢測，避免破壞數字
    // const circleFrames = detectCircleFrames(grayData, width, height);
    // removeCircleFrames(data, circleFrames, width, height);
    
    console.log(`移除了 ${horizontalLines.length} 條水平線和 ${verticalLines.length} 條垂直線`);
    
    ctx.putImageData(imageData, 0, 0);
}

/**
 * 檢測水平表格線
 */
function detectHorizontalLines(grayData, width, height) {
    const lines = [];
    const minLineLength = Math.floor(width * 0.3); // 線條至少要佔寬度的30%
    const maxGap = 5; // 允許的最大間隙
    
    for (let y = 0; y < height; y++) {
        let linePixels = [];
        let consecutiveBlack = 0;
        let gapCount = 0;
        
        for (let x = 0; x < width; x++) {
            const pixel = grayData[y * width + x];
            const isBlack = pixel < 128; // 黑色像素閾值
            
            if (isBlack) {
                consecutiveBlack++;
                if (gapCount > 0 && gapCount <= maxGap) {
                    // 填補小間隙
                    for (let gap = 1; gap <= gapCount; gap++) {
                        linePixels.push(x - gap);
                    }
                }
                linePixels.push(x);
                gapCount = 0;
            } else {
                if (consecutiveBlack > 0) {
                    gapCount++;
                }
                if (gapCount > maxGap) {
                    consecutiveBlack = 0;
                    gapCount = 0;
                    if (linePixels.length >= minLineLength) {
                        lines.push({ y: y, pixels: [...linePixels] });
                    }
                    linePixels = [];
                }
            }
        }
        
        // 檢查行末尾的線條
        if (linePixels.length >= minLineLength) {
            lines.push({ y: y, pixels: [...linePixels] });
        }
    }
    
    return lines;
}

/**
 * 檢測垂直表格線
 */
function detectVerticalLines(grayData, width, height) {
    const lines = [];
    const minLineLength = Math.floor(height * 0.3); // 線條至少要佔高度的30%
    const maxGap = 5; // 允許的最大間隙
    
    for (let x = 0; x < width; x++) {
        let linePixels = [];
        let consecutiveBlack = 0;
        let gapCount = 0;
        
        for (let y = 0; y < height; y++) {
            const pixel = grayData[y * width + x];
            const isBlack = pixel < 128; // 黑色像素閾值
            
            if (isBlack) {
                consecutiveBlack++;
                if (gapCount > 0 && gapCount <= maxGap) {
                    // 填補小間隙
                    for (let gap = 1; gap <= gapCount; gap++) {
                        linePixels.push(y - gap);
                    }
                }
                linePixels.push(y);
                gapCount = 0;
            } else {
                if (consecutiveBlack > 0) {
                    gapCount++;
                }
                if (gapCount > maxGap) {
                    consecutiveBlack = 0;
                    gapCount = 0;
                    if (linePixels.length >= minLineLength) {
                        lines.push({ x: x, pixels: [...linePixels] });
                    }
                    linePixels = [];
                }
            }
        }
        
        // 檢查列末尾的線條
        if (linePixels.length >= minLineLength) {
            lines.push({ x: x, pixels: [...linePixels] });
        }
    }
    
    return lines;
}

/**
 * 移除水平線條
 */
function removeHorizontalLines(data, lines, width, height) {
    for (const line of lines) {
        const y = line.y;
        for (const x of line.pixels) {
            const idx = (y * width + x) * 4;
            // 將線條像素設為白色
            data[idx] = 255;     // R
            data[idx + 1] = 255; // G
            data[idx + 2] = 255; // B
            // Alpha保持不變
        }
    }
}

/**
 * 移除垂直線條
 */
function removeVerticalLines(data, lines, width, height) {
    for (const line of lines) {
        const x = line.x;
        for (const y of line.pixels) {
            const idx = (y * width + x) * 4;
            // 將線條像素設為白色
            data[idx] = 255;     // R
            data[idx + 1] = 255; // G
            data[idx + 2] = 255; // B
            // Alpha保持不變
        }
    }
}

/**
 * 檢測圓形框線 - 專門處理數字圓形背景
 */
function detectCircleFrames(grayData, width, height) {
    const circles = [];
    const minRadius = 15; // 最小圓形半徑
    const maxRadius = 50; // 最大圓形半徑
    
    // 簡化版圓形檢測：找尋可能的圓心位置
    for (let y = maxRadius; y < height - maxRadius; y += 3) { // 步進採樣提高效率
        for (let x = maxRadius; x < width - maxRadius; x += 3) {
            
            // 檢測不同半徑的圓
            for (let radius = minRadius; radius <= maxRadius; radius += 2) {
                if (isLikelyCircleCenter(grayData, width, height, x, y, radius)) {
                    // 檢查是否與已存在圓形重疊
                    const overlaps = circles.some(circle => 
                        Math.sqrt(Math.pow(circle.x - x, 2) + Math.pow(circle.y - y, 2)) < circle.radius
                    );
                    
                    if (!overlaps) {
                        circles.push({ x, y, radius });
                        console.log(`檢測到圓形框線: 中心(${x},${y}) 半徑${radius}`);
                    }
                    break; // 找到一個半徑就跳出
                }
            }
        }
    }
    
    return circles;
}

/**
 * 檢查是否為圓心位置
 */
function isLikelyCircleCenter(grayData, width, height, centerX, centerY, radius) {
    const samplePoints = 16; // 採樣點數
    let borderPoints = 0;
    let innerPoints = 0;
    
    // 檢查圓周上的點
    for (let i = 0; i < samplePoints; i++) {
        const angle = (2 * Math.PI * i) / samplePoints;
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
            const pixelValue = grayData[y * width + x];
            if (pixelValue < 128) { // 黑色邊界
                borderPoints++;
            }
        }
    }
    
    // 檢查圓內部的點（較小半徑）
    const innerRadius = Math.max(5, radius - 8);
    const innerSamplePoints = 8;
    for (let i = 0; i < innerSamplePoints; i++) {
        const angle = (2 * Math.PI * i) / innerSamplePoints;
        const x = Math.round(centerX + innerRadius * Math.cos(angle));
        const y = Math.round(centerY + innerRadius * Math.sin(angle));
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
            const pixelValue = grayData[y * width + x];
            if (pixelValue > 200) { // 白色內部（黑底白字情況下內部應該是白色）
                innerPoints++;
            }
        }
    }
    
    // 判斷條件：邊界有足夠黑點，內部有足夠白點
    const borderRatio = borderPoints / samplePoints;
    const innerRatio = innerPoints / innerSamplePoints;
    
    return borderRatio > 0.6 && innerRatio > 0.5; // 60%邊界點 + 50%內部點
}

/**
 * 移除圓形框線
 */
function removeCircleFrames(data, circles, width, height) {
    for (const circle of circles) {
        const { x: centerX, y: centerY, radius } = circle;
        
        // 移除圓形邊界區域（設定為白色）
        for (let y = Math.max(0, centerY - radius - 2); y <= Math.min(height - 1, centerY + radius + 2); y++) {
            for (let x = Math.max(0, centerX - radius - 2); x <= Math.min(width - 1, centerX + radius + 2); x++) {
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                
                // 只移除圓形邊界區域（半徑±3像素的環形區域）
                if (distance >= radius - 3 && distance <= radius + 3) {
                    const idx = (y * width + x) * 4;
                    // 設為白色
                    data[idx] = 255;     // R
                    data[idx + 1] = 255; // G
                    data[idx + 2] = 255; // B
                    // Alpha保持不變
                }
            }
        }
    }
}

/**
 * 處理辨識類型變更 - 自動配置最佳參數組合
 */
function handleRecognitionTypeChange() {
    const selectedType = document.querySelector('input[name="recognitionType"]:checked')?.value || 'numbers';
    
    // 根據辨識類型自動配置技術參數
    switch (selectedType) {
        case 'numbers':
            // 純數字：最適合數字辨識的配置
            ocrModeSelect.value = 'datetime';
            languageSelect.value = 'eng';
            showPreprocessedCheckbox.checked = true;
            advancedModeCheckbox.checked = true;
            binaryModeCheckbox.checked = false;
            removeTableLinesCheckbox.checked = false;
            regionBasedOCRCheckbox.checked = false;
            break;
            
        case 'chinese':
            // 中文文字：中文優化配置
            ocrModeSelect.value = 'text';
            languageSelect.value = 'chi_tra';
            showPreprocessedCheckbox.checked = true;
            advancedModeCheckbox.checked = true;
            binaryModeCheckbox.checked = false;
            removeTableLinesCheckbox.checked = false;
            regionBasedOCRCheckbox.checked = false;
            break;
            
        case 'english':
            // 英文文字：英文優化配置
            ocrModeSelect.value = 'text';
            languageSelect.value = 'eng';
            showPreprocessedCheckbox.checked = true;
            advancedModeCheckbox.checked = true;
            binaryModeCheckbox.checked = false;
            removeTableLinesCheckbox.checked = false;
            regionBasedOCRCheckbox.checked = false;
            break;
            
        case 'datetime':
            // 時間日期：時間專用配置
            ocrModeSelect.value = 'datetime';
            languageSelect.value = 'chi_tra+eng';
            showPreprocessedCheckbox.checked = true;
            advancedModeCheckbox.checked = true;
            binaryModeCheckbox.checked = false;
            removeTableLinesCheckbox.checked = false;
            regionBasedOCRCheckbox.checked = false;
            break;
            
        case 'mixed':
            // 混合內容：綜合配置
            ocrModeSelect.value = 'text';
            languageSelect.value = 'chi_tra+eng';
            showPreprocessedCheckbox.checked = true;
            advancedModeCheckbox.checked = true;
            binaryModeCheckbox.checked = false;
            removeTableLinesCheckbox.checked = false;
            regionBasedOCRCheckbox.checked = true; // 混合內容使用分區域
            break;
    }
    
    console.log(`自動配置 ${selectedType} 辨識模式`);
}

/**
 * 處理OCR模式變更
 */
function handleModeChange() {
    const mode = ocrModeSelect.value;
    
    if (mode === 'form') {
        // 表格模式：隐藏語言選擇，固定使用繁體中文+英文
        languageGroup.style.display = 'none';
        languageSelect.value = 'chi_tra+eng';
    } else if (mode === 'datetime') {
        // 日期時間模式：隐藏語言選擇，固定使用繁體中文+英文
        languageGroup.style.display = 'none';
        languageSelect.value = 'chi_tra+eng';
    } else {
        // 純文字模式：顯示語言選擇
        languageGroup.style.display = 'flex';
    }
}

/**
 * 優化的中文OCR配置 - 專門針對繁體中文優化
 */
function getOptimizedOCRConfig(language, mode) {
    const baseConfig = {
        tessedit_ocr_engine_mode: '1',  // 使用LSTM引擎
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',  // 提高DPI
    };
    
    if (mode === 'form') {
        // 表格模式：專門優化繁體中文表格辨識
        return {
            ...baseConfig,
            tessedit_pageseg_mode: '6',  // 統一文字塊模式，適合表格
            // 中文專用設定
            textord_min_linesize: '1.25',
            textord_space_size_is_horizontal: '0',
            textord_tabfind_find_tables: '1',
            textord_tablefind_good_margins: '1',
            // 中文字符邊緣增強
            edges_max_children_per_outline: '40',
            // 降低雜訊敏感度
            tessedit_reject_mode: '0',
            tessedit_zero_rejection: '1',
            // 專門的繁體中文字符集
            tessedit_char_whitelist: '0123456789一二三四五六七八九十零百千萬億日月火水木金土年店經理助主任部課長專員星期週上下午早中晚班休息值假請ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz小大老少新舊東西南北中前後左右內外高低好壞王李張陳劉黃周吳徐孫朱胡林何郭高馬羅鄭梁謝韓唐馮董許蕭程曾彭呂蘇盧袁丁魏薛葉閻余潘杜戴夏鍾汪田任姜范方石姚譚廖鄒熊金陸郝孔白崔康毛邱秦江史顧侯邵孟龍萬段雷錢湯尹黎易常武喬賀賴龔文：:-－—_()（）[]【】/\\.,，。！？!?@#$%^&*+=<>',
        };
    } else if (mode === 'datetime') {
        // 日期時間模式：簡化配置，專注基礎辨識
        return {
            ...baseConfig,
            tessedit_pageseg_mode: '6',  // 統一文字塊模式
            // 基本數字字符集
            tessedit_char_whitelist: '0123456789',
            // 基礎設定
            tessedit_reject_mode: '0',
            tessedit_zero_rejection: '1',
        };
    } else {
        // 純文字模式：中文段落優化
        return {
            ...baseConfig,
            tessedit_pageseg_mode: language.includes('chi_') ? '4' : '3',  // 中文使用單列文字
            textord_min_linesize: language.includes('chi_') ? '1.25' : '2.5',
            textord_space_size_is_horizontal: language.includes('chi_') ? '0' : '1',
        };
    }
}

/**
 * 初始化區域選擇功能
 */
function initializeSelection() {
    imageWrapper = document.getElementById('imageWrapper');
    const previewImage = document.getElementById('previewImage');
    
    if (!imageWrapper || !previewImage) return;
    
    // 添加事件監聽器
    imageWrapper.addEventListener('mousedown', startSelection);
    imageWrapper.addEventListener('mousemove', updateSelection);
    imageWrapper.addEventListener('mouseup', endSelection);
    
    // 初始選擇全圖
    previewImage.onload = function() {
        selectAllImage();
    };
    
    // 如果圖片已經載入，直接選擇全圖
    if (previewImage.complete) {
        selectAllImage();
    }
}

/**
 * 開始選擇區域
 */
function startSelection(e) {
    if (e.target.tagName !== 'IMG') return;
    
    e.preventDefault();
    isSelecting = true;
    
    const rect = imageWrapper.getBoundingClientRect();
    selectionStart = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    
    // 清除現有選擇
    clearSelectionOverlay();
    
    // 創建新的選擇框
    createSelectionOverlay(selectionStart.x, selectionStart.y, 0, 0);
}

/**
 * 更新選擇區域
 */
function updateSelection(e) {
    if (!isSelecting || !selectionStart) return;
    
    e.preventDefault();
    const rect = imageWrapper.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const x = Math.min(selectionStart.x, currentX);
    const y = Math.min(selectionStart.y, currentY);
    const width = Math.abs(currentX - selectionStart.x);
    const height = Math.abs(currentY - selectionStart.y);
    
    updateSelectionOverlay(x, y, width, height);
}

/**
 * 結束選擇區域
 */
function endSelection(e) {
    if (!isSelecting) return;
    
    isSelecting = false;
    selectionStart = null;
    
    const overlay = imageWrapper.querySelector('.selection-overlay');
    if (overlay) {
        const previewImage = imageWrapper.querySelector('img');
        if (previewImage) {
            const baseWidth = previewImage.offsetWidth;
            const baseHeight = previewImage.offsetHeight;
            
            // 考慮縮放因子計算相對於原始圖片的選擇區域
            const scaledImageWidth = baseWidth * currentZoom;
            const scaledImageHeight = baseHeight * currentZoom;
            
            const relativeSelection = {
                x: overlay.offsetLeft / scaledImageWidth,
                y: overlay.offsetTop / scaledImageHeight,
                width: overlay.offsetWidth / scaledImageWidth,
                height: overlay.offsetHeight / scaledImageHeight
            };
            
            // 確保選擇區域有效
            if (relativeSelection.width > 0.01 && relativeSelection.height > 0.01) {
                currentSelection = relativeSelection;
                updateSelectionInfo();
            }
        }
    }
}

/**
 * 創建選擇框覆蓋層
 */
function createSelectionOverlay(x, y, width, height) {
    const overlay = document.createElement('div');
    overlay.className = 'selection-overlay';
    overlay.style.left = x + 'px';
    overlay.style.top = y + 'px';
    overlay.style.width = width + 'px';
    overlay.style.height = height + 'px';
    
    imageWrapper.appendChild(overlay);
}

/**
 * 更新選擇框覆蓋層
 */
function updateSelectionOverlay(x, y, width, height) {
    const overlay = imageWrapper.querySelector('.selection-overlay');
    if (overlay) {
        overlay.style.left = x + 'px';
        overlay.style.top = y + 'px';
        overlay.style.width = width + 'px';
        overlay.style.height = height + 'px';
    }
}

/**
 * 清除選擇框
 */
function clearSelection() {
    clearSelectionOverlay();
    currentSelection = null;
    updateSelectionInfo();
}

/**
 * 清除選擇框覆蓋層
 */
function clearSelectionOverlay() {
    if (imageWrapper) {
        const overlays = imageWrapper.querySelectorAll('.selection-overlay');
        overlays.forEach(overlay => overlay.remove());
    }
}

/**
 * 選擇全圖
 */
function selectAllImage() {
    if (!imageWrapper) return;
    
    const previewImage = imageWrapper.querySelector('img');
    if (!previewImage) return;
    
    clearSelectionOverlay();
    
    // 考慮縮放因子計算實際顯示大小
    const baseWidth = previewImage.offsetWidth;
    const baseHeight = previewImage.offsetHeight;
    const displayWidth = baseWidth * currentZoom;
    const displayHeight = baseHeight * currentZoom;
    
    // 創建覆蓋整個縮放後圖片的選擇框
    createSelectionOverlay(0, 0, displayWidth, displayHeight);
    
    currentSelection = {
        x: 0,
        y: 0,
        width: 1,
        height: 1
    };
    
    updateSelectionInfo();
}

/**
 * 更新選擇框以適應縮放
 */
function updateSelectionOverlayForZoom() {
    const overlay = imageWrapper ? imageWrapper.querySelector('.selection-overlay') : null;
    if (overlay && currentSelection) {
        const previewImage = imageWrapper.querySelector('img');
        if (previewImage) {
            // 獲取圖片的顯示尺寸（未縮放前）
            const baseWidth = previewImage.offsetWidth;
            const baseHeight = previewImage.offsetHeight;
            
            // 根據縮放比例更新選擇框大小和位置
            const scaledX = currentSelection.x * baseWidth * currentZoom;
            const scaledY = currentSelection.y * baseHeight * currentZoom;
            const scaledWidth = currentSelection.width * baseWidth * currentZoom;
            const scaledHeight = currentSelection.height * baseHeight * currentZoom;
            
            overlay.style.left = scaledX + 'px';
            overlay.style.top = scaledY + 'px';
            overlay.style.width = scaledWidth + 'px';
            overlay.style.height = scaledHeight + 'px';
        }
    }
}

/**
 * 更新選擇區域信息顯示
 */
function updateSelectionInfo() {
    if (!currentSelection) {
        selectionInfo.textContent = '無';
        startOcrBtn.disabled = true;
    } else {
        const widthPercent = Math.round(currentSelection.width * 100);
        const heightPercent = Math.round(currentSelection.height * 100);
        selectionInfo.textContent = `${widthPercent}% × ${heightPercent}%`;
        startOcrBtn.disabled = false;
    }
}

/**
 * 初始化縮放和拖拽功能
 */
function initializeZoomAndPan() {
    if (!previewContainer || !imageWrapper) return;
    
    // 重置縮放
    currentZoom = 1;
    updateZoomDisplay();
    
    // 添加拖拽事件監聽器
    previewContainer.addEventListener('mousedown', startDrag);
    previewContainer.addEventListener('mousemove', handleDrag);
    previewContainer.addEventListener('mouseup', endDrag);
    previewContainer.addEventListener('mouseleave', endDrag);
    
    // 添加滾輪縮放事件（如果有滾輪的話）
    previewContainer.addEventListener('wheel', handleWheel, { passive: false });
}

/**
 * 放大圖片
 */
function zoomIn() {
    if (currentZoom < 5) { // 最大5倍縮放
        currentZoom = Math.min(5, currentZoom * 1.25);
        applyZoom();
        updateZoomDisplay();
    }
}

/**
 * 縮小圖片
 */
function zoomOut() {
    if (currentZoom > 0.25) { // 最小0.25倍縮放
        currentZoom = Math.max(0.25, currentZoom / 1.25);
        applyZoom();
        updateZoomDisplay();
    }
}

/**
 * 重置縮放
 */
function resetZoom() {
    currentZoom = 1;
    applyZoom();
    updateZoomDisplay();
    
    // 重置滾動位置
    previewContainer.scrollLeft = 0;
    previewContainer.scrollTop = 0;
}

/**
 * 應用縮放變換
 */
function applyZoom() {
    if (imageWrapper) {
        const previewImage = imageWrapper.querySelector('img');
        if (previewImage) {
            // 只對圖片元素應用transform縮放，不改變任何容器大小
            previewImage.style.transform = `scale(${currentZoom})`;
            previewImage.style.transformOrigin = 'top left';
            
            // 不修改imageWrapper或previewContainer的尺寸
            // 讓瀏覽器的overflow: auto自動處理滾動條
            
            // 更新選擇框大小以匹配縮放後的圖片
            updateSelectionOverlayForZoom();
        }
    }
}

/**
 * 更新縮放顯示
 */
function updateZoomDisplay() {
    if (zoomLevelSpan) {
        zoomLevelSpan.textContent = Math.round(currentZoom * 100) + '%';
    }
}

/**
 * 開始拖拽
 */
function startDrag(e) {
    // 如果是在圖片上且不是在選擇區域，則開始拖拽
    if (e.target.tagName === 'IMG' && !isSelecting) {
        isDragging = true;
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
        scrollStart.x = previewContainer.scrollLeft;
        scrollStart.y = previewContainer.scrollTop;
        
        previewContainer.style.cursor = 'grabbing';
        e.preventDefault();
    }
}

/**
 * 處理拖拽
 */
function handleDrag(e) {
    if (isDragging) {
        e.preventDefault();
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        previewContainer.scrollLeft = scrollStart.x - deltaX;
        previewContainer.scrollTop = scrollStart.y - deltaY;
    }
}

/**
 * 結束拖拽
 */
function endDrag(e) {
    if (isDragging) {
        isDragging = false;
        previewContainer.style.cursor = 'grab';
    }
}

/**
 * 處理滾輪縮放
 */
function handleWheel(e) {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    }
}

/**
 * 執行 OCR 辨識 - 支援標準和分區域模式
 */
async function performOCR(imageFile) {
    const useRegionBasedOCR = regionBasedOCRCheckbox ? regionBasedOCRCheckbox.checked : false;
    
    if (useRegionBasedOCR) {
        return await performRegionBasedOCR(imageFile);
    } else {
        return await performStandardOCR(imageFile);
    }
}

/**
 * 分區域OCR辨識 - 自動切割並個別處理
 */
async function performRegionBasedOCR(imageFile) {
    try {
        console.log('開始分區域OCR辨識...');
        
        const useAdvancedMode = advancedModeCheckbox ? advancedModeCheckbox.checked : true;
        const useBinaryMode = binaryModeCheckbox ? binaryModeCheckbox.checked : false;
        const removeTableLines = removeTableLinesCheckbox ? removeTableLinesCheckbox.checked : false;
        const selectedLanguage = languageSelect.value;
        
        // 首先提取選定區域
        const selectedRegionImage = await extractSelectedRegion(imageFile);
        
        // 高精度預處理 (但先不移除表格線，用於檢測區域)
        const processedImageForDetection = await preprocessImage(selectedRegionImage, useAdvancedMode, false, false);
        
        // 檢測文字區域
        updateProgress({ status: '正在分析圖像結構...', progress: 0.1 });
        const regions = await detectTextRegions(processedImageForDetection);
        console.log(`檢測到 ${regions.length} 個文字區域`);
        
        if (regions.length === 0) {
            console.log('未檢測到文字區域，回退到標準OCR');
            return await performStandardOCR(imageFile);
        }
        
        // 對每個區域進行OCR處理
        const results = [];
        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            updateProgress({ 
                status: `正在處理第 ${i + 1}/${regions.length} 個區域...`, 
                progress: 0.2 + (i / regions.length) * 0.8 
            });
            
            // 提取並處理單個區域
            const regionImage = await extractImageRegion(selectedRegionImage, region);
            const processedRegionImage = await preprocessImage(regionImage, useAdvancedMode, useBinaryMode, removeTableLines);
            
            // 對區域進行OCR
            const ocrMode = ocrModeSelect.value;
            const ocrConfig = getOptimizedOCRConfig(selectedLanguage, ocrMode);
            
            const regionResult = await Tesseract.recognize(
                processedRegionImage,
                selectedLanguage,
                {
                    logger: function(m) { /* 靜音處理，避免過多日誌 */ },
                    ...ocrConfig
                }
            );
            
            results.push({
                region: region,
                text: regionResult.data.text.trim(),
                confidence: regionResult.data.confidence
            });
        }
        
        // 合併結果
        const combinedResult = combineRegionResults(results);
        
        return {
            data: {
                text: combinedResult,
                confidence: calculateAverageConfidence(results)
            }
        };
        
    } catch (error) {
        console.error('分區域OCR錯誤，回退到標準OCR:', error);
        return await performStandardOCR(imageFile);
    }
}

/**
 * 檢測文字區域
 */
async function detectTextRegions(imageBlob) {
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // 簡化版區域檢測：將圖片均勻分割成網格
            const gridRows = 3; // 分成3x3網格
            const gridCols = 3;
            const regions = [];
            
            const cellWidth = Math.floor(img.width / gridCols);
            const cellHeight = Math.floor(img.height / gridRows);
            
            for (let row = 0; row < gridRows; row++) {
                for (let col = 0; col < gridCols; col++) {
                    const region = {
                        x: col * cellWidth,
                        y: row * cellHeight,
                        width: col === gridCols - 1 ? img.width - col * cellWidth : cellWidth,
                        height: row === gridRows - 1 ? img.height - row * cellHeight : cellHeight,
                        row: row,
                        col: col
                    };
                    
                    // 檢查區域是否包含足夠的內容
                    if (hasSignificantContent(ctx, region)) {
                        regions.push(region);
                    }
                }
            }
            
            resolve(regions);
        };
        
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.readAsDataURL(imageBlob);
    });
}

/**
 * 檢查區域是否包含足夠的內容
 */
function hasSignificantContent(ctx, region) {
    const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
    const data = imageData.data;
    
    let blackPixelCount = 0;
    const totalPixels = region.width * region.height;
    
    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        if (gray < 200) { // 非白色像素
            blackPixelCount++;
        }
    }
    
    const contentRatio = blackPixelCount / totalPixels;
    return contentRatio > 0.05; // 至少5%的非白色像素
}

/**
 * 從圖片中提取指定區域
 */
async function extractImageRegion(imageBlob, region) {
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = region.width;
            canvas.height = region.height;
            
            ctx.drawImage(
                img,
                region.x, region.y, region.width, region.height,
                0, 0, region.width, region.height
            );
            
            canvas.toBlob(resolve, 'image/png');
        };
        
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.readAsDataURL(imageBlob);
    });
}

/**
 * 合併區域OCR結果
 */
function combineRegionResults(results) {
    // 按照位置排序 (先按行，再按列)
    results.sort((a, b) => {
        if (a.region.row !== b.region.row) {
            return a.region.row - b.region.row;
        }
        return a.region.col - b.region.col;
    });
    
    let combinedText = '';
    let currentRow = -1;
    
    for (const result of results) {
        if (result.text.trim() === '') continue;
        
        // 換行處理
        if (result.region.row !== currentRow) {
            if (combinedText !== '') {
                combinedText += '\n';
            }
            currentRow = result.region.row;
        } else {
            // 同一行內用空格或制表符分隔
            combinedText += '\t';
        }
        
        combinedText += result.text.trim();
    }
    
    return combinedText;
}

/**
 * 計算平均信心度
 */
function calculateAverageConfidence(results) {
    if (results.length === 0) return 0;
    
    const totalConfidence = results.reduce((sum, result) => sum + (result.confidence || 0), 0);
    return totalConfidence / results.length;
}

/**
 * 從圖片中提取選定區域
 */
async function extractSelectedRegion(imageFile) {
    if (!currentSelection) {
        // 如果沒有選擇區域，返回原圖
        return imageFile;
    }
    
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 計算實際選擇區域的像素坐標
            const actualX = Math.round(img.width * currentSelection.x);
            const actualY = Math.round(img.height * currentSelection.y);
            const actualWidth = Math.round(img.width * currentSelection.width);
            const actualHeight = Math.round(img.height * currentSelection.height);
            
            // 設置canvas尺寸為選擇區域大小
            canvas.width = actualWidth;
            canvas.height = actualHeight;
            
            // 繪製選擇的區域
            ctx.drawImage(
                img,
                actualX, actualY, actualWidth, actualHeight, // 源區域
                0, 0, actualWidth, actualHeight // 目標區域
            );
            
            canvas.toBlob(resolve, 'image/png');
        };
        
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.readAsDataURL(imageFile);
    });
}

/**
 * 簡化OCR辨識 - 只保留最核心功能
 */
async function performStandardOCR(imageFile) {
    try {
        const useAdvancedMode = advancedModeCheckbox ? advancedModeCheckbox.checked : true;
        const useBinaryMode = binaryModeCheckbox ? binaryModeCheckbox.checked : false;
        const removeTableLines = removeTableLinesCheckbox ? removeTableLinesCheckbox.checked : false;
        const selectedLanguage = languageSelect.value;
        
        // 首先提取選定區域
        const selectedRegionImage = await extractSelectedRegion(imageFile);
        
        // 高精度預處理
        const processedImage = await preprocessImage(selectedRegionImage, useAdvancedMode, useBinaryMode, removeTableLines);
        
        // 根據模式優化OCR配置
        const ocrMode = ocrModeSelect.value;
        const ocrConfig = getOptimizedOCRConfig(selectedLanguage, ocrMode);
        
        // 基本Tesseract辨識設定
        const result = await Tesseract.recognize(
            processedImage,
            selectedLanguage,
            {
                logger: function(m) {
                    updateProgress(m);
                },
                ...ocrConfig
            }
        );
        
        return result;
    } catch (error) {
        throw error;
    }
}

/**
 * 更新進度顯示
 */
function updateProgress(info) {
    if (info.status === 'recognizing text') {
        const progress = Math.round(info.progress * 100);
        progressFill.style.width = progress + '%';
        progressText.textContent = progress + '%';
        progressStatus.textContent = '正在辨識文字內容...';
    } else if (info.status === 'loading tesseract core') {
        progressStatus.textContent = '正在載入 OCR 引擎...';
    } else if (info.status === 'initializing tesseract') {
        progressStatus.textContent = '正在初始化...';
    } else if (info.status === 'loading language traineddata') {
        progressStatus.textContent = '正在載入語言模型...';
    } else if (info.status === 'initializing api') {
        progressStatus.textContent = '正在準備辨識...';
    }
}

/**
 * OCR文字後處理 - 根據模式優化
 */
function processOCRText(text) {
    if (!text || text.trim() === '') {
        return '未能辨識到任何文字內容。';
    }
    
    console.log('原始OCR結果:', text);
    
    const ocrMode = ocrModeSelect.value;
    
    if (ocrMode === 'form') {
        return processFormModeText(text);
    } else if (ocrMode === 'datetime') {
        return processDateTimeText(text);
    } else {
        return processGeneralText(text);
    }
}

/**
 * 表格模式文字處理 - 優化繁體中文和數字
 */
function processFormModeText(text) {
    // 基本清理
    let processedText = text
        .replace(/[|｜]/g, '|')  // 統一分隔符
        .replace(/[\s\u00A0\u200B\uFEFF]+/g, ' ')  // 清理空白
        .replace(/\n\s*\n/g, '\n')  // 移除空行
        .trim();
    
    // 表格模式特專修正
    processedText = processedText
        // 數字修正
        .replace(/[０-９]/g, match => String.fromCharCode(match.charCodeAt(0) - 0xFEE0))
        .replace(/[〇○]/g, '0')  // 中文零和圓圈
        .replace(/[lI｜]/g, '1')
        .replace(/[oO]/g, '0')
        
        // 星期修正
        .replace(/(星期|週)[ \s]*(一|二|三|四|五|六|日)/g, '星期$2')
        .replace(/(週)[ \s]*(一|二|三|四|五|六|日)/g, '星期$2')
        
        // 時間格式修正
        .replace(/(\d{1,2})\s*[：:]\s*(\d{2})/g, '$1:$2')
        .replace(/(上午|下午)\s*(\d{1,2})\s*[：:]\s*(\d{2})/g, '$1$2:$3')
        
        // 班次修正
        .replace(/(早|中|晚|夜)\s*班/g, '$1班')
        
        // 姓名常見錯誤修正
        .replace(/小\s*王/g, '小王')
        .replace(/李\s*(先生|小姐)/g, '李$1')
        
        // 移除雜訊字符
        .replace(/[`~!@#$%^&*()+=\[\]{}\\|;'"<>?]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    console.log('表格模式處理結果:', processedText);
    return processedText;
}

/**
 * 日期時間模式處理 - 專門修正數字辨識錯誤
 */
function processDateTimeText(text) {
    console.log('日期時間模式處理中...', text);
    
    // 基本清理
    let processedText = text
        .replace(/[|｜]/g, '|')  // 統一分隔符
        .replace(/[\s\u00A0\u200B\uFEFF]+/g, ' ')  // 清理空白
        .replace(/\n\s*\n/g, '\n')  // 移除空行
        .trim();
    
    // 專門的數字修正 - 針對圓形數字常見錯誤
    processedText = processedText
        // 常見數字OCR錯誤修正
        .replace(/[０-９]/g, match => String.fromCharCode(match.charCodeAt(0) - 0xFEE0)) // 全形轉半形
        .replace(/[〇○]/g, '0')  // 中文零和圓圈
        .replace(/[oO]/g, '0')   // 英文o替換為0
        .replace(/[lI｜]/g, '1') // 英文l和I替換為1
        .replace(/[S]/g, '5')    // S替換為5
        .replace(/[G]/g, '6')    // G替換為6
        .replace(/[B]/g, '8')    // B替換為8
        .replace(/[g]/g, '9')    // g替換為9
        
        // 修正圓形數字常見的符號錯誤
        .replace(/[@]/g, '0')    // @符號通常是0
        .replace(/[()（）]/g, '') // 移除括號干擾
        .replace(/[[\]【】]/g, '') // 移除方括號
        
        // 數字序列修正
        .replace(/(\d)\s+(\d)/g, '$1$2') // 移除數字間空格
        
        // 時間格式修正
        .replace(/(\d{1,2})\s*[：:]\s*(\d{2})/g, '$1:$2')
        .replace(/(上午|下午)\s*(\d{1,2})\s*[：:]\s*(\d{2})/g, '$1$2:$3')
        
        // 日期格式修正
        .replace(/(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g, '$1年$2月$3日')
        .replace(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/g, '$1/$2/$3')
        
        // 星期修正
        .replace(/(星期|週)\s*(一|二|三|四|五|六|七|日|天)/g, '星期$2')
        
        // 移除雜訊字符，但保留數字和時間相關字符
        .replace(/[`~!#$%^&*+=\[\]{}\\|;'"<>?]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    console.log('日期時間模式處理結果:', processedText);
    return processedText;
}

/**
 * 純文字模式處理
 */
function processGeneralText(text) {
    // 基本清理
    let processedText = text
        .replace(/[|｜]/g, '|')  // 統一分隔符
        .replace(/[\s\u00A0\u200B\uFEFF]+/g, ' ')  // 清理空白
        .replace(/\n\s*\n/g, '\n')  // 移除空行
        .trim();
    
    // 一般修正
    processedText = processedText
        // 全形轉半形數字
        .replace(/[０-９]/g, match => String.fromCharCode(match.charCodeAt(0) - 0xFEE0))
        // 常見OCR錯誤
        .replace(/[〇○]/g, '0')
        .replace(/[lI｜]/g, '1')
        // 時間格式修正
        .replace(/(\d{1,2})\s*[：:]\s*(\d{2})/g, '$1:$2');
    
    console.log('純文字模式處理結果:', processedText);
    return processedText;
}

/**
 * 顯示辨識結果
 */
function displayResults(processedText) {
    // 顯示編輯提示
    const editHint = document.getElementById('editHint');
    if (editHint) {
        editHint.style.display = 'flex';
    }
    
    // 創建可編輯的文字區域
    resultContainer.innerHTML = `
        <textarea class="result-textarea" id="resultTextarea" placeholder="辨識結果將顯示在此處...">${escapeHtml(processedText)}</textarea>
    `;
    
    // 更新全域變數以儲存當前結果
    ocrResult = processedText;
}

/**
 * 轉義 HTML 特殊字符
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 顯示進度條
 */
function showProgress() {
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
    progressStatus.textContent = '準備中...';
}

/**
 * 隱藏進度條
 */
function hideProgress() {
    progressContainer.style.display = 'none';
}

/**
 * 顯示操作按鈕
 */
function showActionButtons() {
    actionButtons.style.display = 'block';
}

/**
 * 隱藏結果區域
 */
function hideResults() {
    resultContainer.innerHTML = `
        <div class="result-placeholder">
            <p>辨識結果將顯示在此處</p>
        </div>
    `;
    actionButtons.style.display = 'none';
}

/**
 * 處理複製文字功能
 */
function handleCopyText() {
    // 獲取編輯後的文字內容
    const resultTextarea = document.getElementById('resultTextarea');
    const textToCopy = resultTextarea ? resultTextarea.value : ocrResult;
    
    if (!textToCopy) {
        showNotification('沒有可複製的文字！', 'warning');
        return;
    }
    
    // 使用 Clipboard API 複製文字
    navigator.clipboard.writeText(textToCopy).then(() => {
        showNotification('文字已複製到剪貼板！', 'success');
    }).catch(() => {
        // 如果 Clipboard API 不可用，使用傳統方法
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('文字已複製到剪貼板！', 'success');
    });
}

/**
 * 處理文件下載
 */
function handleDownload(format) {
    // 獲取編輯後的文字內容
    const resultTextarea = document.getElementById('resultTextarea');
    const contentToDownload = resultTextarea ? resultTextarea.value : ocrResult;
    
    if (!contentToDownload) {
        showNotification('沒有可下載的內容！', 'warning');
        return;
    }
    
    let content, filename, mimeType;
    
    if (format === 'txt') {
        content = contentToDownload;
        filename = `ocr_result_${getCurrentTimestamp()}.txt`;
        mimeType = 'text/plain;charset=utf-8';
    } else if (format === 'md') {
        let mdContent = '# OCR 辨識結果\n\n';
        mdContent += `> 辨識時間：${new Date().toLocaleString()}\n\n`;
        mdContent += `${contentToDownload}\n\n`;
        mdContent += '---\n\n*此文件由 OCR 工具自動生成*';
        
        content = mdContent;
        filename = `ocr_result_${getCurrentTimestamp()}.md`;
        mimeType = 'text/markdown;charset=utf-8';
    }
    
    // 創建下載鏈接
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification(`${format.toUpperCase()} 文件下載完成！`, 'success');
}

/**
 * 獲取當前時間戳
 */
function getCurrentTimestamp() {
    const now = new Date();
    return now.getFullYear() +
           String(now.getMonth() + 1).padStart(2, '0') +
           String(now.getDate()).padStart(2, '0') + '_' +
           String(now.getHours()).padStart(2, '0') +
           String(now.getMinutes()).padStart(2, '0') +
           String(now.getSeconds()).padStart(2, '0');
}

/**
 * 顯示通知
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // 顯示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 隱藏通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}