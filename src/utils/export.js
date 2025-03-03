/**
 * ビデオエクスポート機能を提供するユーティリティ
 */
import { createFFmpeg, fetchFile } from 'ffmpeg.wasm';
import { saveAs } from 'file-saver';

// FFmpegのロード状態を管理
let ffmpegLoaded = false;
let ffmpegInstance = null;

// FFmpegのロード
async function loadFFmpeg() {
  if (!ffmpegLoaded) {
    ffmpegInstance = createFFmpeg({
      log: false,
      corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    });
    await ffmpegInstance.load();
    ffmpegLoaded = true;
  }
  return ffmpegInstance;
}

/**
 * オーディオスペクトラム動画をエクスポートする
 * @param {File} audioFile - 入力オーディオファイル
 * @param {HTMLCanvasElement} canvas - ビジュアライザーキャンバス
 * @param {Object} settings - エクスポート設定
 * @returns {Promise<Blob>} - エクスポートしたビデオBlob
 */
export async function exportVideoFile(audioFile, canvas, settings) {
  // 進行状況を表示するためのダイアログを表示
  const dialog = document.createElement('div');
  dialog.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50';
  dialog.innerHTML = `
    <div class="bg-white rounded-lg p-8 max-w-md w-full">
      <h3 class="text-xl font-bold mb-4">ビデオを作成中...</h3>
      <div class="mb-4">
        <div class="h-2 bg-gray-200 rounded-full">
          <div id="progress-bar" class="h-full bg-secondary rounded-full" style="width: 0%"></div>
        </div>
      </div>
      <p id="progress-text" class="text-sm text-gray-600">準備中...</p>
    </div>
  `;
  document.body.appendChild(dialog);
  
  const progressBar = dialog.querySelector('#progress-bar');
  const progressText = dialog.querySelector('#progress-text');
  
  try {
    progressText.textContent = 'FFmpegを読み込み中...';
    const ffmpeg = await loadFFmpeg();
    
    // 入力ファイルの準備
    progressText.textContent = 'オーディオファイルを処理中...';
    const audioData = await fetchFile(audioFile);
    const audioName = 'input.' + audioFile.name.split('.').pop();
    ffmpeg.FS('writeFile', audioName, audioData);
    
    // フレームレート・解像度設定
    const { width, height, fps, format, videoBitrate } = settings;
    const duration = settings.duration || await getAudioDuration(audioFile);
    
    // 画像フレームを生成
    progressText.textContent = 'ビデオフレームを生成中...';
    const frameCount = Math.ceil(duration * fps);
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await decodeAudioFile(audioFile, audioContext);
    
    // オーディオデータの分析
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // オフスクリーンキャンバスの準備
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offCtx = offscreenCanvas.getContext('2d');
    
    // フレーム画像を生成・保存
    for (let i = 0; i < frameCount; i++) {
      // 進行状況の更新
      const progress = (i / frameCount) * 100;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `フレームを生成中... (${i + 1}/${frameCount})`;
      
      // 現在の時間位置を計算
      const currentTime = i / fps;
      
      // その時間位置のオーディオデータを取得
      getAudioDataAtTime(audioBuffer, currentTime, dataArray);
      
      // キャンバスを描画
      renderFrame(canvas, offscreenCanvas, dataArray, currentTime);
      
      // フレームを画像として保存
      const frameData = offscreenCanvas.toDataURL('image/jpeg', 0.9);
      const base64Data = frameData.replace(/^data:image\/jpeg;base64,/, '');
      const frameFileName = `frame${i.toString().padStart(6, '0')}.jpg`;
      ffmpeg.FS('writeFile', frameFileName, Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)));
      
      // 定期的にUIを更新させるため
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // エンコーディングコマンドを準備
    progressText.textContent = 'ビデオをエンコード中...';
    
    // フレームシーケンスからビデオ作成
    let outputFileName;
    let ffmpegCommand;
    
    if (format === 'gif') {
      outputFileName = 'output.gif';
      ffmpegCommand = [
        '-framerate', fps.toString(),
        '-i', 'frame%06d.jpg',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        outputFileName
      ];
    } else {
      // mp4またはwebm
      outputFileName = format === 'mp4' ? 'output.mp4' : 'output.webm';
      const videoCodec = format === 'mp4' ? 'libx264' : 'libvpx';
      
      ffmpegCommand = [
        '-framerate', fps.toString(),
        '-i', 'frame%06d.jpg',
        '-i', audioName,
        '-c:v', videoCodec,
        '-b:v', videoBitrate,
        '-pix_fmt', 'yuv420p',
        '-shortest',
        outputFileName
      ];
    }
    
    // FFmpegでエンコード実行
    await ffmpeg.run(...ffmpegCommand);
    
    // 出力ファイルを取得
    progressText.textContent = 'ファイルを準備中...';
    const data = ffmpeg.FS('readFile', outputFileName);
    const blob = new Blob([data.buffer], { type: format === 'mp4' ? 'video/mp4' : (format === 'webm' ? 'video/webm' : 'image/gif') });
    
    // ダウンロード
    const fileName = `audio-spectrum.${format}`;
    saveAs(blob, fileName);
    
    // テンポラリファイルの削除
    progressText.textContent = 'クリーンアップ中...';
    ffmpeg.FS('unlink', audioName);
    ffmpeg.FS('unlink', outputFileName);
    for (let i = 0; i < frameCount; i++) {
      const frameFileName = `frame${i.toString().padStart(6, '0')}.jpg`;
      try {
        ffmpeg.FS('unlink', frameFileName);
      } catch (e) {
        // ファイルが見つからなくてもエラーにしない
      }
    }
    
    return blob;
  } catch (error) {
    console.error('エクスポートエラー:', error);
    progressText.textContent = 'エラーが発生しました: ' + error.message;
    throw error;
  } finally {
    // 進行状況ダイアログを削除（少し待ってから）
    setTimeout(() => {
      document.body.removeChild(dialog);
    }, 1000);
  }
}

/**
 * オーディオファイルのデコード
 */
async function decodeAudioFile(file, audioContext) {
  const arrayBuffer = await file.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

/**
 * オーディオファイルの長さを取得
 */
async function getAudioDuration(file) {
  const audioElement = document.createElement('audio');
  audioElement.src = URL.createObjectURL(file);
  
  return new Promise((resolve) => {
    audioElement.addEventListener('loadedmetadata', () => {
      resolve(audioElement.duration);
    });
  });
}

/**
 * 特定の時間のオーディオデータを取得
 */
function getAudioDataAtTime(audioBuffer, time, dataArray) {
  // サンプルレートを取得
  const sampleRate = audioBuffer.sampleRate;
  
  // 現在の時間に対応するサンプル位置を計算
  const samplePosition = Math.floor(time * sampleRate);
  
  // バッファからのデータ取得
  const channelData = audioBuffer.getChannelData(0); // モノラルとして処理
  
  // FFTサイズ分のデータを取得
  const fftSize = dataArray.length * 2;
  const tempData = new Float32Array(fftSize);
  
  // バッファの範囲を超えないようにする
  const start = Math.max(0, samplePosition);
  const end = Math.min(channelData.length, samplePosition + fftSize);
  
  // データをコピー
  for (let i = start, j = 0; i < end; i++, j++) {
    tempData[j] = channelData[i];
  }
  
  // 周波数データに変換
  // 注: 本来はFFTを使うべきだが、簡易版として振幅を直接使用
  for (let i = 0; i < dataArray.length; i++) {
    // 周波数ビンごとの振幅を計算
    const amplitude = Math.abs(tempData[i * 2]) * 255;
    dataArray[i] = Math.min(255, Math.max(0, amplitude));
  }
}

/**
 * フレームをオフスクリーンキャンバスにレンダリング
 */
function renderFrame(sourceCanvas, targetCanvas, dataArray, currentTime) {
  const targetCtx = targetCanvas.getContext('2d');
  
  // ソースキャンバスからコピー（サイズ調整あり）
  targetCtx.drawImage(
    sourceCanvas,
    0, 0, sourceCanvas.width, sourceCanvas.height,
    0, 0, targetCanvas.width, targetCanvas.height
  );
}