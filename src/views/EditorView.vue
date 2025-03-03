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
import { createAudioAnalyzer, getAudioFileInfo } from '@/utils/audioAnalyzer'; 
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
let audioAnalyzer = null;
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
  if (wavesurfer) {
    if (audioStore.isPlaying) {
      wavesurfer.pause();
      audioStore.isPlaying = false;
    } else {
      wavesurfer.play();
      audioStore.isPlaying = true;
    }
  }
};

// シーク処理
const seekAudio = (e) => {
  if (wavesurfer && audioStore.duration > 0) {
    const percent = e.offsetX / e.target.offsetWidth;
    const seekTime = percent * audioStore.duration;
    wavesurfer.seekTo(percent);
    audioStore.currentTime = seekTime;
  }
};

// ビデオエクスポート
const exportVideo = async () => {
  try {
    if (!visualizer || !audioStore.audioFile) {
      alert('オーディオファイルをロードしてください');
      return;
    }
    
    // 現在の再生状態を記憶
    const wasPlaying = audioStore.isPlaying;
    
    // エクスポート中は停止
    if (wasPlaying) {
      wavesurfer.pause();
      audioStore.isPlaying = false;
    }
    
    await exportVideoFile(
      audioStore.audioFile,
      visualizerCanvas.value,
      audioStore.exportSettings,
      visualizer,
      audioContext
    );
    
    // エクスポート後、元の再生状態に戻す
    if (wasPlaying) {
      wavesurfer.play();
      audioStore.isPlaying = true;
    }
  } catch (error) {
    console.error('エクスポートエラー:', error);
  }
};

// オーディオの読み込みと処理
const setupAudio = async () => {
  if (!audioStore.audioFile) return;
  
  try {
    // 既存のインスタンスをクリーンアップ
    cleanupResources();
    
    // WaveSurferを動的にロード
    if (!WaveSurfer) {
      WaveSurfer = (await import('wavesurfer.js')).default;
    }
    
    // オーディオファイルのメタデータを取得
    try {
      const audioInfo = await getAudioFileInfo(audioStore.audioFile);
      audioStore.updateAudioMetadata(audioInfo);
    } catch (error) {
      console.error('オーディオメタデータ読み込みエラー:', error);
    }
    
    // オーディオコンテキストを作成
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // オーディオコンテキストが停止状態の場合は再開
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // WaveSurferの初期化
    wavesurfer = WaveSurfer.create({
      container: waveformContainer.value,
      waveColor: '#3498DB',
      progressColor: '#16A085',
      cursorColor: '#2C3E50',
      height: 80,
      responsive: true,
      backend: 'MediaElement', // より安定したバックエンド
      normalize: true, // 波形を正規化
    });
    
    // オーディオファイルの読み込み
    wavesurfer.loadBlob(audioStore.audioFile);
    
    // イベントリスナーの設定
    wavesurfer.on('ready', async () => {
      try {
        // 期間の確認
        audioStore.duration = wavesurfer.getDuration();
        
        // メディア要素から分析ノードをセットアップ
        const mediaElement = wavesurfer.getMediaElement();
        
        if (!mediaElement) {
          throw new Error('メディア要素を取得できませんでした');
        }
        
        // 分析ノードを作成
        analyser = audioContext.createAnalyser();
        analyser.fftSize = audioStore.visualizerSettings.fftSize;
        analyser.smoothingTimeConstant = audioStore.visualizerSettings.smoothingTimeConstant;
        
        // 拡張オーディオ解析器を作成
        audioAnalyzer = createAudioAnalyzer(audioContext, mediaElement, {
          fftSize: audioStore.visualizerSettings.fftSize,
          smoothingTimeConstant: audioStore.visualizerSettings.smoothingTimeConstant
        });
        
        // イコライザーのセットアップ
        if (audioStore.applyEqToAudio) {
          audioAnalyzer.setupEqualizer(audioStore.equalizerBands);
        }
        
        // ビジュアライザーの初期化
        analyser = audioAnalyzer.analyzer;
        visualizer = createVisualizer(visualizerCanvas.value, analyser, audioStore);
        
        // 初回描画を強制
        visualizer.draw();
        
        // アニメーションループの開始
        startAnimationLoop();
      } catch (error) {
        console.error('オーディオ処理エラー:', error);
        alert('オーディオの処理中にエラーが発生しました。');
      }
    });
    
    wavesurfer.on('error', (err) => {
      console.error('WaveSurferエラー:', err);
      alert('オーディオファイルの読み込み中にエラーが発生しました。');
    });
    
    wavesurfer.on('finish', () => {
      audioStore.isPlaying = false;
      audioStore.currentTime = 0;
    });
  } catch (error) {
    console.error('オーディオセットアップエラー:', error);
    alert('オーディオのセットアップに失敗しました。');
  }
};

// アニメーションループを開始
const startAnimationLoop = () => {
  let forceDraw = true; // 初回描画を強制
  
  const animate = () => {
    if (audioStore.isPlaying || forceDraw) {
      if (wavesurfer) {
        audioStore.currentTime = wavesurfer.getCurrentTime();
      }
      
      if (visualizer) {
        visualizer.draw();
      }
    }
    
    animationFrame = requestAnimationFrame(animate);
    
    if (forceDraw) forceDraw = false;
  };
  
  animate();
};

// イコライザー設定を更新
watch(() => audioStore.equalizerBands, (newBands) => {
  if (audioAnalyzer && audioStore.applyEqToAudio) {
    const gains = newBands.map(band => band.gain);
    audioAnalyzer.updateEqualizerGains(gains);
  }
}, { deep: true });

// イコライザー適用設定の変更を監視
watch(() => audioStore.applyEqToAudio, (applyEq) => {
  if (audioAnalyzer) {
    if (applyEq) {
      audioAnalyzer.setupEqualizer(audioStore.equalizerBands);
    } else {
      // イコライザーのゲインをすべてゼロに設定
      const neutralGains = audioStore.equalizerBands.map(() => 0);
      audioAnalyzer.updateEqualizerGains(neutralGains);
    }
  }
});

// 可視化設定の変更を監視
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

// リソースのクリーンアップ
const cleanupResources = () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  
  if (audioAnalyzer) {
    audioAnalyzer.destroy();
    audioAnalyzer = null;
  }
  
  if (visualizer) {
    visualizer.destroy();
    visualizer = null;
  }
  
  if (wavesurfer) {
    wavesurfer.destroy();
    wavesurfer = null;
  }
  
  if (audioContext) {
    audioContext.close().catch(console.error);
    audioContext = null;
  }
  
  analyser = null;
};

// コンポーネントのマウント時
onMounted(() => {
  if (audioStore.audioFile) {
    setupAudio();
  }
  
  // iOS Safari対応: ユーザーインタラクションが必要なケース向け
  document.addEventListener('click', function initAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('AudioContext resumed successfully');
      });
    }
    document.removeEventListener('click', initAudioContext);
  });
});

// コンポーネントのアンマウント時
onUnmounted(() => {
  cleanupResources();
});

// audioFile変更時のリスナー
watch(() => audioStore.audioFile, setupAudio);
</script>
