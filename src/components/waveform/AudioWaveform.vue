<template>
  <div class="waveform-container" ref="waveformContainer">
    <canvas ref="waveformCanvas" class="waveform-canvas" :height="props.height"></canvas>
    <div class="playhead" :style="{ left: `${playheadPosition}%` }"></div>
    
    <!-- ミニローディングインジケータ -->
    <div v-if="isRendering" class="waveform-loading">
      <div class="waveform-loading-spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onBeforeUnmount } from 'vue';
import { useAudioStore } from '@/stores/audioStore';

const props = defineProps({
  height: {
    type: Number,
    default: 80
  }
});

const audioStore = useAudioStore();
const waveformContainer = ref(null);
const waveformCanvas = ref(null);
const waveformData = ref([]);
const isRendering = ref(false);

const playheadPosition = computed(() => {
  if (!audioStore.audioBuffer || audioStore.duration <= 0) return 0;
  const position = audioStore.currentTime / audioStore.duration;
  // 有効な範囲内に制限（NaNや無限大を防ぐ）
  return isNaN(position) || !isFinite(position) ? 0 : Math.max(0, Math.min(position, 1)) * 100;
});

// 波形データを生成する関数
const generateWaveformData = async () => {
  if (!audioStore.audioBuffer || isRendering.value) return;
  
  isRendering.value = true;
  
  try {
    // 波形生成を少し遅延させてローディングアニメーションを表示できるようにする
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const audioBuffer = audioStore.audioBuffer;
    const channelData = audioBuffer.getChannelData(0); // 左チャンネルを使用
    const samples = 200; // 表示するサンプル数
    const blockSize = Math.floor(channelData.length / samples) || 1; // 0で割るのを防ぐ
    const waveform = [];
    
    // 波形データの計算
    for (let i = 0; i < samples; i++) {
      let start = i * blockSize;
      let end = Math.min(start + blockSize, channelData.length);
      let max = 0;
      
      for (let j = start; j < end; j++) {
        const amplitude = Math.abs(channelData[j]);
        if (amplitude > max) {
          max = amplitude;
        }
      }
      
      // NaNや無限大を防ぐ
      waveform.push(isNaN(max) || !isFinite(max) ? 0 : max);
    }
    
    waveformData.value = waveform;
    drawWaveform();
  } catch (error) {
    console.error('波形生成エラー:', error);
  } finally {
    isRendering.value = false;
  }
};

// 波形を描画する関数
const drawWaveform = () => {
  if (!waveformCanvas.value || waveformData.value.length === 0) return;
  
  const canvas = waveformCanvas.value;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // キャンバスをクリア
  ctx.clearRect(0, 0, width, height);
  
  const data = waveformData.value;
  const barWidth = width / data.length;
  const centerY = height / 2;
  
  // グラデーションの設定
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(65, 105, 225, 0.8)');
  gradient.addColorStop(1, 'rgba(100, 149, 237, 0.4)');
  
  ctx.fillStyle = gradient;
  
  // 波形の描画
  for (let i = 0; i < data.length; i++) {
    const x = i * barWidth;
    const amplitude = data[i] * height * 0.8; // 80%の高さまで使用
    
    // 上半分
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x, centerY - amplitude / 2);
    ctx.lineTo(x + barWidth, centerY - amplitude / 2);
    ctx.lineTo(x + barWidth, centerY);
    ctx.closePath();
    ctx.fill();
    
    // 下半分
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x, centerY + amplitude / 2);
    ctx.lineTo(x + barWidth, centerY + amplitude / 2);
    ctx.lineTo(x + barWidth, centerY);
    ctx.closePath();
    ctx.fill();
  }
  
  // 目盛線を追加
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(width, centerY);
  ctx.stroke();
};

// ウィンドウサイズが変わったときにキャンバスサイズを調整
const resizeCanvas = () => {
  if (!waveformContainer.value || !waveformCanvas.value) return;
  
  const canvas = waveformCanvas.value;
  canvas.width = waveformContainer.value.clientWidth;
  canvas.height = props.height;
  
  drawWaveform();
};

// オーディオバッファが変わったら波形を生成
watch(() => audioStore.audioBuffer, async (newBuffer) => {
  if (newBuffer) {
    await generateWaveformData();
  }
});

// 波形クリックで再生位置を変更する
const handleWaveformClick = (event) => {
  if (!audioStore.audioBuffer || !audioStore.duration) return;
  
  try {
    const canvas = waveformCanvas.value;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const position = x / rect.width;
    
    // 範囲チェックして値を制限
    const positionValue = Math.max(0, Math.min(position, 1));
    const newTime = positionValue * audioStore.duration;
    
    // 再生位置を変更するstore関数を使用
    audioStore.seekAudio(newTime);
  } catch (error) {
    console.error('波形クリックエラー:', error);
  }
};

onMounted(() => {
  // キャンバスサイズを初期化
  resizeCanvas();
  
  // ウィンドウリサイズイベント
  window.addEventListener('resize', resizeCanvas);
  
  // すでにオーディオバッファがあれば波形を生成
  if (audioStore.audioBuffer) {
    generateWaveformData();
  }
  
  // 波形クリックイベント
  if (waveformCanvas.value) {
    waveformCanvas.value.addEventListener('click', handleWaveformClick);
  }
  
  // クリーンアップ関数を定義
  onBeforeUnmount(() => {
    // ウィンドウリサイズイベントの解除
    window.removeEventListener('resize', resizeCanvas);
    
    // 波形クリックイベントの解除
    if (waveformCanvas.value) {
      waveformCanvas.value.removeEventListener('click', handleWaveformClick);
    }
  });
});

// currentTimeが変更されたら、プレイヘッドの位置も更新
watch(() => audioStore.currentTime, () => {
  // プレイヘッドの位置を更新（計算済みのplayheadPositionを使用）
  // Vue の reactive システムがこの監視によって自動的に playheadPosition の再計算と再レンダリングを行う
});

// 再生位置を常に追跡するために、現在時間の変更を監視
watch(() => audioStore.currentTime, (newTime) => {
  // プレイヘッドの位置は reactive なのでここでは何もしなくても自動的に更新される
  // ただし、波形を描画する必要がある場合は以下を呼び出す
  if (waveformData.value.length > 0) {
    // 定期的に波形を再描画（オプション）
    // 波形そのものは静的なので、必要なければコメントアウト
    // drawWaveform();
  }
}, { immediate: true });
</script>

<style scoped>
.waveform-container {
  position: relative;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.waveform-canvas {
  display: block;
  width: 100%;
}

/* プレイヘッドのスタイルを改善 */
.playhead {
  position: absolute;
  top: 0;
  height: 100%;
  width: 2px;
  background-color: #ff5722;
  box-shadow: 0 0 4px rgba(255, 87, 34, 0.7);
  pointer-events: none;
  transition: left 0.01s linear; /* アニメーション時間を短縮 */
}

/* 波形ローディングインジケータ */
.waveform-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.waveform-loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
