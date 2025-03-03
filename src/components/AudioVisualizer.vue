<template>
  <div class="audio-visualizer">
    <div class="bg-gray-100 p-6 rounded-lg shadow-md">
      <div class="mb-6">
        <h2 class="text-xl font-semibold mb-3">オーディオビジュアライザー</h2>
        <div class="flex flex-wrap gap-4">
          <label class="block">
            <span class="text-gray-700">オーディオファイルを選択：</span>
            <input 
              type="file" 
              accept="*"
              class="mt-1 block w-full rounded border-gray-300 shadow-sm"
              @change="handleFileUpload" 
            />
          </label>
        </div>
      </div>
      
      <div v-if="audioFile" class="mb-6">
        <audio ref="audioElement" controls class="w-full"></audio>
      </div>
      
      <!-- ビジュアライザーキャンバス -->
      <div class="relative">
        <canvas 
          ref="visualizerCanvas" 
          width="800" 
          height="400"
          class="bg-black w-full rounded-lg"
        ></canvas>
      </div>
      
      <!-- エクスポート設定 -->
      <div v-if="audioFile" class="mt-6">
        <h3 class="text-lg font-medium mb-3">エクスポート設定</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">解像度</label>
            <select v-model="exportSettings.resolution" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="720p">HD (1280x720)</option>
              <option value="1080p">Full HD (1920x1080)</option>
              <option value="4k">4K (3840x2160)</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">フレームレート</label>
            <select v-model="exportSettings.fps" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option :value="24">24 fps</option>
              <option :value="30">30 fps</option>
              <option :value="60">60 fps</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">形式</label>
            <select v-model="exportSettings.format" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
              <option value="gif">GIF</option>
            </select>
          </div>
        </div>
        
        <button 
          @click="exportVideo"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          :disabled="isProcessing"
        >
          {{ isProcessing ? '処理中...' : 'ビデオをエクスポート' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { exportVideoFile } from '@/utils/export.js';

export default {
  name: 'AudioVisualizer',
  
  setup() {
    const audioElement = ref(null);
    const visualizerCanvas = ref(null);
    const audioFile = ref(null);
    const isProcessing = ref(false);
    
    // エクスポート設定
    const exportSettings = ref({
      resolution: '1080p',
      fps: 30,
      format: 'mp4',
    });
    
    // 選択された解像度に基づいて幅と高さを計算
    const dimensions = computed(() => {
      switch(exportSettings.value.resolution) {
        case '720p': return { width: 1280, height: 720 };
        case '1080p': return { width: 1920, height: 1080 };
        case '4k': return { width: 3840, height: 2160 };
        default: return { width: 1920, height: 1080 };
      }
    });
    
    // オーディオファイルが選択されたときの処理
    const handleFileUpload = (event) => {
      const files = event.target.files;
      if (files.length > 0) {
        audioFile.value = files[0];
        
        // オーディオエレメントにファイルをセット
        const url = URL.createObjectURL(audioFile.value);
        audioElement.value.src = url;
        
        // オーディオ再生の設定
        setupAudioVisualizer();
      }
    };
    
    // ビジュアライザーのセットアップ
    const setupAudioVisualizer = () => {
      // 実際のビジュアライザーの実装
      // この例では簡単なスペクトラムアナライザーを実装
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const audioSource = audioContext.createMediaElementSource(audioElement.value);
      
      audioSource.connect(analyser);
      analyser.connect(audioContext.destination);
      
      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const canvas = visualizerCanvas.value;
      const canvasCtx = canvas.getContext('2d');
      
      // ビジュアライザーを描画する関数
      const draw = () => {
        requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);
        
        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 255 * canvas.height;
          
          // バーの色をグラデーションにする
          const r = 255 * (i / bufferLength);
          const g = 50;
          const b = 255 - (i / bufferLength) * 255;
          
          canvasCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          
          x += barWidth + 1;
        }
      };
      
      // オーディオ再生開始時にビジュアライザーを開始
      audioElement.value.addEventListener('play', () => {
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        draw();
      });
    };
    
    // ビデオのエクスポート
    const exportVideo = async () => {
      if (!audioFile.value) return;
      
      try {
        isProcessing.value = true;
        
        // ビデオ設定を準備
        const videoSettings = {
          width: dimensions.value.width,
          height: dimensions.value.height,
          fps: exportSettings.value.fps,
          format: exportSettings.value.format,
          videoBitrate: '8000k', // ビットレート（高画質設定）
        };
        
        // エクスポート処理を実行
        await exportVideoFile(audioFile.value, visualizerCanvas.value, videoSettings);
        
      } catch (error) {
        console.error('ビデオエクスポートエラー:', error);
        alert('エクスポート中にエラーが発生しました: ' + error.message);
      } finally {
        isProcessing.value = false;
      }
    };
    
    return {
      audioElement,
      visualizerCanvas,
      audioFile,
      exportSettings,
      isProcessing,
      handleFileUpload,
      exportVideo
    };
  }
}
</script>

<style scoped>
/* 必要に応じてスタイルを追加 */
</style>
