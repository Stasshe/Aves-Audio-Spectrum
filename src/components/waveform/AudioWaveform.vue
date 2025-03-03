<template>
  <div class="waveform-container" ref="waveformContainer">
    <canvas ref="waveformCanvas" class="waveform-canvas" height="80"></canvas>
    <div class="playhead" :style="{ left: `${playheadPosition}%` }"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
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
  if (!audioStore.duration) return 0;
  return (audioStore.currentTime / audioStore.duration) * 100;
});

// 波形データを生成する関数
const generateWaveformData = async () => {
  if (!audioStore.audioBuffer || isRendering.value) return;
  
  isRendering.value = true;
  
  try {
    const audioBuffer = audioStore.audioBuffer;
    const channelData = audioBuffer.getChannelData(0); // 左チャンネルを使用
    const samples = 200; // 表示するサンプル数
    const blockSize = Math.floor(channelData.length / samples);
    const waveform = [];
    
    for (let i = 0; i < samples; i++) {
      let start = i * blockSize;
      let end = start + blockSize;
      let max = 0;
      
      for (let j = start; j < end; j++) {
        const amplitude = Math.abs(channelData[j]);
        if (amplitude > max) {
          max = amplitude;
        }
      }
      
      waveform.push(max);
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
  if (!audioStore.audioBuffer) return;
  
  const canvas = waveformCanvas.value;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const position = x / rect.width;
  
  audioStore.currentTime = position * audioStore.duration;
  
  // 再生中なら一旦停止してから再開
  if (audioStore.isPlaying) {
    const wasPlaying = true;
    audioStore.pauseAudio();
    
    setTimeout(() => {
      if (wasPlaying) {
        audioStore.playAudio();
      }
    }, 50);
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
});
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

.playhead {
  position: absolute;
  top: 0;
  height: 100%;
  width: 2px;
  background-color: #ff5722;
  pointer-events: none;
}
</style>
