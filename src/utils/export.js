/**
 * ビデオエクスポート機能を提供するユーティリティ
 */

// アニメーションGIFエンコーダーへの依存を動的にインポート
let gifEncoder = null;
const loadGifEncoder = async () => {
  try {
    const module = await import('gif.js');
    return module.default || module;
  } catch (e) {
    console.error('GIFエンコーダーのロードに失敗しました:', e);
    return null;
  }
};

/**
 * アニメーションGIFのエクスポート関数
 * @param {HTMLCanvasElement} canvas - ビジュアライザーキャンバス要素
 * @param {Object} audioBuffer - オーディオバッファーデータ
 * @param {Object} settings - エクスポート設定
 * @returns {Promise<Blob>} - 生成されたGIFのBlob
 */
async function exportGIF(canvas, audioContext, audioBuffer, settings) {
  if (!gifEncoder) {
    const GIF = await loadGifEncoder();
    if (!GIF) {
      throw new Error('GIFエンコーダーをロードできませんでした');
    }
    gifEncoder = GIF;
  }

  return new Promise((resolve, reject) => {
    try {
      // キャンバスのクローンを作成（オリジナルのサイズを維持するため）
      const offscreenCanvas = document.createElement('canvas');
      const width = settings.width || 500;
      const height = settings.height || 300;
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const ctx = offscreenCanvas.getContext('2d');

      // GIFエンコーダーの初期化
      const gif = new gifEncoder({
        workers: 2,
        quality: 10,
        workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',
        width: width,
        height: height
      });

      // 完了イベントハンドラー
      gif.on('finished', (blob) => {
        resolve(blob);
      });

      // 進捗状況のイベントハンドラー
      gif.on('progress', (p) => {
        console.log(`GIF生成進捗: ${Math.round(p * 100)}%`);
      });

      // フレーム数と持続時間の計算
      const fps = settings.fps || 24;
      const duration = settings.duration || 10; // 10秒
      const totalFrames = fps * duration;
      const frameDuration = 1000 / fps; // ミリ秒単位のフレーム間隔

      // 各フレームを追加
      for (let i = 0; i < totalFrames; i++) {
        // 現在の時刻を計算（秒単位）
        const currentTime = i / fps;

        // キャンバスにオリジナルのコンテンツを描画
        ctx.drawImage(canvas, 0, 0, width, height);

        // GIFに現在のフレームを追加
        gif.addFrame(ctx, { copy: true, delay: frameDuration });
      }

      // GIF生成を開始
      gif.render();
    } catch (error) {
      reject(error);
    }
  });
}

// 動画エクスポート関数（メインの実装）
export async function exportVideoFile(audioFile, canvas, settings) {
  return new Promise((resolve, reject) => {
    try {
      // エクスポート開始を通知
      const startTime = performance.now();
      console.log('エクスポート開始:', settings);

      // 進捗表示用のモーダル（簡易版）
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-family: sans-serif;
      `;
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background-color: #1a1a2e;
        padding: 2rem;
        border-radius: 8px;
        max-width: 500px;
        width: 80%;
        text-align: center;
      `;
      const title = document.createElement('h2');
      title.textContent = 'スクリーンショット作成中...';
      title.style.marginBottom = '1rem';
      
      const progressText = document.createElement('p');
      progressText.textContent = 'キャプチャ準備中...';
      progressText.style.marginBottom = '1rem';
      
      const preview = document.createElement('div');
      preview.style.cssText = `
        width: 100%;
        height: 150px;
        background-color: black;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        overflow: hidden;
      `;
      
      // プレビュー用のキャンバスを追加
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = 300;
      previewCanvas.height = 150;
      previewCanvas.style.cssText = 'max-width: 100%; max-height: 100%;';
      preview.appendChild(previewCanvas);
      
      modalContent.appendChild(title);
      modalContent.appendChild(progressText);
      modalContent.appendChild(preview);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // キャプチャのプロセス
      const captureScreenshot = async () => {
        try {
          progressText.textContent = 'キャプチャ中...';
          
          // キャンバスの内容をコピー
          const ctx = previewCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
          
          // 高解像度のキャンバスを作成
          const exportCanvas = document.createElement('canvas');
          
          // 解像度に基づいて出力サイズを設定
          let width, height;
          switch(settings.resolution) {
            case '720p':
              width = 1280;
              height = 720;
              break;
            case '4k':
              width = 3840;
              height = 2160;
              break;
            default: // 1080p
              width = 1920;
              height = 1080;
          }
          
          exportCanvas.width = width;
          exportCanvas.height = height;
          
          // 高解像度キャンバスに描画
          const exportCtx = exportCanvas.getContext('2d');
          exportCtx.fillStyle = '#000000'; // 黒背景をデフォルトに
          exportCtx.fillRect(0, 0, width, height);
          
          // 現在のキャンバスを高解像度でコピー
          exportCtx.drawImage(canvas, 0, 0, width, height);
          
          progressText.textContent = 'スクリーンショットを保存中...';
          await new Promise(r => setTimeout(r, 500));
          
          // フォーマットを選択
          let imageType = 'image/png';
          let fileExt = 'png';
          let quality = 1;
          
          if (settings.format === 'jpeg' || settings.format === 'jpg') {
            imageType = 'image/jpeg';
            fileExt = 'jpg';
            quality = 0.9; // JPEG品質
          }
          
          // スクリーンショットのダウンロード
          const dataURL = exportCanvas.toDataURL(imageType, quality);
          const link = document.createElement('a');
          link.href = dataURL;
          
          // 現在の日付と時刻を取得してファイル名に使用
          const now = new Date();
          const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
          
          // ファイル名を設定
          link.download = `aves_audio_spectrum_${timestamp}.${fileExt}`;
          link.click();
          
          // すべて完了したら終了
          const endTime = performance.now();
          const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
          
          progressText.textContent = `完了！処理時間: ${elapsedTime}秒`;
          
          // モーダルを閉じるボタン
          const closeButton = document.createElement('button');
          closeButton.textContent = '閉じる';
          closeButton.style.cssText = `
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 0.5rem 1rem;
            cursor: pointer;
            font-size: 1rem;
            margin-top: 1rem;
          `;
          closeButton.onclick = () => {
            document.body.removeChild(modal);
            resolve();
          };
          modalContent.appendChild(closeButton);
          
        } catch (error) {
          document.body.removeChild(modal);
          reject(error);
        }
      };
      
      // キャプチャプロセスを開始
      setTimeout(captureScreenshot, 500);
      
    } catch (error) {
      reject(error);
    }
  });
}

// エクスポート用に静的なスクリーンショットを保存（簡略版）
export function saveScreenshot(canvas, filename = 'audio-visualization.png') {
  try {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
    return true;
  } catch (error) {
    console.error('スクリーンショットの保存に失敗しました:', error);
    return false;
  }
}