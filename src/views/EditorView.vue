<template>
  <div>
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- プレビューエリア -->
      <div class="flex-1">
        <div class="card mb-6">
          <h2 class="text-xl font-bold mb-4">プレビュー</h2>
          <div v-if="!audioStore.audioFile" class="bg-gray-200 rounded-lg aspect-video flex items-center justify-center">
            <p class="text-gray-500">音声ファイルをアップロードしてください</p>
          </div>
          <div v-else class="relative">
            <canvas 
              ref="visualizerCanvas" 
              class="w-full aspect-video rounded-lg"
            ></canvas>
            
            <!-- オーディオコントロール -->
            <div class="mt-4 flex items-center gap-4">
              <button 
                @click="togglePlayback" 
                class="btn btn-primary"
              >
                {{ audioStore.isPlaying ? '停止' : '再生' }}
              </button>
              
              <div class="relative flex-1 h-2 bg-gray-300 rounded cursor-pointer" @click="seekAudio">
                <div class="absolute left-0 top-0 h-full bg-secondary rounded" :style="{width: `${(audioStore.currentTime / audioStore.duration) * 100}%`}"></div>
              </div>
              
              <span class="text-sm">
                {{ formatTime(audioStore.currentTime) }} / {{ formatTime(audioStore.duration) }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- 波形表示 -->
        <div class="card">
          <h2 class="text-xl font-bold mb-4">波形</h2>
          <div ref="waveformContainer" class="w-full h-28"></div>
        </div>
      </div>
      
      <!-- 設定エリア -->
      <div class="w-full lg:w-96">
        <AudioUploader v-if="!audioStore.audioFile" />
        
        <div v-else>
          <div class="card mb-6">
            <h2 class="text-xl font-bold mb-4">スペクトラム設定</h2>
            <VisualizerSettings />
          </div>
          
          <div class="card mb-6">
            <h2 class="text-xl font-bold mb-4">背景設定</h2>
            <BackgroundSettings />
          </div>
          
          <div class="card mb-6">
            <h2 class="text-xl font-bold mb-4">イコライザー</h2>
            <EqualizerSettings />
          </div>
          
          <div class="card mb-6">
            <h2 class="text-xl font-bold mb-4">エクスポート設定</h2>
            <ExportSettings />
          </div>
          
          <div class="mb-6">
            <button @click="exportVideo" class="btn btn-primary w-full py-3">
              ビデオを作成
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useAudioStore } from '@/stores/audioStore';
import AudioUploader from '@/components/editor/AudioUploader.vue';
import VisualizerSettings from '@/components/editor/VisualizerSettings.vue';
import BackgroundSettings from '@/components/editor/BackgroundSettings.vue';
import EqualizerSettings from '@/components/editor/EqualizerSettings.vue';
import ExportSettings from '@/components/editor/ExportSettings.vue';
import { createVisualizer } from '@/utils/visualizer';
import { exportVideoFile } from '@/utils/export';

// 動的インポート - ビルド時のエラーを回避
let WaveSurfer;

const audioStore = useAudioStore();
const visualizerCanvas = ref(null);
const waveformContainer = ref(null);
let wavesurfer = null;
let visualizer = null;
let audioContext = null;
let analyser = null;
let animationFrame = null;

// 時間のフォーマット (mm:ss)
const formatTime = (seconds) => {
  if (!seconds) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 再生/停止の切り替え
const togglePlayback = () => {
  if (audioStore.isPlaying) {
    wavesurfer.pause();
    audioStore.isPlaying = false;
  } else {
    wavesurfer.play();
    audioStore.isPlaying = true;
  }
};

// シーク処理
const seekAudio = (e) => {
  const percent = e.offsetX / e.target.offsetWidth;
  const seekTime = percent * audioStore.duration;
  wavesurfer.seekTo(percent);
  audioStore.currentTime = seekTime;
};

// ビデオエクスポート
const exportVideo = async () => {
  try {
    await exportVideoFile(
      audioStore.audioFile,
      visualizerCanvas.value,
      audioStore.exportSettings
    );
  } catch (error) {
    console.error('エクスポートエラー:', error);
    alert('ビデオエクスポート中にエラーが発生しました。');
  }
};

// オーディオの読み込みと処理
const setupAudio = async () => {
  if (!audioStore.audioFile) return;
  
  // 既存のインスタンスをクリーンアップ
  if (wavesurfer) {
    wavesurfer.destroy();
  }
  if (audioContext) {
    audioContext.close();
  }
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  
  try {
    // WaveSurferを動的にロード
    if (!WaveSurfer) {
      WaveSurfer = (await import('wavesurfer.js')).default;
    }
    
    // WaveSurferの初期化
    wavesurfer = WaveSurfer.create({
      container: waveformContainer.value,
      waveColor: '#3498DB',
      progressColor: '#16A085',
      cursorColor: '#2C3E50',
      height: 80,
      responsive: true,
    });
    
    // オーディオファイルの読み込み
    wavesurfer.loadBlob(audioStore.audioFile);
    
    // イベントリスナーの設定
    wavesurfer.on('ready', () => {
      audioStore.duration = wavesurfer.getDuration();
      
      // オーディオコンテキストと分析ノードのセットアップ
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = audioStore.visualizerSettings.fftSize;
      analyser.smoothingTimeConstant = audioStore.visualizerSettings.smoothingTimeConstant;
      
      // WaveSurferからメディア要素を取得
      const mediaElement = wavesurfer.getMediaElement();
      if (mediaElement) {
        const source = audioContext.createMediaElementSource(mediaElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        // ビジュアライザーの初期化
        visualizer = createVisualizer(visualizerCanvas.value, analyser, audioStore);
        
        // アニメーションループの開始
        const animate = () => {
          if (audioStore.isPlaying) {
            audioStore.currentTime = wavesurfer.getCurrentTime();
            visualizer.draw();
          }
          animationFrame = requestAnimationFrame(animate);
        };
        animate();
      }
    });
    
    wavesurfer.on('finish', () => {
      audioStore.isPlaying = false;
      audioStore.currentTime = 0;
    });
  } catch (error) {
    console.error('オーディオ初期化エラー:', error);
    alert('オーディオの初期化に失敗しました。');
  }
};

// 設定変更時にビジュアライザーを更新
watch(
  () => [
    audioStore.visualizerSettings,
    audioStore.background
  ],
  () => {
    if (visualizer) {
      visualizer.updateSettings();
    }
  },
  { deep: true }
);

// コンポーネントのマウント時
onMounted(() => {
  if (audioStore.audioFile) {
    setupAudio();
  }
});

// コンポーネントのアンマウント時
onUnmounted(() => {
  if (wavesurfer) {
    wavesurfer.destroy();
  }
  if (audioContext) {
    audioContext.close();
  }
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});

// audioFile変更時のリスナー
watch(() => audioStore.audioFile, setupAudio);
</script>
