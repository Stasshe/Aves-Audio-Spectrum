<template>
  <div class="visualizer-container">
    <canvas
      ref="canvas"
      id="visualizer-canvas"
      class="visualizer-canvas"
    ></canvas>
    
    <!-- オーバーレイモード時のメッセージ -->
    <div v-if="showOverlay" class="overlay-message">
      {{ overlayMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { createVisualizer } from '@/utils/visualizer';
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();
const canvas = ref(null);
const showOverlay = ref(false);
const overlayMessage = ref('');

// ビジュアライザーのアニメーションID
let animationId = null;

// ビジュアライザーの初期化
const initVisualizer = () => {
  if (!audioStore.analyser || !canvas.value) return;
  
  // 既存のビジュアライザーを破棄
  if (audioStore.visualizer && typeof audioStore.visualizer.destroy === 'function') {
    audioStore.visualizer.destroy();
  }
  
  // キャンバスのサイズをコンテナに合わせる
  const container = canvas.value.parentElement;
  if (container) {
    canvas.value.width = container.clientWidth;
    canvas.value.height = container.clientHeight;
  }
  
  // 新しいビジュアライザーを作成
  const visualizer = createVisualizer(canvas.value, audioStore.analyser, audioStore);
  
  // 作成したビジュアライザーをストアに保存
  audioStore.visualizer = visualizer;
  
  // アニメーションを開始
  startAnimation();
};

// アニメーションループの開始
const startAnimation = () => {
  if (!audioStore.visualizer) return;
  
  const animate = () => {
    audioStore.visualizer.draw();
    animationId = requestAnimationFrame(animate);
  };
  
  // 前のアニメーションをクリア
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }
  
  // 新しいアニメーションを開始
  animationId = requestAnimationFrame(animate);
};

// アニメーションループの停止
const stopAnimation = () => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
};

// オーバーレイメッセージを表示
const showOverlayMessage = (message, duration = 2000) => {
  overlayMessage.value = message;
  showOverlay.value = true;
  
  setTimeout(() => {
    showOverlay.value = false;
  }, duration);
};

// ビジュアライザー設定の変更を監視
watch(() => audioStore.visualizerSettings, () => {
  if (audioStore.visualizer) {
    audioStore.visualizer.updateSettings();
  }
}, { deep: true });

// 背景設定の変更を監視
watch(() => audioStore.background, () => {
  if (audioStore.visualizer) {
    audioStore.visualizer.updateSettings();
  }
}, { deep: true });

// マウント時にビジュアライザーを初期化
onMounted(() => {
  // オーディオコンテキストの作成
  if (!audioStore.audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioStore.audioContext = new AudioContext();
  }
  
  // アナライザーノードの作成
  if (!audioStore.analyser) {
    audioStore.analyser = audioStore.audioContext.createAnalyser();
    audioStore.analyser.fftSize = audioStore.visualizerSettings.fftSize;
    audioStore.analyser.smoothingTimeConstant = audioStore.visualizerSettings.smoothingTimeConstant;
  }
  
  // ビジュアライザーの初期化
  initVisualizer();
  
  // ウィンドウのリサイズイベントハンドラ
  const handleResize = () => {
    if (canvas.value) {
      const container = canvas.value.parentElement;
      if (container) {
        canvas.value.width = container.clientWidth;
        canvas.value.height = container.clientHeight;
      }
    }
    initVisualizer();
  };
  
  window.addEventListener('resize', handleResize);
  
  // クリーンアップ関数をonBeforeUnmountに渡す
  onBeforeUnmount(() => {
    stopAnimation();
    
    if (audioStore.visualizer && typeof audioStore.visualizer.destroy === 'function') {
      audioStore.visualizer.destroy();
    }
    
    window.removeEventListener('resize', handleResize);
  });
});

// 外部からアクセスできるようにexpose
defineExpose({
  showOverlayMessage,
  canvas
});
</script>

<style scoped>
.visualizer-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px;
  max-height: 70vh;
  background-color: #000;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.visualizer-canvas {
  display: block;
  width: 100%;
  height: 100%;
  max-height: 100%;
}

.overlay-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 16px;
  pointer-events: none;
  z-index: 10;
}
</style>
