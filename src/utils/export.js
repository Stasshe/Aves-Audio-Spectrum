/**
 * ビデオエクスポート機能を提供するユーティリティ
 */
import { saveAs } from 'file-saver';

/**
 * 完全なビデオエクスポート関数
 * @param {Blob} audioFile - オーディオファイル
 * @param {HTMLCanvasElement} canvas - ビジュアライザーキャンバス
 * @param {Object} settings - エクスポート設定
 * @param {Object} visualizer - ビジュアライザーオブジェクト
 * @param {AudioContext} audioContext - オーディオコンテキスト
 * @returns {Promise<Blob|void>}
 */
export async function exportVideoFile(audioFile, canvas, settings, visualizer, audioContext) {
  return new Promise(async (resolve, reject) => {
    try {
      // エクスポート開始を通知
      const startTime = performance.now();
      console.log('エクスポート開始:', settings);
      
      // 正確な解像度設定
      const resolutions = {
        '720p': { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
        '4k': { width: 3840, height: 2160 }
      };
      
      // 解像度設定を取得
      const resolution = resolutions[settings.resolution] || resolutions['1080p'];
      const targetWidth = resolution.width;
      const targetHeight = resolution.height;
      
      // モーダル要素を生成
      const { modal, modalContent, progressBar, progressText, previewCanvas } = createSimpleExportModal();
      document.body.appendChild(modal);
      
      // オフスクリーンキャンバスの設定
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = targetWidth;
      offscreenCanvas.height = targetHeight;
      const ctx = offscreenCanvas.getContext('2d');
      
      // プレビューキャンバスの初期化
      const previewCtx = previewCanvas.getContext('2d');
      previewCanvas.width = 320;
      previewCanvas.height = 180;
      
      try {
        // MediaRecorderがサポートされているかどうかをチェック
        if (typeof MediaRecorder === 'undefined') {
          throw new Error('お使いのブラウザはMediaRecorderをサポートしていません');
        }

        // 一時的なAnalyzerNodeを作成
        const tempAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        const tempAnalyser = tempAudioContext.createAnalyser();
        
        // 元のAnalyzerの設定を複製
        tempAnalyser.fftSize = visualizer.getFftSize ? visualizer.getFftSize() : 2048;
        tempAnalyser.smoothingTimeConstant = visualizer.getSmoothingConstant ? 
          visualizer.getSmoothingConstant() : 0.8;

        // オーディオ要素の作成と設定
        const audioElement = new Audio();
        audioElement.src = URL.createObjectURL(audioFile);
        await new Promise(resolve => {
          audioElement.onloadedmetadata = resolve;
        });
        audioElement.volume = 1.0;
        
        // オーディオソース接続
        const audioSource = tempAudioContext.createMediaElementSource(audioElement);
        audioSource.connect(tempAnalyser);
        tempAnalyser.connect(tempAudioContext.destination);
        
        // キャンバスからメディアストリームを取得（高フレームレート指定）
        const canvasStream = offscreenCanvas.captureStream(settings.fps);
        
        // オーディオストリームを取得するためのDestination
        const audioDestination = tempAudioContext.createMediaStreamDestination();
        audioSource.connect(audioDestination);
        
        // オーディオトラックをキャンバスストリームに追加
        audioDestination.stream.getAudioTracks().forEach(track => {
          canvasStream.addTrack(track);
        });
        
        // サポートされるビデオフォーマットを検出
        let selectedMimeType = '';
        const mimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4;codecs=h264,aac',
          'video/mp4'
        ];
        
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            console.log(`サポートされているビデオ形式: ${type}`);
            break;
          }
        }
        
        if (!selectedMimeType) {
          throw new Error('サポートされているビデオ形式が見つかりませんでした');
        }
        
        // ビットレート設定を解析（文字列から数値へ）
        let videoBitrate = 8000000; // デフォルト8Mbps
        if (settings.videoBitrate) {
          if (typeof settings.videoBitrate === 'string') {
            // '8000k' -> 8000000
            videoBitrate = parseInt(settings.videoBitrate.replace('k', '000'));
          } else if (typeof settings.videoBitrate === 'number') {
            videoBitrate = settings.videoBitrate;
          }
        }
        
        // レコーダーのオプション - 高品質設定
        const options = {
          mimeType: selectedMimeType,
          videoBitsPerSecond: videoBitrate,
          audioBitsPerSecond: 128000 // 128kbps オーディオ
        };
        
        // メディアレコーダーの作成
        const mediaRecorder = new MediaRecorder(canvasStream, options);
        const chunks = [];
        
        // データ収集
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        // 録画完了時の処理
        mediaRecorder.onstop = async () => {
          try {
            progressText.textContent = 'ビデオを処理中...';
            
            // 録画データの結合
            const blob = new Blob(chunks, { type: selectedMimeType });
            
            // ファイル名の生成
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
            const extension = selectedMimeType.includes('webm') ? 'webm' : 'mp4';
            const fileName = `aves_audio_spectrum_${timestamp}.${extension}`;
            
            // ダウンロードを実行
            saveAs(blob, fileName);
            
            // 進捗とメッセージの更新
            const endTime = performance.now();
            const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
            progressText.textContent = `完了！処理時間: ${elapsedTime}秒`;
            progressBar.style.width = '100%';
            
            // 閉じるボタンの追加
            const closeButton = document.createElement('button');
            closeButton.textContent = '閉じる';
            closeButton.style.cssText = `
              background-color: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 8px 16px;
              margin-top: 16px;
              cursor: pointer;
              font-size: 16px;
            `;
            closeButton.onclick = () => {
              // リソースの解放
              if (tempAudioContext.state !== 'closed') {
                tempAudioContext.close();
              }
              document.body.removeChild(modal);
              resolve(blob);
            };
            modalContent.appendChild(closeButton);
          } catch (e) {
            console.error('ビデオ保存エラー:', e);
            progressText.textContent = 'ビデオの保存中にエラーが発生しました';
            
            // エラー時の閉じるボタン
            const closeButton = document.createElement('button');
            closeButton.textContent = '閉じる';
            closeButton.style.cssText = `
              background-color: #e74c3c;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 8px 16px;
              margin-top: 16px;
              cursor: pointer;
              font-size: 16px;
            `;
            closeButton.onclick = () => {
              if (tempAudioContext.state !== 'closed') {
                tempAudioContext.close();
              }
              document.body.removeChild(modal);
              reject(e);
            };
            modalContent.appendChild(closeButton);
          } finally {
            // リソースの解放
            canvasStream.getTracks().forEach(track => track.stop());
          }
        };
        
        // 一時的なビジュアライザー関数を作成
        const createTempVisualizer = (analyser) => {
          // 元のビジュアライザーと同じ設定を使用
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          // 一時的な描画関数
          return {
            draw: () => {
              // 音声データを取得
              analyser.getByteFrequencyData(dataArray);
              
              // 元のビジュアライザーを使って高解像度で描画
              return visualizer.draw(targetWidth, targetHeight, true, dataArray);
            }
          };
        };
        
        // 一時的なビジュアライザーを作成
        const tempVisualizer = createTempVisualizer(tempAnalyser);
        
        // 録音開始
        mediaRecorder.start(1000); // 1秒ごとにデータチャンクを生成（ファイルサイズを小さく）
        
        // 録画の最大時間
        const recordingDuration = settings.duration || audioElement.duration || 30;
        const maxDuration = Math.min(recordingDuration, audioElement.duration || recordingDuration);
        
        // オーディオの再生開始（少し遅延させてタイミングを合わせる）
        setTimeout(() => {
          audioElement.currentTime = 0;
          audioElement.play().catch(e => {
            console.error('オーディオ再生エラー:', e);
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          });
        }, 100);
        
        // 録画の進捗を更新
        const startRecordingTime = Date.now();
        
        // プログレスバーの更新
        const updateProgress = () => {
          const elapsed = (Date.now() - startRecordingTime) / 1000;
          const progress = Math.min((elapsed / maxDuration) * 100, 100);
          progressBar.style.width = `${progress}%`;
          progressText.textContent = `録画中: ${Math.floor(elapsed)}/${Math.floor(maxDuration)}秒`;
          return elapsed < maxDuration;
        };
        
        // フレーム描画ループ
        const renderLoop = () => {
          // 音声の現在位置を取得
          const currentTime = audioElement.currentTime;
          
          // 録画を続けるかチェック
          if (!updateProgress() || audioElement.ended) {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
              audioElement.pause();
            }
            return;
          }
            
          // ビジュアライゼーションを描画
          const visualizationCanvas = tempVisualizer.draw();
          
          if (visualizationCanvas) {
            // ハイレゾキャンバスに描画
            ctx.clearRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(visualizationCanvas, 0, 0, targetWidth, targetHeight);
            
            // プレビューにも描画
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            previewCtx.drawImage(
              visualizationCanvas, 
              0, 0, 
              visualizationCanvas.width, visualizationCanvas.height, 
              0, 0, 
              previewCanvas.width, previewCanvas.height
            );
          }
          
          // 次のフレームをリクエスト
          if (mediaRecorder.state === 'recording') {
            requestAnimationFrame(renderLoop);
          }
        };
        
        // 描画ループを開始
        renderLoop();
        
        // バックアップ：最大時間後に録画を停止
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            audioElement.pause();
          }
        }, maxDuration * 1000 + 500);
        
        // オーディオ再生終了時に録画を停止
        audioElement.onended = () => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        };
        
      } catch (error) {
        console.error('ビデオ録画エラー:', error);
        
        // スクリーンショットにフォールバック
        progressText.textContent = `ビデオ録画に失敗しました: ${error.message}. スクリーンショットを保存します...`;
        
        setTimeout(() => {
          // エラー発生時はスクリーンショットを保存
          try {
            // 静止画キャプチャ
            const visualizationCanvas = visualizer.draw(targetWidth, targetHeight, true);
            
            if (visualizationCanvas) {
              // スクリーンショットとして保存
              const dataURL = visualizationCanvas.toDataURL('image/png');
              
              // ファイル名の生成
              const now = new Date();
              const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
              const fileName = `aves_audio_spectrum_${timestamp}.png`;
              
              // ダウンロードリンクを作成
              const link = document.createElement('a');
              link.href = dataURL;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              progressText.textContent = 'スクリーンショットを保存しました';
              progressBar.style.width = '100%';
              
              // 閉じるボタン
              const closeButton = document.createElement('button');
              closeButton.textContent = '閉じる';
              closeButton.style.cssText = `
                background-color: #3498db;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                margin-top: 16px;
                cursor: pointer;
                font-size: 16px;
              `;
              closeButton.onclick = () => {
                document.body.removeChild(modal);
                resolve();
              };
              modalContent.appendChild(closeButton);
            }
          } catch (e) {
            // スクリーンショットも失敗した場合
            progressText.textContent = 'エクスポートに失敗しました';
            console.error('スクリーンショット保存エラー:', e);
            
            // エラー時の閉じるボタン
            const closeButton = document.createElement('button');
            closeButton.textContent = '閉じる';
            closeButton.style.cssText = `
              background-color: #e74c3c;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 8px 16px;
              margin-top: 16px;
              cursor: pointer;
              font-size: 16px;
            `;
            closeButton.onclick = () => {
              document.body.removeChild(modal);
              reject(e);
            };
            modalContent.appendChild(closeButton);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('エクスポート初期化エラー:', error);
      alert(`エクスポート中にエラーが発生しました: ${error.message || '不明なエラー'}`);
      reject(error);
    }
  });
}

// シンプルなエクスポートモーダルを作成する関数
function createSimpleExportModal() {
  // モーダルのメインコンテナ
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    font-family: Arial, sans-serif;
  `;
  
  // モーダルの内容
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background-color: #1a1a2e;
    padding: 24px;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    color: white;
    text-align: center;
    box-shadow: 0 5px 15px rgba(0,0,0,0.5);
  `;
  
  // タイトル
  const title = document.createElement('h3');
  title.textContent = 'ビデオエクスポート中...';
  title.style.cssText = `
    margin-bottom: 20px;
    font-size: 20px;
    font-weight: bold;
    color: white;
  `;
  
  // プログレスバーのコンテナ
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    background-color: #2a2a3e;
    height: 8px;
    border-radius: 4px;
    margin-bottom: 16px;
    overflow: hidden;
  `;
  
  // プログレスバー
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    background-color: #3498db;
    height: 100%;
    width: 0%;
    transition: width 0.3s;
  `;
  
  progressContainer.appendChild(progressBar);
  
  // ステータステキスト
  const progressText = document.createElement('p');
  progressText.textContent = '準備中...';
  progressText.style.cssText = `
    margin-bottom: 20px;
    font-size: 14px;
    color: #ccc;
  `;
  
  // プレビューコンテナ
  const previewContainer = document.createElement('div');
  previewContainer.style.cssText = `
    background-color: black;
    width: 100%;
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 16px;
  `;
  
  // プレビューキャンバス
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = 320;
  previewCanvas.height = 180;
  previewCanvas.style.cssText = `
    max-width: 100%;
    max-height: 100%;
  `;
  
  // 要素を組み立て
  previewContainer.appendChild(previewCanvas);
  modalContent.appendChild(title);
  modalContent.appendChild(progressContainer);
  modalContent.appendChild(progressText);
  modalContent.appendChild(previewContainer);
  modal.appendChild(modalContent);
  
  return {
    modal,
    modalContent,
    progressBar,
    progressText,
    previewCanvas
  };
}

// スクリーンショット保存関数
export function saveScreenshot(canvas, filename = 'audio-visualization.png') {
  try {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    console.error('スクリーンショットの保存に失敗しました:', error);
    return false;
  }
}