/**
 * オーディオビジュアライゼーションのエクスポートを処理するサービス
 */
import { saveAs } from 'file-saver';

/**
 * エクスポートサービスクラス
 * 動画・画像エクスポートの処理を担当
 */
class ExportService {
  /**
   * エクスポートモーダル要素を作成
   * @returns {Object} モーダル要素と関連コンポーネント
   */
  createExportModal() {
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

  /**
   * 閉じるボタンをモーダルに追加
   * @param {HTMLElement} modalContent - モーダルコンテンツ要素
   * @param {HTMLElement} modal - モーダル要素
   * @param {Function} callback - 完了時のコールバック関数
   * @param {string} type - ボタンタイプ ('success' または 'error')
   * @param {string} message - ボタンに表示するメッセージ
   */
  addCloseButton(modalContent, modal, callback, type = 'success', message = '閉じる') {
    const closeButton = document.createElement('button');
    closeButton.textContent = message;
    closeButton.style.cssText = `
      background-color: ${type === 'success' ? '#3498db' : '#e74c3c'};
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
      if (callback) callback();
    };
    modalContent.appendChild(closeButton);
  }

  /**
   * サポートされているビデオ形式を検出
   * @returns {string} サポートされているMIMEタイプ
   */
  detectSupportedVideoFormat() {
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4'
    ];
    
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`サポートされているビデオ形式: ${type}`);
        return type;
      }
    }
    
    return null;
  }

  /**
   * スクリーンショットを保存
   * @param {HTMLCanvasElement} canvas - 出力するキャンバス
   * @param {string} filename - 保存するファイル名
   * @returns {boolean} 保存が成功したか
   */
  saveScreenshot(canvas, filename = 'audio-visualization.png') {
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
      console.error('スクリーンショット保存エラー:', error);
      return false;
    }
  }

  /**
   * タイムスタンプ付きのファイル名を生成
   * @param {string} extension - ファイル拡張子
   * @returns {string} 生成されたファイル名
   */
  generateFilename(extension) {
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    return `aves_audio_spectrum_${timestamp}.${extension}`;
  }

  /**
   * ビデオをエクスポート
   * @param {Blob} audioFile - オーディオファイル
   * @param {Object} settings - エクスポート設定
   * @param {Object} visualizer - ビジュアライザーオブジェクト
   * @returns {Promise<Blob>} エクスポートされたビデオファイル
   */
  async exportVideo(audioFile, settings, visualizer) {
    return new Promise(async (resolve, reject) => {
      try {
        // エクスポート開始時間を記録
        const startTime = performance.now();
        
        // モーダルUI要素を生成して表示
        const { modal, modalContent, progressBar, progressText, previewCanvas } = this.createExportModal();
        document.body.appendChild(modal);
        
        // 解像度設定
        const resolutions = {
          '720p': { width: 1280, height: 720 },
          '1080p': { width: 1920, height: 1080 },
          '4k': { width: 3840, height: 2160 }
        };
        
        const resolution = resolutions[settings.resolution] || resolutions['1080p'];
        const targetWidth = resolution.width;
        const targetHeight = resolution.height;
        
        // オフスクリーンキャンバスを準備
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = targetWidth;
        offscreenCanvas.height = targetHeight;
        const ctx = offscreenCanvas.getContext('2d');
        
        // プレビューキャンバスの設定
        const previewCtx = previewCanvas.getContext('2d');
        
        try {
          // MediaRecorderがサポートされているか確認
          if (typeof MediaRecorder === 'undefined') {
            throw new Error('お使いのブラウザはMediaRecorderをサポートしていません');
          }
          
          // 一時的なオーディオコンテキストを作成
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          
          // オーディオ要素を作成・設定
          const audioElement = new Audio();
          audioElement.src = URL.createObjectURL(audioFile);
          await new Promise(resolve => {
            audioElement.onloadedmetadata = resolve;
          });
          
          // オーディオ要素が完全に読み込まれるまで待機
          await new Promise(resolve => {
            if (audioElement.readyState >= 3) {
              resolve();
            } else {
              audioElement.oncanplay = resolve;
            }
          });
          
          // オーディオソースとアナライザーを設定
          const sourceNode = audioContext.createMediaElementSource(audioElement);
          const analyzerNode = audioContext.createAnalyser();
          
          // FFTサイズなど設定の複製
          analyzerNode.fftSize = visualizer.getFftSize ? visualizer.getFftSize() : 2048;
          analyzerNode.smoothingTimeConstant = visualizer.getSmoothingConstant ? 
            visualizer.getSmoothingConstant() : 0.8;
          
          // 接続
          sourceNode.connect(analyzerNode);
          analyzerNode.connect(audioContext.destination);
          
          // データ配列を準備
          const dataArray = new Uint8Array(analyzerNode.frequencyBinCount);
          
          // キャンバスストリームを取得（フレームレートを指定）
          const canvasStream = offscreenCanvas.captureStream(settings.fps);
          
          // オーディオトラックを取得してストリームに追加
          const audioDestination = audioContext.createMediaStreamDestination();
          sourceNode.connect(audioDestination);
          audioDestination.stream.getAudioTracks().forEach(track => {
            canvasStream.addTrack(track);
          });
          
          // サポートされているフォーマットを検出
          const mimeType = this.detectSupportedVideoFormat();
          if (!mimeType) {
            throw new Error('サポートされているビデオ形式が見つかりませんでした');
          }
          
          // ビットレートの解析（文字列の場合は数値に変換）
          let videoBitrate = 8000000; // 8Mbpsをデフォルト
          if (settings.videoBitrate) {
            if (typeof settings.videoBitrate === 'string') {
              videoBitrate = parseInt(settings.videoBitrate.replace('k', '000'));
            } else if (typeof settings.videoBitrate === 'number') {
              videoBitrate = settings.videoBitrate;
            }
          }
          
          // MediaRecorderオプション
          const options = {
            mimeType: mimeType,
            videoBitsPerSecond: videoBitrate,
            audioBitsPerSecond: 128000 // 音声は128kbpsで固定
          };
          
          // MediaRecorderを作成
          const mediaRecorder = new MediaRecorder(canvasStream, options);
          const chunks = [];
          
          // データチャンクを収集
          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              chunks.push(event.data);
            }
          };
          
          // 録画終了時の処理
          mediaRecorder.onstop = async () => {
            try {
              progressText.textContent = 'ビデオを処理中...';
              
              // 全チャンクを結合してBlobを作成
              const blob = new Blob(chunks, { type: mimeType });
              
              // ファイル名を生成
              const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
              const fileName = this.generateFilename(extension);
              
              // ファイルを保存
              saveAs(blob, fileName);
              
              // 処理時間を計算
              const endTime = performance.now();
              const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);
              
              // UI更新
              progressText.textContent = `完了！処理時間: ${elapsedTime}秒`;
              progressBar.style.width = '100%';
              
              // 閉じるボタンを追加
              this.addCloseButton(modalContent, modal, () => {
                // リソース解放
                if (audioContext.state !== 'closed') {
                  audioContext.close();
                }
                resolve(blob);
              });
              
            } catch (error) {
              console.error('ビデオ保存エラー:', error);
              progressText.textContent = 'ビデオの保存中にエラーが発生しました';
              
              // エラー時の閉じるボタン
              this.addCloseButton(modalContent, modal, () => {
                if (audioContext.state !== 'closed') {
                  audioContext.close();
                }
                reject(error);
              }, 'error');
            } finally {
              // ストリームトラックを停止
              canvasStream.getTracks().forEach(track => track.stop());
            }
          };
          
          // 録画時間の設定
          const videoDuration = settings.duration || audioElement.duration;
          const maxDuration = Math.min(videoDuration, audioElement.duration);
          
          // 録画開始
          mediaRecorder.start(1000); // 1秒ごとにデータチャンク生成
          
          // 録画開始時間
          const startRecordingTime = Date.now();
          
          // プログレスバー更新関数
          const updateProgress = () => {
            const elapsed = (Date.now() - startRecordingTime) / 1000;
            const progress = Math.min((elapsed / maxDuration) * 100, 100);
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `録画中: ${Math.floor(elapsed)}/${Math.floor(maxDuration)}秒`;
            return elapsed < maxDuration;
          };
          
          // オーディオを再生開始
          setTimeout(() => {
            audioElement.currentTime = 0;
            audioElement.play().catch(error => {
              console.error('オーディオ再生エラー:', error);
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            });
          }, 100);
          
          // 描画ループ関数
          const renderFrame = () => {
            // 進捗を更新
            if (!updateProgress() || audioElement.ended) {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                audioElement.pause();
              }
              return;
            }
            
            // 音声データを取得
            analyzerNode.getByteFrequencyData(dataArray);
            
            // ビジュアライザーを描画（高解像度で）
            const visualizerCanvas = visualizer.draw(targetWidth, targetHeight, true, dataArray);
            
            if (visualizerCanvas) {
              // メインキャンバスに描画
              ctx.clearRect(0, 0, targetWidth, targetHeight);
              ctx.drawImage(visualizerCanvas, 0, 0);
              
              // プレビューにも描画（サイズ調整）
              previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
              previewCtx.drawImage(
                visualizerCanvas,
                0, 0, visualizerCanvas.width, visualizerCanvas.height,
                0, 0, previewCanvas.width, previewCanvas.height
              );
            }
            
            // 継続条件チェック
            if (mediaRecorder.state === 'recording') {
              requestAnimationFrame(renderFrame);
            }
          };
          
          // 描画ループ開始
          renderFrame();
          
          // バックアップとして時間制限を設定
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
              audioElement.pause();
            }
          }, maxDuration * 1000 + 500); // 余裕を持たせる
          
          // オーディオ終了時の処理
          audioElement.onended = () => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          };
          
        } catch (error) {
          console.error('ビデオエクスポートエラー:', error);
          
          // スクリーンショットにフォールバック
          progressText.textContent = `ビデオ録画に失敗しました: ${error.message}. スクリーンショットを保存します...`;
          
          setTimeout(() => {
            try {
              // 静的な画像を生成
              const visualizationCanvas = visualizer.draw(targetWidth, targetHeight, true);
              
              if (visualizationCanvas) {
                // スクリーンショットとして保存
                const fileName = this.generateFilename('png');
                this.saveScreenshot(visualizationCanvas, fileName);
                
                progressText.textContent = 'スクリーンショットを保存しました';
                progressBar.style.width = '100%';
                
                this.addCloseButton(modalContent, modal, () => resolve(null));
              }
            } catch (error) {
              progressText.textContent = 'エクスポートに失敗しました';
              console.error('スクリーンショット保存エラー:', error);
              
              this.addCloseButton(modalContent, modal, () => reject(error), 'error');
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
}

// シングルトンインスタンスをエクスポート
export default new ExportService();
