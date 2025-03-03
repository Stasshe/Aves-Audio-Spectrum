<template>
  <div class="visualizer-container">
    <canvas
      ref="visualizerCanvas"
      class="visualizer-canvas"
      :width="canvasWidth"
      :height="canvasHeight"
    ></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();
const visualizerCanvas = ref(null);
const canvasContext = ref(null);
const animationFrameId = ref(null);
const canvasWidth = ref(800);
const canvasHeight = ref(500);

// ビジュアライザー設定を取得
const visualizerSettings = computed(() => audioStore.visualizerSettings);
const visualizerType = computed(() => visualizerSettings.value.type);
const barSettings = computed(() => visualizerSettings.value.bars);
const circleSettings = computed(() => visualizerSettings.value.circle);
const waveSettings = computed(() => visualizerSettings.value.wave);
const colorSettings = computed(() => visualizerSettings.value.color);

// AudioAnalyserが利用可能かどうか
const isAnalyzerAvailable = computed(() => {
  return audioStore.audioContext && audioStore.analyser && !audioStore.isLoading;
});

// キャンバスのリサイズ
const resizeCanvas = () => {
  if (!visualizerCanvas.value) return;
  
  const canvas = visualizerCanvas.value;
  const container = canvas.parentElement;
  
  if (container) {
    canvasWidth.value = container.clientWidth;
    canvasHeight.value = container.clientHeight;
    canvas.width = canvasWidth.value;
    canvas.height = canvasHeight.value;
  }
};

// アニメーションフレームの処理
const animate = () => {
  if (!isAnalyzerAvailable.value) {
    // 分析器がない場合は静的な背景を描画
    drawBackground();
    animationFrameId.value = requestAnimationFrame(animate);
    return;
  }
  
  // キャンバスをクリア
  clearCanvas();
  
  // 背景を描画
  drawBackground();
  
  // オーディオデータを取得
  const analyser = audioStore.analyser;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  
  try {
    // 選択されたビジュアライザータイプに基づいて描画
    switch (visualizerType.value) {
      case 'bars':
        drawBars(dataArray, bufferLength);
        break;
      case 'circle':
        drawCircle(dataArray, bufferLength);
        break;
      case 'wave':
        drawWave(dataArray, bufferLength);
        break;
      default:
        drawBars(dataArray, bufferLength);
    }
  } catch (error) {
    console.error('ビジュアライザー描画エラー:', error);
  }
  
  // 次のフレームを要求
  animationFrameId.value = requestAnimationFrame(animate);
};

// キャンバスをクリア
const clearCanvas = () => {
  if (!canvasContext.value) return;
  canvasContext.value.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
};

// 背景を描画
const drawBackground = () => {
  if (!canvasContext.value) return;
  
  const ctx = canvasContext.value;
  const background = audioStore.background;
  
  switch (background.type) {
    case 'color':
      // 単色背景
      ctx.fillStyle = background.color;
      ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
      break;
      
    case 'gradient':
      // グラデーション背景
      const colors = background.gradient.colors;
      const angle = background.gradient.angle;
      
      let gradient;
      const angleRad = (angle * Math.PI) / 180;
      const x1 = canvasWidth.value / 2 - Math.cos(angleRad) * canvasWidth.value;
      const y1 = canvasHeight.value / 2 - Math.sin(angleRad) * canvasHeight.value;
      const x2 = canvasWidth.value / 2 + Math.cos(angleRad) * canvasWidth.value;
      const y2 = canvasHeight.value / 2 + Math.sin(angleRad) * canvasHeight.value;
      
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      
      // グラデーションの色を設定
      if (colors.length >= 2) {
        for (let i = 0; i < colors.length; i++) {
          gradient.addColorStop(i / (colors.length - 1), colors[i]);
        }
      } else if (colors.length === 1) {
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[0]);
      } else {
        // デフォルトの色
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(1, '#222222');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
      break;
      
    case 'image':
      // 画像背景
      if (background.image) {
        try {
          // 画像を保持する変数が必要
          if (!background._imageElement) {
            background._imageElement = new Image();
            background._imageElement.src = background.image;
            background._imageElement.onload = () => {
              drawBackground(); // 画像読み込み完了時に再描画
            };
          }
          
          // 画像が読み込まれていれば描画
          if (background._imageElement.complete && background._imageElement.naturalWidth > 0) {
            ctx.globalAlpha = background.opacity || 1;
            
            // 画像をキャンバスサイズに合わせて描画
            ctx.drawImage(
              background._imageElement,
              0, 0,
              canvasWidth.value,
              canvasHeight.value
            );
            
            ctx.globalAlpha = 1;
          }
        } catch (error) {
          console.error('背景画像描画エラー:', error);
          
          // エラー時はデフォルトの背景色を使用
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
        }
      } else {
        // 画像が設定されていない場合はデフォルトの背景色
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
      }
      break;
      
    default:
      // デフォルトの背景色
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
  }
};

// バー形式のビジュアライザー
const drawBars = (dataArray, bufferLength) => {
  if (!canvasContext.value) return;
  
  const ctx = canvasContext.value;
  const settings = barSettings.value;
  const sensitivity = visualizerSettings.value.sensitivity || 1.0;
  
  // バーの数を決定
  const barCount = settings.count || 64;
  const barWidth = settings.width || 10;
  const barSpacing = settings.spacing || 2;
  const barMinHeight = settings.minHeight || 2;
  
  // バーの総幅を計算
  const totalBarWidth = barCount * (barWidth + barSpacing) - barSpacing;
  
  // バーの開始位置を計算（中央揃え）
  let startX = 0;
  if (settings.horizontalAlign === 'center') {
    startX = (canvasWidth.value - totalBarWidth) / 2;
  } else if (settings.horizontalAlign === 'right') {
    startX = canvasWidth.value - totalBarWidth;
  }
  
  // カラーの設定
  let barColor;
  if (colorSettings.value.type === 'gradient') {
    const gradient = ctx.createLinearGradient(0, canvasHeight.value, 0, 0);
    const colors = colorSettings.value.gradient.colors;
    
    if (colors.length >= 2) {
      for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(i / (colors.length - 1), colors[i]);
      }
    } else {
      gradient.addColorStop(0, '#3498DB');
      gradient.addColorStop(1, '#8E44AD');
    }
    
    barColor = gradient;
  } else {
    barColor = colorSettings.value.solid || '#3498DB';
  }
  
  // バーを描画
  for (let i = 0; i < barCount; i++) {
    // データのサンプリング
    const dataIndex = Math.floor(i * (bufferLength / barCount));
    const value = dataArray[dataIndex] / 255.0; // 0〜1に正規化
    
    // 感度を適用
    const scaledValue = Math.min(value * sensitivity, 1.0);
    
    // バーの高さを計算
    const barHeight = Math.max(scaledValue * canvasHeight.value, barMinHeight);
    
    // バーのX座標
    const x = startX + i * (barWidth + barSpacing);
    
    // バーの描画位置を決定
    let y;
    if (settings.verticalAlign === 'bottom') {
      y = canvasHeight.value - barHeight;
    } else if (settings.verticalAlign === 'middle') {
      y = (canvasHeight.value - barHeight) / 2;
    } else {
      y = 0;
    }
    
    // 周波数に基づく色の設定（オプション）
    if (colorSettings.value.type === 'frequency') {
      const frequencyColor = getFrequencyColor(dataIndex / bufferLength);
      ctx.fillStyle = frequencyColor;
    } else {
      ctx.fillStyle = barColor;
    }
    
    // 角丸バー
    if (settings.roundedTop) {
      const radius = barWidth / 2;
      
      if (barHeight > radius) {
        // 長方形の部分
        ctx.fillRect(x, y + radius, barWidth, barHeight - radius);
        
        // 上部の半円
        ctx.beginPath();
        ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 高さが半径より小さい場合は楕円を描画
        ctx.beginPath();
        ctx.ellipse(
          x + radius,
          y + barHeight / 2,
          radius,
          barHeight / 2,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else {
      // 通常の矩形バー
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }
};

// 円形ビジュアライザー
const drawCircle = (dataArray, bufferLength) => {
  if (!canvasContext.value) return;
  
  const ctx = canvasContext.value;
  const settings = circleSettings.value;
  const sensitivity = visualizerSettings.value.sensitivity || 1.0;
  
  // 円の基本情報
  const centerX = settings.centerX * canvasWidth.value;
  const centerY = settings.centerY * canvasHeight.value;
  const baseRadius = settings.radius || Math.min(canvasWidth.value, canvasHeight.value) * 0.3;
  const rotation = (settings.rotation * Math.PI) / 180; // 度数法からラジアンに変換
  const mirrorMode = settings.mirrorMode;
  
  // 色の設定
  let circleColor;
  if (colorSettings.value.type === 'gradient') {
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, baseRadius * 2
    );
    
    const colors = colorSettings.value.gradient.colors;
    if (colors.length >= 2) {
      for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(i / (colors.length - 1), colors[i]);
      }
    } else {
      gradient.addColorStop(0, '#3498DB');
      gradient.addColorStop(1, '#8E44AD');
    }
    
    circleColor = gradient;
  } else {
    circleColor = colorSettings.value.solid || '#3498DB';
  }
  
  // ポイントの数
  const pointCount = mirrorMode ? 180 : 360;
  const angleStep = (Math.PI * 2) / pointCount;
  
  ctx.beginPath();
  
  // 最初のポイントから描画を開始
  for (let i = 0; i < pointCount; i++) {
    // データサンプリング - データポイント数に合わせる
    const dataIndex = Math.floor(i * (bufferLength / pointCount));
    let value = dataArray[dataIndex] / 255.0; // 0〜1に正規化
    
    // 感度を適用
    value = Math.min(value * sensitivity, 1.0);
    
    // 半径を計算（ベース半径 + 音響反応）
    const radius = baseRadius * (1 + value * 0.5);
    
    // ミラーモードの場合は値を反映
    const angle = i * angleStep + rotation;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    // ミラーモードの反対側を描画
    if (mirrorMode && i < pointCount / 2) {
      const mirrorIndex = pointCount - 1 - i;
      const mirrorDataIndex = Math.floor(mirrorIndex * (bufferLength / pointCount));
      let mirrorValue = dataArray[mirrorDataIndex] / 255.0;
      mirrorValue = Math.min(mirrorValue * sensitivity, 1.0);
      
      const mirrorRadius = baseRadius * (1 + mirrorValue * 0.5);
      const mirrorAngle = mirrorIndex * angleStep + rotation;
      const mirrorX = centerX + mirrorRadius * Math.cos(mirrorAngle);
      const mirrorY = centerY + mirrorRadius * Math.sin(mirrorAngle);
      
      // 反対側の点を記録
      ctx.lineTo(mirrorX, mirrorY);
    }
  }
  
  // 周波数に基づく色の設定（オプション）
  if (colorSettings.value.type === 'frequency') {
    // 円形の場合、グラデーションが効果的
    const gradient = ctx.createRadialGradient(
      centerX, centerY, baseRadius * 0.5,
      centerX, centerY, baseRadius * 1.5
    );
    
    const frequencyColors = colorSettings.value.frequencyColors || [];
    if (frequencyColors.length >= 2) {
      for (let i = 0; i < frequencyColors.length; i++) {
        const stop = i / (frequencyColors.length - 1);
        gradient.addColorStop(stop, frequencyColors[i].color);
      }
    } else {
      gradient.addColorStop(0, '#3498DB');
      gradient.addColorStop(1, '#8E44AD');
    }
    
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = circleColor;
  }
  
  // 閉じたパスを描画
  ctx.closePath();
  ctx.fill();
};

// 波形ビジュアライザー
const drawWave = (dataArray, bufferLength) => {
  if (!canvasContext.value) return;
  
  const ctx = canvasContext.value;
  const settings = waveSettings.value;
  const sensitivity = visualizerSettings.value.sensitivity || 1.0;
  
  // 波形の設定
  const points = settings.points || 100;
  const amplitude = settings.amplitude || 50;
  const smoothing = Math.max(0, Math.min(settings.smoothing || 0.5, 0.99));
  
  // 色の設定
  let waveColor;
  if (colorSettings.value.type === 'gradient') {
    const gradient = ctx.createLinearGradient(0, 0, canvasWidth.value, 0);
    const colors = colorSettings.value.gradient.colors;
    
    if (colors.length >= 2) {
      for (let i = 0; i < colors.length; i++) {
        gradient.addColorStop(i / (colors.length - 1), colors[i]);
      }
    } else {
      gradient.addColorStop(0, '#3498DB');
      gradient.addColorStop(1, '#8E44AD');
    }
    
    waveColor = gradient;
  } else {
    waveColor = colorSettings.value.solid || '#3498DB';
  }
  
  ctx.strokeStyle = waveColor;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  
  // 波形を描画
  ctx.beginPath();
  
  // 前回のポイント位置を記録して波形をスムーズにする
  let lastX = 0;
  let lastY = canvasHeight.value / 2;
  
  for (let i = 0; i < points; i++) {
    // データのサンプリング
    const dataIndex = Math.floor(i * (bufferLength / points));
    let value = dataArray[dataIndex] / 255.0; // 0〜1に正規化
    
    // 感度を適用
    value = Math.min(value * sensitivity, 1.0);
    
    // X座標
    const x = (i / (points - 1)) * canvasWidth.value;
    
    // Y座標（センターラインを基準に上下に振れる）
    let y = canvasHeight.value / 2 + value * amplitude * Math.sin(i * 0.1);
    
    // スムージングを適用
    if (i > 0 && smoothing > 0) {
      y = lastY * smoothing + y * (1 - smoothing);
    }
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // 曲線で接続
      const cpx = (lastX + x) / 2;
      const cpy = (lastY + y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, x, y);
    }
    
    lastX = x;
    lastY = y;
  }
  
  ctx.stroke();
  
  // 波形の下部を塗りつぶす（オプション）
  if (settings.fill) {
    ctx.lineTo(canvasWidth.value, canvasHeight.value);
    ctx.lineTo(0, canvasHeight.value);
    ctx.closePath();
    
    // 透明度を持つ塗りつぶし
    ctx.fillStyle = waveColor;
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
};

// 周波数に応じた色を取得
const getFrequencyColor = (ratio) => {
  const frequencyColors = colorSettings.value.frequencyColors || [];
  
  if (frequencyColors.length === 0) {
    return '#3498DB';
  }
  
  if (frequencyColors.length === 1) {
    return frequencyColors[0].color;
  }
  
  // 周波数比率に基づいて色を補間
  const index = ratio * (frequencyColors.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  
  if (lowerIndex === upperIndex) {
    return frequencyColors[lowerIndex].color;
  }
  
  const t = index - lowerIndex;
  return interpolateColor(
    frequencyColors[lowerIndex].color,
    frequencyColors[upperIndex].color,
    t
  );
};

// 色の補間
const interpolateColor = (color1, color2, ratio) => {
  // 16進数の色を RGB に変換
  const hex2rgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 };
  };
  
  // RGB値を16進数に変換
  const rgb2hex = (rgb) => {
    return (
      '#' +
      ((1 << 24) | (rgb.r << 16) | (rgb.g << 8) | rgb.b)
        .toString(16)
        .slice(1)
    );
  };
  
  // 色の補間
  const rgb1 = hex2rgb(color1);
  const rgb2 = hex2rgb(color2);
  
  const interpolatedRgb = {
    r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio),
    g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio),
    b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio)
  };
  
  return rgb2hex(interpolatedRgb);
};

// 設定変更時の再描画
watch(() => audioStore.visualizerSettings, () => {
  if (!animationFrameId.value) {
    animate();
  }
}, { deep: true });

watch(() => audioStore.background, () => {
  drawBackground();
}, { deep: true });

// ライフサイクルフック
onMounted(() => {
  // キャンバス要素の取得とコンテキストの初期化
  if (visualizerCanvas.value) {
    canvasContext.value = visualizerCanvas.value.getContext('2d');
    
    // キャンバスのサイズを設定
    resizeCanvas();
    
    // リサイズイベントを監視
    window.addEventListener('resize', resizeCanvas);
    
    // アニメーションを開始
    animate();
  }
});

onBeforeUnmount(() => {
  // リソースのクリーンアップ
  window.removeEventListener('resize', resizeCanvas);
  
  // アニメーションを停止
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = null;
  }
});
</script>

<style scoped>
.visualizer-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #000;
}

.visualizer-canvas {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
