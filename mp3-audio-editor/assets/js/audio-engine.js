/**
 * 音頻引擎 - 處理音頻播放、控制、編碼等核心功能
 */

// 強制停止並清理 sourceNode - 確保永遠只有一個音軌
function forceStopSourceNode() {
    console.log('執行強制停止 - sourceNode存在:', !!sourceNode, 'isPlaying:', isPlaying);
    
    if (sourceNode) {
        try {
            // 移除事件監聽器防止意外觸發
            sourceNode.onended = null;
            sourceNode.stop();
            console.log('sourceNode.stop() 成功');
        } catch (e) {
            console.warn('sourceNode 停止失敗:', e);
        }
        
        try {
            sourceNode.disconnect();
            console.log('sourceNode.disconnect() 成功');
        } catch (e) {
            console.warn('sourceNode 斷連失敗:', e);
        }
        
        sourceNode = null;
        console.log('sourceNode 已設為 null');
    }
    
    // 強制重置狀態
    isPlaying = false;
    cancelAnimationFrame(animationId);
    
    console.log('音軌清理完成 - 確保只有一個音軌');
}

// 播放音訊
function playAudio(offset = startOffset) {
    if (!audioBuffer) return;

    // 1. 先檢查並強制停止舊的 sourceNode
    forceStopSourceNode();
    
    try {
        // 2. 建立新的 AudioBufferSourceNode
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(gainNode);
        
        // 3. 從正確的 offset 開始播放
        sourceNode.start(0, offset);
        
        // 4. 記錄開始時間和偏移
        startTime = audioContext.currentTime;
        startOffset = offset;
        isPlaying = true;
        
        // 5. 更新按鈕狀態
        playBtn.disabled = true;
        pauseBtn.disabled = false;
        rewindBtn.disabled = false;
        forwardBtn.disabled = false;
        
        // 6. 開始更新進度
        updateProgress();
        
        // 7. 播放結束時的處理
        sourceNode.onended = () => {
            if (isPlaying && sourceNode) {
                isPlaying = false;
                playBtn.disabled = false;
                pauseBtn.disabled = true;
                sourceNode = null;
                cancelAnimationFrame(animationId);
            }
        };
    } catch (error) {
        console.error('播放錯誤:', error);
        forceStopSourceNode();
        showError('播放失敗，請稍後再試！');
    }
}

// 預覽播放 - 帶即時淡入淡出效果
function playAudioWithFade(offset, fadeInDuration = 0, fadeOutDuration = 0, endTime = null) {
    if (!audioBuffer) return;

    console.log(`預覽播放: 從${offset}s, 淡入${fadeInDuration}s, 淡出${fadeOutDuration}s`);

    // 1. 先檢查並強制停止舊的 sourceNode
    forceStopSourceNode();
    
    try {
        // 2. 建立新的 AudioBufferSourceNode
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(gainNode);
        
        // 3. 設定淡入效果
        if (fadeInDuration > 0) {
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(
                parseFloat(volumeSlider.value) / 100, 
                audioContext.currentTime + fadeInDuration
            );
        } else {
            gainNode.gain.setValueAtTime(parseFloat(volumeSlider.value) / 100, audioContext.currentTime);
        }
        
        // 4. 設定淡出效果
        if (fadeOutDuration > 0 && endTime) {
            const fadeOutStartTime = audioContext.currentTime + (endTime - offset) - fadeOutDuration;
            if (fadeOutStartTime > audioContext.currentTime) {
                gainNode.gain.setValueAtTime(
                    parseFloat(volumeSlider.value) / 100, 
                    fadeOutStartTime
                );
                gainNode.gain.linearRampToValueAtTime(0, fadeOutStartTime + fadeOutDuration);
            }
        }
        
        // 5. 從正確的 offset 開始播放
        sourceNode.start(0, offset);
        
        // 6. 記錄開始時間和偏移
        startTime = audioContext.currentTime;
        startOffset = offset;
        isPlaying = true;
        
        // 7. 更新按鈕狀態
        playBtn.disabled = true;
        pauseBtn.disabled = false;
        rewindBtn.disabled = false;
        forwardBtn.disabled = false;
        
        // 8. 開始更新進度
        updateProgress();
        
        // 9. 播放結束時的處理
        sourceNode.onended = () => {
            if (isPlaying && sourceNode) {
                isPlaying = false;
                playBtn.disabled = false;
                pauseBtn.disabled = true;
                sourceNode = null;
                // 恢復原始音量
                gainNode.gain.setValueAtTime(parseFloat(volumeSlider.value) / 100, audioContext.currentTime);
                cancelAnimationFrame(animationId);
            }
        };
    } catch (error) {
        console.error('預覽播放錯誤:', error);
        forceStopSourceNode();
        showError('預覽播放失敗，請稍後再試！');
    }
}

// 暫停音訊 - 強制停止所有音軌
function pauseAudio() {
    // 1. 無論什麼狀態，都強制停止所有音軌
    if (isPlaying && sourceNode) {
        // 計算當前播放位置
        startOffset += audioContext.currentTime - startTime;
    }
    
    // 2. 清除預覽模式
    previewEndTime = null;
    fadeInTime = 0;
    fadeOutTime = 0;
    previewStartTime = 0;
    
    // 3. 恢復正常音量
    if (gainNode) {
        gainNode.gain.cancelScheduledValues(audioContext.currentTime);
        gainNode.gain.setValueAtTime(parseFloat(volumeSlider.value) / 100, audioContext.currentTime);
    }
    
    // 4. 強制停止並清理
    forceStopSourceNode();
    
    // 5. 確保狀態正確
    isPlaying = false;
    
    // 6. 更新按鈕狀態
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    rewindBtn.disabled = false;
    forwardBtn.disabled = false;
    
    console.log('暫停完成 - 所有音軌已停止，音量已恢復');
}

// 停止音訊
function stopAudio() {
    // 1. 清除預覽模式
    previewEndTime = null;
    
    // 2. 強制停止 sourceNode
    forceStopSourceNode();
    
    // 3. 重置播放位置
    startOffset = 0;
    startTime = 0;
    
    // 4. 更新按鈕狀態
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    rewindBtn.disabled = false;
    forwardBtn.disabled = false;
    
    // 5. 重置UI顯示
    progressBar.value = 0;
    currentTime.textContent = '00:00';
    
    // 6. 重繪波形（移除播放指示線）
    if (waveformData) {
        drawWaveform(waveformData, 0);
    }
}

// 更新播放進度
function updateProgress() {
    if (!isPlaying || !audioBuffer) return;
    
    const elapsed = audioContext.currentTime - startTime + startOffset;
    const progress = elapsed / audioBuffer.duration;
    progressBar.value = progress * 100;
    currentTime.textContent = formatTime(elapsed);
    
    // 更新波形顯示
    if (waveformData) {
        drawWaveform(waveformData, progress);
    }
    
    // 檢查是否到達預覽結束時間
    if (previewEndTime !== null && elapsed >= previewEndTime) {
        console.log('預覽到達結束時間，自動暫停');
        previewEndTime = null; // 清除預覽模式
        pauseAudio();
        return;
    }
    
    if (elapsed < audioBuffer.duration && isPlaying) {
        animationId = requestAnimationFrame(updateProgress);
    }
}