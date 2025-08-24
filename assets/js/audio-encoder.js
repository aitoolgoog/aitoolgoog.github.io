/**
 * 音頻編碼器 - 處理 WAV 和 MP3 編碼導出
 */

// 將 AudioBuffer 轉換為 WAV Blob
function audioBufferToWav(buffer) {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    console.log(`轉換WAV: 長度=${length}, 聲道=${numberOfChannels}, 採樣率=${sampleRate}`);
    
    // WAV 檔案標頭
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // 音訊資料 - 修復音頻數據轉換
    let offset = 44;
    let maxSample = 0;
    
    if (numberOfChannels === 1) {
        // 單聲道
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            maxSample = Math.max(maxSample, Math.abs(sample));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, intSample, true);
            offset += 2;
        }
    } else {
        // 多聲道 - 交錯排列
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                maxSample = Math.max(maxSample, Math.abs(sample));
                const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, intSample, true);
                offset += 2;
            }
        }
    }
    
    console.log(`WAV轉換完成: 最大音頻值=${maxSample.toFixed(4)}`);
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// 應用淡入淡出效果
function applyFadeEffect(buffer, fadeInDuration, fadeOutDuration) {
    const sampleRate = buffer.sampleRate;
    const fadeInSamples = Math.floor(fadeInDuration * sampleRate);
    const fadeOutSamples = Math.floor(fadeOutDuration * sampleRate);
    const totalSamples = buffer.length;
    
    console.log(`應用淡入淡出: 淡入${fadeInSamples}樣本, 淡出${fadeOutSamples}樣本, 總長${totalSamples}樣本`);
    
    // 創建一個新的buffer副本
    const newBuffer = audioContext.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
    );
    
    let maxOriginal = 0;
    let maxProcessed = 0;
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const originalData = buffer.getChannelData(channel);
        const newData = newBuffer.getChannelData(channel);
        
        for (let i = 0; i < totalSamples; i++) {
            let sample = originalData[i];
            maxOriginal = Math.max(maxOriginal, Math.abs(sample));
            
            // 淡入效果
            if (i < fadeInSamples && fadeInSamples > 0) {
                const fadeInGain = i / fadeInSamples;
                sample *= fadeInGain;
            }
            
            // 淡出效果
            if (i >= (totalSamples - fadeOutSamples) && fadeOutSamples > 0) {
                const fadeOutGain = (totalSamples - i) / fadeOutSamples;
                sample *= fadeOutGain;
            }
            
            newData[i] = sample;
            maxProcessed = Math.max(maxProcessed, Math.abs(sample));
        }
    }
    
    console.log(`淡入淡出處理完成: 原始最大值=${maxOriginal.toFixed(4)}, 處理後最大值=${maxProcessed.toFixed(4)}`);
    
    return newBuffer;
}

// 將 AudioBuffer 轉換為 MP3 Blob - 320kbps 高音質
function audioBufferToMp3(buffer) {
    if (typeof lamejs === 'undefined') {
        console.warn('LameJS 未加載，將使用 WAV 格式');
        return audioBufferToWav(buffer);
    }
    
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    const length = buffer.length;
    
    console.log(`MP3編碼開始: 採樣率=${sampleRate}, 聲道=${channels}, 長度=${length}, 320kbps`);
    
    // 初始化 LAME 編碼器 - 320kbps 高音質
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 320);
    const mp3Data = [];
    
    // 處理音頻數據
    const sampleBlockSize = 1152;
    let totalSamples = 0;
    
    if (channels === 1) {
        // 單聲道處理
        const channelData = buffer.getChannelData(0);
        let maxSample = 0;
        
        for (let i = 0; i < length; i += sampleBlockSize) {
            const blockSize = Math.min(sampleBlockSize, length - i);
            const samples = new Int16Array(blockSize);
            
            for (let j = 0; j < blockSize; j++) {
                const sample = channelData[i + j];
                maxSample = Math.max(maxSample, Math.abs(sample));
                // 轉換為 16 位整數，防止削峰
                samples[j] = Math.round(Math.max(-1, Math.min(1, sample)) * 32767);
            }
            
            const mp3buf = mp3encoder.encodeBuffer(samples);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
                totalSamples += blockSize;
            }
        }
        
        console.log(`單聲道編碼: 最大樣本=${maxSample.toFixed(4)}, 處理樣本=${totalSamples}`);
        
    } else {
        // 立體聲處理
        const leftData = buffer.getChannelData(0);
        const rightData = buffer.getChannelData(1);
        let maxSampleL = 0, maxSampleR = 0;
        
        for (let i = 0; i < length; i += sampleBlockSize) {
            const blockSize = Math.min(sampleBlockSize, length - i);
            const leftSamples = new Int16Array(blockSize);
            const rightSamples = new Int16Array(blockSize);
            
            for (let j = 0; j < blockSize; j++) {
                const leftSample = leftData[i + j];
                const rightSample = rightData[i + j];
                
                maxSampleL = Math.max(maxSampleL, Math.abs(leftSample));
                maxSampleR = Math.max(maxSampleR, Math.abs(rightSample));
                
                // 轉換為 16 位整數，防止削峰
                leftSamples[j] = Math.round(Math.max(-1, Math.min(1, leftSample)) * 32767);
                rightSamples[j] = Math.round(Math.max(-1, Math.min(1, rightSample)) * 32767);
            }
            
            const mp3buf = mp3encoder.encodeBuffer(leftSamples, rightSamples);
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
                totalSamples += blockSize;
            }
        }
        
        console.log(`立體聲編碼: 左聲道最大=${maxSampleL.toFixed(4)}, 右聲道最大=${maxSampleR.toFixed(4)}, 處理樣本=${totalSamples}`);
    }
    
    // 完成編碼
    const finalBuf = mp3encoder.flush();
    if (finalBuf.length > 0) {
        mp3Data.push(finalBuf);
    }
    
    console.log(`MP3編碼完成: 生成${mp3Data.length}個數據塊`);
    
    // 檢查是否有有效數據
    const totalBytes = mp3Data.reduce((sum, buf) => sum + buf.length, 0);
    console.log(`MP3總大小: ${totalBytes} bytes`);
    
    if (totalBytes === 0) {
        console.error('MP3編碼失敗：沒有生成有效數據');
        showError('MP3編碼失敗，請嘗試WAV格式');
        return audioBufferToWav(buffer);
    }
    
    // 創建 MP3 Blob
    return new Blob(mp3Data, { type: 'audio/mpeg' });
}