/**
 * ビジュアライザーの作成と描画を管理するユーティリティ
 */

// 色関連のヘルパー関数
const colorUtils = {
  // 単色の取得
  getSolidColor: (color) => color,
  
  // グラデーションカラーの取得
  getGradientColor: (ctx, width, height, colors, angle) => {
    const gradient = ctx.createLinearGradient(
      0, 0,
      Math.cos(angle * Math.PI / 180) * width,
      Math.sin(angle * Math.PI / 180) * height
    );
    
    // 色が配列であることを確認
    if (Array.isArray(colors) && colors.length > 0) {
      colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), color);
      });
    } else {
      // フォールバック（色が配列でない場合）
      gradient.addColorStop(0, '#3498DB');
      gradient.addColorStop(1, '#8E44AD');
    }
    
    return gradient;
  },
  
  // 周波数に基づいた色の取得
  getFrequencyColor: (frequency, colorMap) => {
    // 周波数マップを周波数で昇順ソート
    const sortedMap = [...colorMap].sort((a, b) => a.freq - b.freq);
    
    // 最小値未満または最大値以上の場合
    if (frequency <= sortedMap[0].freq) {
      return sortedMap[0].color;
    }
    
    if (frequency >= sortedMap[sortedMap.length - 1].freq) {
      return sortedMap[sortedMap.length - 1].color;
    }
    
    // 周波数に対応する範囲を検索
    for (let i = 0; i < sortedMap.length - 1; i++) {
      if (frequency >= sortedMap[i].freq && frequency < sortedMap[i + 1].freq) {
        // 2点間の線形補間
        const ratio = (frequency - sortedMap[i].freq) / (sortedMap[i + 1].freq - sortedMap[i].freq);
        return interpolateColor(sortedMap[i].color, sortedMap[i + 1].color, ratio);
      }
    }
    
    return sortedMap[0].color; // フォールバック
  }
};

// 2つの色を補間する
function interpolateColor(color1, color2, ratio) {
  // 16進カラーコードをRGBに変換
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  // 色を補間
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  
  // RGBを16進カラーコードに変換
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// バックグラウンド描画関数
function drawBackground(ctx, width, height, background) {
  ctx.clearRect(0, 0, width, height);
  
  switch (background.type) {
    case 'color':
      ctx.fillStyle = background.color;
      ctx.fillRect(0, 0, width, height);
      break;
      
    case 'gradient':
      const gradient = ctx.createLinearGradient(
        0, 0,
        Math.cos(background.gradient.angle * Math.PI / 180) * width,
        Math.sin(background.gradient.angle * Math.PI / 180) * height
      );
      
      background.gradient.colors.forEach((color, i) => {
        gradient.addColorStop(i / (background.gradient.colors.length - 1), color);
      });
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;
      
    case 'image':
      if (background.image) {
        // キャッシュされた画像を使用（あれば）
        if (background._imageCache) {
          ctx.globalAlpha = background.opacity;
          
          if (background.blur > 0) {
            ctx.filter = `blur(${background.blur}px)`;
          }
          
          ctx.drawImage(background._imageCache, 0, 0, width, height);
          
          // リセット
          ctx.globalAlpha = 1;
          ctx.filter = 'none';
        }
      }
      break;
  }
}

// バー型のビジュアライザー描画
function drawBarsVisualizer(ctx, width, height, dataArray, settings, background) {
  const { bars, color, sensitivity, smoothingTimeConstant } = settings;
  const barCount = bars.count;
  const barWidth = bars.width;
  const barSpacing = bars.spacing;
  const roundedTop = bars.roundedTop;
  
  // バーの配置計算
  const totalBarWidth = barWidth * barCount + barSpacing * (barCount - 1);
  let startX;
  
  switch (bars.horizontalAlign) {
    case 'left':
      startX = 0;
      break;
    case 'center':
      startX = (width - totalBarWidth) / 2;
      break;
    case 'right':
      startX = width - totalBarWidth;
      break;
    default:
      startX = 0;
  }
  
  // 描画色の設定
  let fillStyle;
  
  switch (color.type) {
    case 'solid':
      fillStyle = color.solid;
      break;
      
    case 'gradient':
      // バーのグラデーションは全体に対して適用する
      fillStyle = ctx.createLinearGradient(0, height, 0, 0);
      
      // 色が配列であることを確認
      if (Array.isArray(color.gradient.colors) && color.gradient.colors.length > 0) {
        color.gradient.colors.forEach((color, i, arr) => {
          fillStyle.addColorStop(i / (arr.length - 1), color);
        });
      } else {
        // フォールバック（色が配列でない場合）
        fillStyle.addColorStop(0, '#3498DB');
        fillStyle.addColorStop(1, '#8E44AD');
      }
      break;
  }
  
  // 解析データのステップサイズを計算
  const analyzerStep = Math.ceil(dataArray.length / barCount);
  
  // 最大値を追跡して正規化に使用
  let maxValue = 0;
  for (let i = 0; i < dataArray.length; i++) {
    if (dataArray[i] > maxValue) maxValue = dataArray[i];
  }
  
  // 各バーを描画
  for (let i = 0; i < barCount; i++) {
    // 周波数帯域の振幅を取得
    let sum = 0;
    let count = 0;
    for (let j = 0; j < analyzerStep; j++) {
      const index = i * analyzerStep + j;
      if (index < dataArray.length) {
        sum += dataArray[index];
        count++;
      }
    }
    
    // 平均値を計算し、0-1の範囲に正規化
    const average = count > 0 ? sum / count / 255 : 0;
    
    // 感度を適用（強化版）- より大きな値になるよう指数関数的にマッピング
    const scaledValue = Math.pow(average, 0.8); // 小さな値を大きく見せるための指数
    let barHeight = Math.max(scaledValue * sensitivity * height * 1.5, bars.minHeight);
    
    // バーを画面の高さに収める
    barHeight = Math.min(barHeight, height);
    
    // バーX座標
    const x = startX + i * (barWidth + barSpacing);
    
    // バーY座標（縦位置によって変わる）
    let y;
    switch (bars.verticalAlign) {
      case 'top':
        y = 0;
        break;
      case 'middle':
        y = (height - barHeight) / 2;
        break;
      case 'bottom':
        y = height - barHeight;
        break;
      default:
        y = height - barHeight;
    }
    
    // 周波数に応じた色を使用
    if (color.type === 'frequency') {
      // この帯域の中央周波数を概算 (20Hz - 20kHz の対数スケール)
      const frequencyRange = 20 * Math.pow(1000, i / barCount);
      fillStyle = colorUtils.getFrequencyColor(frequencyRange, color.frequencyColors);
    }
    
    ctx.fillStyle = fillStyle;
    
    // バーを描画
    if (roundedTop) {
      // 上部が丸いバー
      ctx.beginPath();
      ctx.moveTo(x, y + barHeight);
      ctx.lineTo(x, y + barHeight - Math.min(barHeight, barWidth / 2));
      ctx.arc(x + barWidth / 2, y + barHeight - Math.min(barHeight, barWidth / 2), barWidth / 2, Math.PI, 0, true);
      ctx.lineTo(x + barWidth, y + barHeight);
      ctx.fill();
    } else {
      // 通常の四角形バー
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }
}

// 円形ビジュアライザーの描画
function drawCircleVisualizer(ctx, width, height, dataArray, settings, background) {
  const { circle, color, sensitivity } = settings;
  const centerX = width * circle.centerX;
  const centerY = height * circle.centerY;
  
  // 基本半径と最大半径（新機能）
  const minRadius = circle.minRadius || circle.radius * 0.5; // デフォルトは半分の半径
  const maxRadius = circle.radius;
  
  const rotation = circle.rotation * (Math.PI / 180);
  const barCount = Math.floor(dataArray.length / 4); // 解像度を適切に調整
  
  // 感度を調整 - 振幅計算用
  const maxAmplitude = (maxRadius - minRadius) * 0.9;
  
  // 描画色の設定
  let fillStyle, strokeStyle;
  
  switch (color.type) {
    case 'solid':
      fillStyle = color.solid;
      strokeStyle = color.solid;
      break;
      
    case 'gradient':
      // 円形グラデーション
      const gradient = ctx.createRadialGradient(
        centerX, centerY, minRadius * 0.8,
        centerX, centerY, maxRadius * 1.2
      );
      
      // 色が配列であることを確認
      if (Array.isArray(color.gradient.colors) && color.gradient.colors.length > 0) {
        color.gradient.colors.forEach((color, i, arr) => {
          gradient.addColorStop(i / (arr.length - 1), color);
        });
      } else {
        // フォールバック（色が配列でない場合）
        gradient.addColorStop(0, '#3498DB');
        gradient.addColorStop(1, '#8E44AD');
      }
      
      fillStyle = gradient;
      strokeStyle = gradient;
      break;
  }
  
  // 円形スペクトラムの描画
  const angleStep = (Math.PI * 2) / barCount;
  
  // ミラーモードの場合は半円だけ描画
  const endAngle = circle.mirrorMode ? Math.PI : Math.PI * 2;
  
  // 選択されたテーマに基づいて描画（新機能）
  if (circle.theme === 'outline' || circle.theme === 'outlineFilled') {
    // 外輪郭型描画
    ctx.beginPath();
    
    for (let i = 0; i < barCount; i++) {
      const angle = i * angleStep + rotation;
      
      if (angle > endAngle) break;
      
      // データ配列から対応する値を取得
      const value = dataArray[i] / 255;
      
      // 半径を計算 - 最小半径から振幅を加算
      const barRadius = minRadius + Math.min(maxAmplitude * value * sensitivity, maxAmplitude);
      
      // 周波数に応じた色を使用
      if (color.type === 'frequency') {
        const frequencyRange = 20 * Math.pow(1000, i / barCount);
        strokeStyle = colorUtils.getFrequencyColor(frequencyRange, color.frequencyColors);
        ctx.strokeStyle = strokeStyle;
      } else {
        ctx.strokeStyle = strokeStyle;
      }
      
      // 最初のポイントは移動、以降は線を引く
      if (i === 0) {
        ctx.moveTo(
          centerX + Math.cos(angle) * barRadius,
          centerY + Math.sin(angle) * barRadius
        );
      } else {
        ctx.lineTo(
          centerX + Math.cos(angle) * barRadius,
          centerY + Math.sin(angle) * barRadius
        );
      }
      
      // ミラーモードの場合は反対側にも描画
      if (circle.mirrorMode && i === barCount - 1) {
        for (let j = barCount - 1; j >= 0; j--) {
          const mirrorAngle = Math.PI * 2 - (j * angleStep + rotation);
          const mirrorValue = dataArray[j] / 255;
          const mirrorRadius = minRadius + Math.min(maxAmplitude * mirrorValue * sensitivity, maxAmplitude);
          
          ctx.lineTo(
            centerX + Math.cos(mirrorAngle) * mirrorRadius,
            centerY + Math.sin(mirrorAngle) * mirrorRadius
          );
        }
      }
    }
    
    // 線の太さとスタイル設定
    ctx.lineWidth = circle.lineWidth || 2;
    
    // 塗りつぶすかどうか
    if (circle.theme === 'outlineFilled') {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    
    ctx.stroke();
  } 
  else if (circle.theme === 'hollow') {
    // 中空型円形描画
    ctx.beginPath();
    ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2);
    ctx.fillStyle = background.type === 'color' ? background.color : '#000000';
    ctx.fill();
    
    // 通常の円形バー描画
    for (let i = 0; i < barCount; i++) {
      const angle = i * angleStep + rotation;
      
      if (angle > endAngle) break;
      
      // データ配列から対応する値を取得
      const value = dataArray[i] / 255;
      
      // 半径を計算 - 最大振幅を制限
      const barHeight = Math.min(maxAmplitude * value * sensitivity, maxAmplitude);
      
      // 周波数に応じた色を使用
      if (color.type === 'frequency') {
        const frequencyRange = 20 * Math.pow(1000, i / barCount);
        fillStyle = colorUtils.getFrequencyColor(frequencyRange, color.frequencyColors);
      }
      
      ctx.fillStyle = fillStyle;
      
      // バーを描画
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * (minRadius + barHeight),
        centerY + Math.sin(angle) * (minRadius + barHeight)
      );
      ctx.arc(
        centerX, centerY,
        minRadius + barHeight,
        angle,
        angle + angleStep,
        false
      );
      ctx.lineTo(centerX, centerY);
      ctx.fill();
      
      // ミラーモードの場合は反対側にも描画
      if (circle.mirrorMode) {
        ctx.beginPath();
        const mirrorAngle = Math.PI * 2 - angle;
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(mirrorAngle) * (minRadius + barHeight),
          centerY + Math.sin(mirrorAngle) * (minRadius + barHeight)
        );
        ctx.arc(
          centerX, centerY,
          minRadius + barHeight,
          mirrorAngle,
          mirrorAngle - angleStep,
          true
        );
        ctx.lineTo(centerX, centerY);
        ctx.fill();
      }
    }
  }
  else {
    // 標準の放射状バー描画（デフォルト）
    for (let i = 0; i < barCount; i++) {
      const angle = i * angleStep + rotation;
      
      if (angle > endAngle) break;
      
      // データ配列から対応する値を取得
      const value = dataArray[i] / 255;
      
      // 半径を計算 - 最大振幅を制限
      const barHeight = Math.min(maxAmplitude * value * sensitivity, maxAmplitude);
      
      // 周波数に応じた色を使用
      if (color.type === 'frequency') {
        const frequencyRange = 20 * Math.pow(1000, i / barCount);
        fillStyle = colorUtils.getFrequencyColor(frequencyRange, color.frequencyColors);
      }
      
      ctx.fillStyle = fillStyle;
      
      // バーを描画
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * (minRadius + barHeight),
        centerY + Math.sin(angle) * (minRadius + barHeight)
      );
      ctx.arc(
        centerX, centerY,
        minRadius + barHeight,
        angle,
        angle + angleStep,
        false
      );
      ctx.lineTo(centerX, centerY);
      ctx.fill();
      
      // ミラーモードの場合は反対側にも描画
      if (circle.mirrorMode) {
        ctx.beginPath();
        const mirrorAngle = Math.PI * 2 - angle;
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(mirrorAngle) * (minRadius + barHeight),
          centerY + Math.sin(mirrorAngle) * (minRadius + barHeight)
        );
        ctx.arc(
          centerX, centerY,
          minRadius + barHeight,
          mirrorAngle,
          mirrorAngle - angleStep,
          true
        );
        ctx.lineTo(centerX, centerY);
        ctx.fill();
      }
    }
  }
}

// 波形ビジュアライザーの描画
function drawWaveVisualizer(ctx, width, height, dataArray, settings, background) {
  const { wave, color, sensitivity, smoothingTimeConstant } = settings;
  const points = wave.points;
  const amplitude = wave.amplitude;
  const waveFrequency = wave.frequency;
  const smoothing = wave.smoothing;
  
  // 描画色の設定
  let strokeStyle;
  
  switch (color.type) {
    case 'solid':
      strokeStyle = color.solid;
      break;
      
    case 'gradient':
      strokeStyle = colorUtils.getGradientColor(
        ctx, width, height, 
        color.gradient.colors, 
        color.gradient.angle
      );
      break;
  }
  
  // 波形の描画
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  // 始点
  ctx.moveTo(0, height / 2);
  
  // 前回のY座標を保存して平滑化に使う
  let lastY = height / 2;
  
  // 解析データのステップサイズを計算
  const step = Math.ceil(dataArray.length / points);
  
  // 各ポイントを描画
  for (let i = 0; i < points; i++) {
    const x = (width / points) * i;
    
    // データ配列から値を取得
    let sum = 0;
    for (let j = 0; j < step; j++) {
      const index = i * step + j;
      if (index < dataArray.length) {
        sum += dataArray[index];
      }
    }
    
    // 平均値を計算し、-1から1の範囲に正規化
    const average = (sum / step / 255) * 2 - 1;
    
    // 感度を適用
    const rawY = height / 2 + average * amplitude * sensitivity;
    
    // スムージングを適用
    const y = lastY * smoothing + rawY * (1 - smoothing);
    lastY = y;
    
    // 波形にサイン波を追加
    const sineY = y + Math.sin(i / points * Math.PI * 2 * waveFrequency) * amplitude * 0.2;
    
    // 周波数に応じた色を使用
    if (color.type === 'frequency') {
      // この帯域の中央周波数を概算 (20Hz - 20kHz の対数スケール)
      const frequencyRange = 20 * Math.pow(1000, i / points);
      ctx.strokeStyle = colorUtils.getFrequencyColor(frequencyRange, settings.color.frequencyColors);
    }
    
    ctx.lineTo(x, sineY);
  }
  
  // 右端に線を引く
  ctx.lineTo(width, height / 2);
  ctx.stroke();
}

// 波形表示ビジュアライザーの描画
function drawWaveformVisualizer(ctx, width, height, dataArray, settings, background) {
  const { color, sensitivity } = settings;
  
  // 描画色の設定
  let fillStyle;
  
  switch (color.type) {
    case 'solid':
      fillStyle = color.solid;
      break;
      
    case 'gradient':
      fillStyle = colorUtils.getGradientColor(
        ctx, width, height, 
        color.gradient.colors, 
        color.gradient.angle
      );
      break;
  }
  
  ctx.fillStyle = fillStyle;
  
  // 中央線を描画
  const centerY = height / 2;
  
  // 波形の描画
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  
  // 上部の波形
  for (let i = 0; i < dataArray.length; i++) {
    const x = (width / dataArray.length) * i;
    const value = (dataArray[i] / 255) * sensitivity;
    const y = centerY - (height / 2) * value;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  // 下部の波形（反転）
  for (let i = dataArray.length - 1; i >= 0; i--) {
    const x = (width / dataArray.length) * i;
    const value = (dataArray[i] / 255) * sensitivity;
    const y = centerY + (height / 2) * value;
    ctx.lineTo(x, y);
  }
  
  ctx.closePath();
  ctx.fill();
}

// パーティクルビジュアライザーの描画
function drawParticlesVisualizer(ctx, width, height, dataArray, settings, background) {
  // 周波数帯域を分割して振幅を取得
  const bass = getAverageAmplitude(dataArray, 0, 60);
  const mid = getAverageAmplitude(dataArray, 60, 600);
  const treble = getAverageAmplitude(dataArray, 600, 20000);
  
  // パーティクルの数と大きさを振幅に基づいて決定
  const particleCount = 100 + Math.floor(bass * 100);
  const particleSize = 2 + bass * 5;
  
  // 描画色の設定
  let fillStyle;
  
  switch (settings.color.type) {
    case 'solid':
      fillStyle = settings.color.solid;
      break;
      
    case 'gradient':
      fillStyle = colorUtils.getGradientColor(
        ctx, width, height, 
        settings.color.gradient.colors, 
        settings.color.gradient.angle
      );
      break;
  }
  
  // パーティクルの描画
  for (let i = 0; i < particleCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * particleSize;
    
    // 周波数に応じた色を使用
    if (settings.color.type === 'frequency') {
      // パーティクルの位置に基づいて周波数を割り当て
      const frequencyRange = 20 + (20000 - 20) * (y / height);
      fillStyle = colorUtils.getFrequencyColor(frequencyRange, settings.color.frequencyColors);
    }
    
    ctx.fillStyle = fillStyle;
    ctx.globalAlpha = 0.7; // 半透明に
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.globalAlpha = 1.0; // アルファ値をリセット
}

// 特定の周波数帯域の平均振幅を取得するヘルパー関数
function getAverageAmplitude(dataArray, minFreq, maxFreq) {
  const sampleRate = 44100; // 標準的なサンプルレート
  const fftSize = dataArray.length * 2;
  
  // 周波数インデックスを計算
  const minIndex = Math.floor(minFreq * fftSize / sampleRate);
  const maxIndex = Math.min(Math.floor(maxFreq * fftSize / sampleRate), dataArray.length - 1);
  
  // 平均値を計算
  let sum = 0;
  for (let i = minIndex; i <= maxIndex; i++) {
    sum += dataArray[i];
  }
  
  return sum / (maxIndex - minIndex + 1) / 255;
}

// 背景画像をキャッシュするヘルパー関数
function cacheBackgroundImage(background) {
  return new Promise((resolve, reject) => {
    if (background.type !== 'image' || !background.image) {
      resolve();
      return;
    }
    
    // 既にキャッシュがあれば何もしない
    if (background._imageCache) {
      resolve();
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      background._imageCache = img;
      resolve();
    };
    img.onerror = () => {
      reject(new Error('背景画像の読み込みに失敗しました'));
    };
    
    img.src = URL.createObjectURL(background.image);
  });
}

// ビジュアライザーを作成する関数
export function createVisualizer(canvas, analyser, audioStore) {
  if (!canvas || !analyser) {
    console.error('ビジュアライザーを作成できません: キャンバスまたは解析ノードが不足しています');
    return null;
  }
  
  const ctx = canvas.getContext('2d');
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
  // 背景画像のキャッシュ
  cacheBackgroundImage(audioStore.background);
  
  // キャンバスのサイズを設定
  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };
  
  // 初期サイズを設定
  resizeCanvas();
  
  // リサイズイベントリスナー
  window.addEventListener('resize', resizeCanvas);
  
  // 設定のスケールを調整するヘルパー関数
  const scaleVisualizerSettings = (settings, targetWidth, targetHeight) => {
    // オリジナル設定をディープコピー
    const scaledSettings = JSON.parse(JSON.stringify(settings));
    
    // リファレンス解像度（プレビューキャンバスの典型的なサイズ）
    const refWidth = 800;
    const refHeight = 450;
    
    // スケール係数を計算
    const widthScale = targetWidth / refWidth;
    const heightScale = targetHeight / refHeight;
    
    // 共通の設定をスケーリング
    scaledSettings.sensitivity = settings.sensitivity; // 感度はスケールしない
    scaledSettings.smoothingTimeConstant = settings.smoothingTimeConstant; // スケールしない
    
    // タイプ別の設定をスケーリング
    if (settings.type === 'bars') {
      // バー設定が存在することを確認
      if (scaledSettings.bars) {
        scaledSettings.bars.width = Math.max(1, Math.round(settings.bars.width * widthScale));
        scaledSettings.bars.spacing = Math.max(0, Math.round(settings.bars.spacing * widthScale));
        scaledSettings.bars.minHeight = Math.max(0, Math.round(settings.bars.minHeight * heightScale));
      }
    }
    else if (settings.type === 'circle') {
      // 円形設定が存在することを確認
      if (scaledSettings.circle) {
        scaledSettings.circle.radius = Math.max(1, Math.round(settings.circle.radius * Math.min(widthScale, heightScale)));
      }
    }
    else if (settings.type === 'wave') {
      // 波形設定が存在することを確認
      if (scaledSettings.wave) {
        scaledSettings.wave.amplitude = Math.max(1, Math.round(settings.wave.amplitude * heightScale));
      }
    }
    
    return scaledSettings;
  };

  // ビジュアライザー描画関数
  const draw = (targetWidth = null, targetHeight = null, forExport = false, externalDataArray = null) => {
    try {
      const { visualizerSettings, background } = audioStore;
      
      // 描画先のキャンバスサイズを決定
      const width = targetWidth || canvas.width || 800;
      const height = targetHeight || canvas.height || 450;
      
      // 一時キャンバスを使用（エクスポート時）
      let drawCtx = ctx;
      let tempCanvas = null;
      
      if (forExport) {
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        drawCtx = tempCanvas.getContext('2d');
      }
      
      // 設定をスケーリング
      const scaledSettings = scaleVisualizerSettings(visualizerSettings, width, height);
      
      // 解析データの取得（エクスポート時は外部データを使用）
      const usedDataArray = externalDataArray || dataArray;
      
      if (!externalDataArray) {
        analyser.getByteFrequencyData(usedDataArray);
      }
      
      // 背景の描画
      drawBackground(drawCtx, width, height, background);
      
      // 選択されたタイプに基づいてビジュアライザーを描画
      switch (scaledSettings.type) {
        case 'bars':
          drawBarsVisualizer(drawCtx, width, height, usedDataArray, scaledSettings, background);
          break;
        case 'circle':
          drawCircleVisualizer(drawCtx, width, height, usedDataArray, scaledSettings, background);
          break;
        case 'wave':
          drawWaveVisualizer(drawCtx, width, height, usedDataArray, scaledSettings, background);
          break;
        case 'waveform':
          drawWaveformVisualizer(drawCtx, width, height, usedDataArray, scaledSettings, background);
          break;
        case 'particles':
          drawParticlesVisualizer(drawCtx, width, height, usedDataArray, scaledSettings, background);
          break;
      }
      
      // エクスポート用に一時キャンバスを返す
      if (forExport && tempCanvas) {
        return tempCanvas;
      }
      
      return null;
    } catch (error) {
      console.error('ビジュアライザー描画エラー:', error);
      return null;
    }
  };
  
  // 設定更新関数
  const updateSettings = () => {
    analyser.fftSize = audioStore.visualizerSettings.fftSize;
    analyser.smoothingTimeConstant = audioStore.visualizerSettings.smoothingTimeConstant;
    
    // 背景画像が変更された場合は再キャッシュ
    cacheBackgroundImage(audioStore.background);
  };
  
  // クリーンアップ関数
  const destroy = () => {
    window.removeEventListener('resize', resizeCanvas);
  };
  
  // analyser設定の取得関数を追加
  const getFftSize = () => {
    return analyser.fftSize;
  };
  
  // スムージング定数の取得関数を追加
  const getSmoothingConstant = () => {
    return analyser.smoothingTimeConstant;
  };
  
  return {
    draw,
    updateSettings,
    destroy,
    scaleVisualizerSettings,
    getFftSize,
    getSmoothingConstant
  };
}