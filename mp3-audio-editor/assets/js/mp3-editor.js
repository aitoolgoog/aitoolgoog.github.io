/**
 * MP3 播放剪輯工具 - 主要功能腳本
 * 功能包括：音頻播放、剪輯、淡入淡出、波形可視化、MP3/WAV導出
 */

// 全域變數
let audioContext;
let audioBuffer;
let sourceNode;
let gainNode;
let isPlaying = false;
let startOffset = 0; // 當前播放偏移（秒）
let startTime = 0;   // 開始播放的時間（context 時間）
let animationId;
let waveformData = null;
let previewEndTime = null; // 預覽模式的結束時間
let fadeInTime = 0; // 預覽淡入時間
let fadeOutTime = 0; // 預覽淡出時間
let previewStartTime = 0; // 預覽開始時間

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const audioFile = document.getElementById('audioFile');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileDuration = document.getElementById('fileDuration');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

const playerSection = document.getElementById('playerSection');
const trimSection = document.getElementById('trimSection');
const downloadSection = document.getElementById('downloadSection');

const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const rewindBtn = document.getElementById('rewindBtn');
const forwardBtn = document.getElementById('forwardBtn');
const progressBar = document.getElementById('progressBar');
const currentTime = document.getElementById('currentTime');
const totalTime = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');

const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const fadeInTimeInput = document.getElementById('fadeInTime');
const fadeOutTimeInput = document.getElementById('fadeOutTime');
const previewBtn = document.getElementById('previewBtn');
const resetBtn = document.getElementById('resetBtn');
const setStartBtn = document.getElementById('setStartBtn');
const setEndBtn = document.getElementById('setEndBtn');
const downloadWavBtn = document.getElementById('downloadWavBtn');
const downloadMp3Btn = document.getElementById('downloadMp3Btn');
const waveformCanvas = document.getElementById('waveform');

// 初始化 AudioContext
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = 0.5; // 預設音量 50%
    }
}

// 檢查 LameJS 庫加載狀態
function checkLameJS() {
    if (typeof lamejs === 'undefined') {
        console.warn('LameJS 庫未加載，MP3功能將不可用');
        return false;
    } else {
        console.log('LameJS 庫已加載，支援MP3編碼');
        return true;
    }
}

// 頁面加載完成後檢查
window.addEventListener('load', () => {
    setTimeout(checkLameJS, 1000); // 延遲檢查確保庫已加載
});

// 格式化時間
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 顯示錯誤訊息
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// 顯示成功訊息
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
}

// 生成波形數據
function generateWaveformData(buffer, width = 720) {
    const channelData = buffer.getChannelData(0); // 使用第一個聲道
    const samplesPerPixel = Math.floor(channelData.length / width);
    const waveform = new Array(width);
    
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        
        for (let j = 0; j < samplesPerPixel; j++) {
            const sample = channelData[i * samplesPerPixel + j] || 0;
            if (sample < min) min = sample;
            if (sample > max) max = sample;
        }
        
        waveform[i] = { min, max };
    }
    
    return waveform;
}

// 繪製波形
function drawWaveform(waveform, currentProgress = 0) {
    if (!waveformCanvas) return;
    
    const canvas = waveformCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    
    // 清除畫布
    ctx.clearRect(0, 0, width, height);
    
    // 繪製背景波形（灰色）
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let i = 0; i < waveform.length; i++) {
        const x = (i / waveform.length) * width;
        const yMin = centerY + (waveform[i].min * centerY * 0.8);
        const yMax = centerY + (waveform[i].max * centerY * 0.8);
        
        ctx.moveTo(x, yMin);
        ctx.lineTo(x, yMax);
    }
    ctx.stroke();
    
    // 繪製已播放部分（藍色）
    const playedWidth = width * currentProgress;
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < waveform.length && (i / waveform.length) * width <= playedWidth; i++) {
        const x = (i / waveform.length) * width;
        const yMin = centerY + (waveform[i].min * centerY * 0.8);
        const yMax = centerY + (waveform[i].max * centerY * 0.8);
        
        ctx.moveTo(x, yMin);
        ctx.lineTo(x, yMax);
    }
    ctx.stroke();
    
    // 繪製播放位置指示線
    if (currentProgress > 0) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playedWidth, 0);
        ctx.lineTo(playedWidth, height);
        ctx.stroke();
    }
}

// 音頻處理和播放相關函數將在下一部分定義...