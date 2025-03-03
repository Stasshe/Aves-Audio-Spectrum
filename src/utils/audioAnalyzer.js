/**
 * オーディオ解析のためのユーティリティ関数
 */

/**
 * AudioAnalyzerインスタンスを作成する
 * @param {AudioContext} audioContext - オーディオコンテキスト
 * @param {HTMLMediaElement} mediaElement - オーディオ要素
 * @param {Object} options - 設定オプション
 * @returns {Object} - 解析インスタンス
 */
export function createAudioAnalyzer(audioContext, mediaElement, options = {}) {
  // デフォルト設定
  const settings = {
    fftSize: options.fftSize || 2048,
    smoothingTimeConstant: options.smoothingTimeConstant || 0.8,
    minDecibels: options.minDecibels || -100,
    maxDecibels: options.maxDecibels || -30
  };
  
  // 分析器の作成
  const analyzer = audioContext.createAnalyser();
  analyzer.fftSize = settings.fftSize;
  analyzer.smoothingTimeConstant = settings.smoothingTimeConstant;
  analyzer.minDecibels = settings.minDecibels;
  analyzer.maxDecibels = settings.maxDecibels;
  
  // メディア要素をソースとして接続
  const source = audioContext.createMediaElementSource(mediaElement);
  source.connect(analyzer);
  analyzer.connect(audioContext.destination);
  
  // データバッファの作成
  const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
  const timeData = new Uint8Array(analyzer.fftSize);
  
  // 設定を更新する関数
  const updateSettings = (newSettings = {}) => {
    if (newSettings.fftSize !== undefined) {
      analyzer.fftSize = newSettings.fftSize;
    }
    if (newSettings.smoothingTimeConstant !== undefined) {
      analyzer.smoothingTimeConstant = newSettings.smoothingTimeConstant;
    }
    if (newSettings.minDecibels !== undefined) {
      analyzer.minDecibels = newSettings.minDecibels;
    }
    if (newSettings.maxDecibels !== undefined) {
      analyzer.maxDecibels = newSettings.maxDecibels;
    }
  };
  
  // 周波数データを取得する関数
  const getFrequencyData = () => {
    analyzer.getByteFrequencyData(frequencyData);
    return frequencyData;
  };
  
  // 波形データを取得する関数
  const getTimeData = () => {
    analyzer.getByteTimeDomainData(timeData);
    return timeData;
  };
  
  // 特定の周波数帯域のエネルギーを取得する関数
  const getFrequencyRangeValue = (startFreq, endFreq) => {
    analyzer.getByteFrequencyData(frequencyData);
    
    const nyquist = audioContext.sampleRate / 2;
    const startIndex = Math.round(startFreq / nyquist * frequencyData.length);
    const endIndex = Math.round(endFreq / nyquist * frequencyData.length);
    
    let total = 0;
    let count = 0;
    
    for (let i = startIndex; i <= endIndex; i++) {
      total += frequencyData[i];
      count++;
    }
    
    return count > 0 ? total / count / 255 : 0;
  };
  
  // イコライザーセットアップ（バンドパスフィルタを使用）
  const setupEqualizer = (bands) => {
    // 既存のフィルターを取得
    const filters = analyzer._eqFilters || [];
    
    // 既存のフィルターを切断
    if (filters.length > 0) {
      source.disconnect();
      source.connect(analyzer);
      filters.forEach(filter => {
        filter.disconnect();
      });
    }
    
    // バンド数に合わせてフィルターを作成
    const newFilters = bands.map(band => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'peaking';  // ピーキングフィルター（EQバンド）
      filter.frequency.value = band.frequency;
      filter.Q.value = 1.0;    // Q値（帯域幅）
      filter.gain.value = band.gain || 0;
      return filter;
    });
    
    // フィルターを直列に接続
    if (newFilters.length > 0) {
      source.disconnect();
      source.connect(newFilters[0]);
      
      for (let i = 0; i < newFilters.length - 1; i++) {
        newFilters[i].connect(newFilters[i + 1]);
      }
      
      newFilters[newFilters.length - 1].connect(analyzer);
    }
    
    // フィルター参照を保存
    analyzer._eqFilters = newFilters;
    return newFilters;
  };
  
  // イコライザーのゲイン調整
  const updateEqualizerGains = (gains) => {
    if (!analyzer._eqFilters) return;
    
    analyzer._eqFilters.forEach((filter, index) => {
      if (gains[index] !== undefined) {
        filter.gain.value = gains[index];
      }
    });
  };
  
  // リソースのクリーンアップ
  const destroy = () => {
    if (analyzer._eqFilters) {
      analyzer._eqFilters.forEach(filter => {
        filter.disconnect();
      });
    }
    source.disconnect();
    analyzer.disconnect();
  };
  
  // 公開API
  return {
    analyzer,
    source,
    getFrequencyData,
    getTimeData,
    getFrequencyRangeValue,
    updateSettings,
    setupEqualizer,
    updateEqualizerGains,
    destroy
  };
}

/**
 * オーディオファイルのデコードと長さ取得
 * @param {Blob} audioFile - オーディオファイル
 * @returns {Promise<Object>} - オーディオ情報
 */
export function getAudioFileInfo(audioFile) {
  return new Promise((resolve, reject) => {
    try {
      // AudioContextを作成
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // ファイルをArrayBufferに変換
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          // オーディオをデコード
          const arrayBuffer = event.target.result;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // 基本情報を抽出
          const info = {
            duration: audioBuffer.duration,
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels
          };
          
          // AudioContextを解放
          audioContext.close();
          
          resolve(info);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsArrayBuffer(audioFile);
    } catch (error) {
      reject(error);
    }
  });
}
