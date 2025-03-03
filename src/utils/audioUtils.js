/**
 * オーディオ関連のユーティリティ関数
 */

/**
 * 時間を「分:秒」形式にフォーマット
 * @param {number} seconds - 秒数
 * @returns {string} - フォーマットされた時間文字列
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

/**
 * ファイルサイズを読みやすい形式にフォーマット
 * @param {number} bytes - バイト数
 * @returns {string} - フォーマットされたファイルサイズ
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1048576) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1073741824) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  } else {
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  }
}

/**
 * 周波数を適切な単位でフォーマット
 * @param {number} hz - ヘルツ値
 * @returns {string} - フォーマットされた周波数
 */
export function formatFrequency(hz) {
  if (hz < 1000) {
    return `${hz} Hz`;
  } else {
    return `${(hz / 1000).toFixed(1)} kHz`;
  }
}

/**
 * ファイル形式がサポートされているかチェック
 * @param {File} file - ファイルオブジェクト
 * @returns {boolean} - サポートされているか
 */
export function isSupportedAudioFormat(file) {
  // MIME タイプによるチェック
  const supportedMimeTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/ogg', 'audio/aac', 'audio/flac', 'audio/mp4', 'audio/x-m4a'
  ];
  
  if (supportedMimeTypes.includes(file.type)) {
    return true;
  }
  
  // 拡張子によるチェック（MIMEタイプが信頼できない場合）
  const fileName = file.name.toLowerCase();
  const supportedExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.opus', '.webm'];
  
  return supportedExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * iOSデバイスかどうかを検出
 * @returns {boolean} - iOSデバイスならtrue
 */
export function isIOSDevice() {
  return [
    'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
    'iPad', 'iPhone', 'iPod'
  ].includes(navigator.platform) || 
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
}

/**
 * オーディオコンテキストを安全に作成（ブラウザ互換性対応）
 * @returns {AudioContext|null} - オーディオコンテキスト
 */
export function createSafeAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  
  if (!AudioContextClass) {
    console.error('このブラウザはWeb Audio APIをサポートしていません');
    return null;
  }
  
  try {
    return new AudioContextClass({
      // iOSでのパフォーマンス向上のためのオプション
      latencyHint: 'interactive',
      sampleRate: 44100
    });
  } catch (error) {
    console.error('オーディオコンテキストの作成に失敗しました:', error);
    return null;
  }
}

/**
 * 新しいオーディオバッファソースを作成し接続
 * @param {AudioContext} audioContext - オーディオコンテキスト
 * @param {AudioBuffer} buffer - オーディオバッファ
 * @param {AudioNode} destination - 接続先ノード
 * @param {number} offset - 開始位置（秒）
 * @returns {AudioBufferSourceNode} - ソースノード
 */
export function createAndConnectSource(audioContext, buffer, destination, offset = 0) {
  if (!audioContext || !buffer || !destination) {
    throw new Error('必要なパラメータが不足しています');
  }
  
  // 新しいソースノードを作成
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  
  // 接続先に接続
  source.connect(destination);
  
  // 指定したオフセットから再生開始
  source.start(0, offset);
  
  return source;
}

/**
 * ブラウザのオーディオ再生互換性をチェック
 * @returns {Object} - サポート状況の詳細
 */
export function checkAudioSupport() {
  const support = {
    webAudio: !!window.AudioContext || !!window.webkitAudioContext,
    audioElement: !!document.createElement('audio').canPlayType,
    formats: {
      mp3: false,
      wav: false,
      ogg: false,
      aac: false,
      flac: false
    }
  };
  
  // オーディオ要素による形式サポートチェック
  if (support.audioElement) {
    const audio = document.createElement('audio');
    support.formats.mp3 = audio.canPlayType('audio/mpeg;').replace(/^no$/, '');
    support.formats.wav = audio.canPlayType('audio/wav; codecs="1"').replace(/^no$/, '');
    support.formats.ogg = audio.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, '');
    support.formats.aac = audio.canPlayType('audio/aac;').replace(/^no$/, '');
    support.formats.flac = audio.canPlayType('audio/flac;').replace(/^no$/, '');
  }
  
  return support;
}

/**
 * オーディオバッファのピークレベルを取得
 * @param {AudioBuffer} audioBuffer - オーディオバッファ
 * @returns {number} - ピークレベル（0～1）
 */
export function getAudioPeakLevel(audioBuffer) {
  if (!audioBuffer || audioBuffer.numberOfChannels === 0) {
    return 0;
  }
  
  let peak = 0;
  
  // 全チャンネルの最大振幅を検出
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    
    for (let i = 0; i < channelData.length; i++) {
      const absValue = Math.abs(channelData[i]);
      if (absValue > peak) {
        peak = absValue;
      }
    }
  }
  
  return peak;
}

/**
 * オーディオバッファをノーマライズ（最大音量に調整）
 * @param {AudioContext} audioContext - オーディオコンテキスト
 * @param {AudioBuffer} sourceBuffer - 元のバッファ
 * @param {number} targetPeak - 目標ピークレベル（0～1）
 * @returns {AudioBuffer} - ノーマライズされたバッファ
 */
export async function normalizeAudioBuffer(audioContext, sourceBuffer, targetPeak = 0.95) {
  if (!audioContext || !sourceBuffer) {
    throw new Error('無効なパラメータ');
  }
  
  // 現在のピークレベルを取得
  const currentPeak = getAudioPeakLevel(sourceBuffer);
  
  if (currentPeak <= 0) {
    return sourceBuffer; // ピークがないか、無音の場合は元のバッファを返す
  }
  
  // スケーリング係数を計算
  const scaleFactor = targetPeak / currentPeak;
  
  // 新しいバッファを作成
  const normalizedBuffer = audioContext.createBuffer(
    sourceBuffer.numberOfChannels,
    sourceBuffer.length,
    sourceBuffer.sampleRate
  );
  
  // 各チャンネルをスケーリング
  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel++) {
    const sourceData = sourceBuffer.getChannelData(channel);
    const newData = normalizedBuffer.getChannelData(channel);
    
    for (let i = 0; i < sourceData.length; i++) {
      newData[i] = sourceData[i] * scaleFactor;
    }
  }
  
  return normalizedBuffer;
}

/**
 * iOSでのオーディオ再生をロック解除
 * @returns {Promise<boolean>} - 成功ならtrue
 */
export async function unlockAudioForIOS() {
  if (!isIOSDevice()) {
    return true; // iOS以外ではすでにロック解除済み
  }
  
  const audioContext = createSafeAudioContext();
  if (!audioContext) return false;
  
  return new Promise(resolve => {
    // ユーザー操作を待つ（イベントを一時的に設定）
    const unlockHandler = () => {
      // 無音を再生して初期化
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      
      // クリーンアップ
      document.removeEventListener('touchstart', unlockHandler);
      document.removeEventListener('touchend', unlockHandler);
      document.removeEventListener('click', unlockHandler);
      
      // 成功
      resolve(true);
    };
    
    // タッチおよびクリックイベントを監視
    document.addEventListener('touchstart', unlockHandler);
    document.addEventListener('touchend', unlockHandler);
    document.addEventListener('click', unlockHandler);
    
    // 10秒後にタイムアウト
    setTimeout(() => {
      document.removeEventListener('touchstart', unlockHandler);
      document.removeEventListener('touchend', unlockHandler);
      document.removeEventListener('click', unlockHandler);
      resolve(false);
    }, 10000);
  });
}
