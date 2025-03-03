<template>
  <div>
    <h3 class="font-medium text-lg mb-4">エクスポート設定</h3>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">エクスポート形式</label>
      <div class="grid grid-cols-2 gap-2">
        <button 
          v-for="format in exportFormats" 
          :key="format.id"
          @click="settings.format = format.id"
          class="btn text-sm p-2" 
          :class="settings.format === format.id ? 'btn-primary' : 'btn-secondary'"
        >
          {{ format.name }}
        </button>
      </div>
    </div>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">解像度</label>
      <select 
        v-model="settings.resolution" 
        class="w-full p-2 bg-gray-700 rounded text-white"
      >
        <option value="720p">HD (1280x720)</option>
        <option value="1080p">Full HD (1920x1080)</option>
        <option value="4k">4K UHD (3840x2160)</option>
      </select>
    </div>
    
    <div v-if="settings.format === 'video'" class="mb-4">
      <label class="block text-sm font-medium mb-1">フレームレート (FPS)</label>
      <select 
        v-model="settings.fps" 
        class="w-full p-2 bg-gray-700 rounded text-white"
      >
        <option :value="24">24 fps (フィルム風)</option>
        <option :value="30">30 fps (標準)</option>
        <option :value="60">60 fps (高品質)</option>
      </select>
    </div>
    
    <div v-if="settings.format === 'video'" class="mb-4">
      <label class="block text-sm font-medium mb-1">ビデオ品質</label>
      <select 
        v-model="settings.videoBitrate" 
        class="w-full p-2 bg-gray-700 rounded text-white"
      >
        <option value="2000k">低品質 (2 Mbps)</option>
        <option value="5000k">標準品質 (5 Mbps)</option>
        <option value="8000k">高品質 (8 Mbps)</option>
        <option value="16000k">最高品質 (16 Mbps)</option>
      </select>
    </div>
    
    <div v-if="audioStore.hasAudio && settings.format === 'video'" class="mb-4">
      <label class="block text-sm font-medium mb-1">動画の長さ</label>
      
      <div class="flex items-center gap-2">
        <button 
          v-for="option in durationOptions" 
          :key="option.id"
          @click="selectDuration(option.id)"
          class="btn text-xs p-1" 
          :class="settings.durationType === option.id ? 'btn-primary' : 'btn-secondary'"
        >
          {{ option.name }}
        </button>
      </div>
      
      <div v-if="settings.durationType === 'custom'" class="flex items-center gap-2 mt-2">
        <input 
          type="number" 
          v-model.number="settings.duration" 
          min="1" 
          :max="audioStore.duration" 
          step="1" 
          class="w-20 p-1 bg-gray-700 rounded text-white"
        />
        <span>秒 (最大: {{ Math.floor(audioStore.duration) }}秒)</span>
      </div>
    </div>
    
    <div class="mt-6 flex justify-center">
      <button 
        @click="exportMedia" 
        class="btn btn-primary py-3 px-6 text-lg"
        :disabled="!canExport"
      >
        {{ exportButtonText }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAudioStore } from '@/stores/audioStore';
import { exportVideoFile, saveScreenshot } from '@/utils/export';

const audioStore = useAudioStore();

// エクスポート設定
const settings = ref({
  format: 'video',   // 'video', 'image'
  resolution: '1080p', // '720p', '1080p', '4k'
  fps: 30,
  videoBitrate: '8000k',
  durationType: 'full', // 'full', 'custom'
  duration: 30
});

// エクスポート形式オプション
const exportFormats = [
  { id: 'video', name: 'ビデオ' },
  { id: 'image', name: '画像' }
];

// 長さオプション
const durationOptions = [
  { id: 'full', name: '全体' },
  { id: 'custom', name: 'カスタム' }
];

// エクスポートボタンのテキスト
const exportButtonText = computed(() => {
  return settings.value.format === 'video' ? 'ビデオをエクスポート' : '画像をエクスポート';
});

// エクスポート可能かどうか
const canExport = computed(() => {
  if (settings.value.format === 'video') {
    return audioStore.hasAudio;
  }
  return true; // 画像の場合は常にエクスポート可能
});

// 長さ選択
const selectDuration = (type) => {
  settings.value.durationType = type;
  
  if (type === 'full') {
    settings.value.duration = audioStore.duration;
  } else {
    settings.value.duration = Math.min(30, audioStore.duration);
  }
};

// エクスポート実行
const exportMedia = () => {
  if (settings.value.format === 'video') {
    // ビデオエクスポート
    if (!audioStore.audioFile) {
      alert('オーディオファイルが必要です');
      return;
    }
    
    // キャンバス要素を取得
    const canvas = document.querySelector('#visualizer-canvas');
    if (!canvas) {
      alert('ビジュアライザーキャンバスが見つかりません');
      return;
    }
    
    // 最終的な長さを決定
    let duration = audioStore.duration;
    if (settings.value.durationType === 'custom') {
      duration = Math.min(settings.value.duration, audioStore.duration);
    }
    
    // エクスポート設定を更新
    const exportConfig = {
      ...settings.value,
      duration
    };
    
    // エクスポート実行
    exportVideoFile(
      audioStore.audioFile, 
      canvas, 
      exportConfig, 
      window.visualizerInstance,
      window.audioContext
    ).catch(error => {
      console.error('エクスポートエラー:', error);
      alert(`エクスポート中にエラーが発生しました: ${error.message}`);
    });
  } else {
    // 画像エクスポート
    const canvas = document.querySelector('#visualizer-canvas');
    if (!canvas) {
      alert('ビジュアライザーキャンバスが見つかりません');
      return;
    }
    
    // タイムスタンプ付きのファイル名を生成
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const fileName = `aves_audio_spectrum_${timestamp}.png`;
    
    // スクリーンショット保存
    saveScreenshot(canvas, fileName);
  }
};

// マウント時に初期長さを設定
if (audioStore.hasAudio && audioStore.duration > 0) {
  settings.value.duration = audioStore.duration;
}
</script>
