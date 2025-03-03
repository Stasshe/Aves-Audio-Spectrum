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
    
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });
    
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
      fillStyle = colorUtils.getGradientColor(
        ctx, width, height, 
        color.gradient.colors, 
        color.gradient.angle
      );
      break;
  }
  
  // 解析データのステップサイズを計算
  const analyzerStep = Math.ceil(dataArray.length / barCount);
  
  // 各バーを描画
  for (let i = 0; i < barCount; i++) {
    // 周波数帯域の振幅を取得
    let sum = 0;
    for (let j = 0; j < analyzerStep; j++) {
      const index = i * analyzerStep + j;
      if (index < dataArray.length) {
        sum += dataArray[index];
      }
    }
    
    // 平均値を計算し、0-1の範囲に正規化
    const average = sum / analyzerStep / 255;
    
    // 感度を適用
    let barHeight = Math.max(average * sensitivity * height, bars.minHeight);
    
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
  const radius = circle.radius;
  const rotation = circle.rotation * (Math.PI / 180);
  const barCount = Math.floor(dataArray.length / 4); // 解像度を適切に調整
  
  // 描画色の設定
  let fillStyle;
  
  switch (color.type) {
    case 'solid':
      fillStyle = color.solid;
      break;
      
    case 'gradient':
      // 円形グラデーション
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius
      );
      
      color.gradient.colors.forEach((color, i) => {
        gradient.addColorStop(i / (color.gradient.colors.length - 1), color);
      });
      
      fillStyle = gradient;
      break;
  }
  
  // 円形スペクトラムの描画
  const angleStep = (Math.PI * 2) / barCount;
  
  // ミラーモードの場合は半円だけ描画
  const endAngle = circle.mirrorMode ? Math.PI : Math.PI * 2;
  
  for (let i = 0; i < barCount; i++) {
    const angle = i * angleStep + rotation;
    
    if (angle > endAngle) break;
    
    // データ配列から対応する値を取得
    const value = dataArray[i] / 255;
    
    // 半径を計算
    const barHeight = radius * value * sensitivity;
    
    // 周波数に応じた色を使用
    if (color.type === 'frequency') {
      // この帯域の中央周波数を概算 (20Hz - 20kHz の対数スケール)
      const frequencyRange = 20 * Math.pow(1000, i / barCount);
      fillStyle = colorUtils.getFrequencyColor(frequencyRange, color.frequencyColors);
    }
    
    ctx.fillStyle = fillStyle;
    
    // バーを描画
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(angle) * (radius + barHeight),
      centerY + Math.sin(angle) * (radius + barHeight)
    );
    ctx.arc(
      centerX, centerY,
      radius + barHeight,
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
        centerX + Math.cos(mirrorAngle) * (radius + barHeight),
        centerY + Math.sin(mirrorAngle) * (radius + barHeight)
      );
      ctx.arc(
        centerX, centerY,
        radius + barHeight,
        mirrorAngle,
        mirrorAngle - angleStep,
        true
      );
      ctx.lineTo(centerX, centerY);
      ctx.fill();
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
      ctx.strokeStyle = colorUtils.getFrequencyColor(frequencyRange, color.frequencyColors);
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
  
  // ビジュアライザー描画関数
  const draw = () => {
    const { visualizerSettings, background } = audioStore;
    const width = canvas.width;
    const height = canvas.height;
    
    // 解析データの取得
    analyser.getByteFrequencyData(dataArray);
    
    // 背景の描画
    drawBackground(ctx, width, height, background);
    
    // 選択されたタイプに基づいてビジュアライザーを描画
    switch (visualizerSettings.type) {
      case 'bars':
        drawBarsVisualizer(ctx, width, height, dataArray, visualizerSettings, background);
        break;
      case 'circle':
        drawCircleVisualizer(ctx, width, height, dataArray, visualizerSettings, background);
        break;
      case 'wave':
        drawWaveVisualizer(ctx, width, height, dataArray, visualizerSettings, background);
        break;
      case 'waveform':
        drawWaveformVisualizer(ctx, width, height, dataArray, visualizerSettings, background);
        break;
      case 'particles':
        drawParticlesVisualizer(ctx, width, height, dataArray, visualizerSettings, background);
        break;
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
  
  return {
    draw,
    updateSettings,
    destroy
  };
}