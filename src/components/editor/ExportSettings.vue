<template>
  <div>
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">解像度</label>
      <div class="grid grid-cols-3 gap-2">
        <button 
          v-for="resolution in resolutions" 
          :key="resolution.id"
          @click="exportSettings.resolution = resolution.id"
          class="btn text-xs p-1" 
          :class="exportSettings.resolution === resolution.id ? 'btn-primary' : 'btn-secondary'"
        >
          {{ resolution.name }}
        </button>
      </div>
    </div>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">フレームレート</label>
      <div class="grid grid-cols-3 gap-2">
        <button 
          v-for="fps in frameRates" 
          :key="fps"
          @click="exportSettings.fps = fps"
          class="btn text-xs p-1" 
          :class="exportSettings.fps === fps ? 'btn-primary' : 'btn-secondary'"
        >
          {{ fps }}fps
        </button>
      </div>
    </div>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">ビデオ品質</label>
      <div class="grid grid-cols-3 gap-2">
        <button 
          v-for="quality in videoQualities" 
          :key="quality.bitrate"
          @click="exportSettings.videoBitrate = quality.bitrate"
          class="btn text-xs p-1" 
          :class="exportSettings.videoBitrate === quality.bitrate ? 'btn-primary' : 'btn-secondary'"
        >
          {{ quality.name }}
        </button>
      </div>
    </div>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">出力時間</label>
      <div class="grid grid-cols-1 gap-2">
        <button 
          @click="exportSettings.duration = null"
          class="btn text-xs p-1" 
          :class="exportSettings.duration === null ? 'btn-primary' : 'btn-secondary'"
        >
          全体
        </button>
        <div class="flex gap-2">
          <input 
            type="number" 
            v-model.number="customDuration" 
            min="1" 
            max="30"
            class="flex-1 border rounded px-2 py-1 text-sm"
            :disabled="exportSettings.duration === null"
          />
          <button 
            @click="setCustomDuration"
            class="btn text-xs p-1"
            :class="exportSettings.duration !== null ? 'btn-primary' : 'btn-secondary'"
          >
            秒を指定（最大30秒）
          </button>
        </div>
      </div>
    </div>
    
    <div class="mb-4 p-3 bg-gray-100 rounded-lg">
      <div class="text-xs text-gray-600">
        <p class="mb-1"><span class="font-medium">出力サイズ:</span> {{ formatResolution() }}</p>
        <p class="mb-1"><span class="font-medium">ビデオ品質:</span> {{ getQualityLabel(exportSettings.videoBitrate) }}</p>
        <p class="mb-1"><span class="font-medium">推定ファイルサイズ:</span> {{ estimatedFileSize }}</p>
        <p class="mb-2"><span class="font-medium">注意:</span> ブラウザによってサポートされるフォーマットが異なります。WebMが自動的に選択されます。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();
const exportSettings = computed(() => audioStore.exportSettings);
const customDuration = ref(30);

// 解像度設定
const resolutions = [
  { id: '720p', name: 'HD', width: 1280, height: 720 },
  { id: '1080p', name: 'Full HD', width: 1920, height: 1080 },
  { id: '4k', name: '4K', width: 3840, height: 2160 }
];

// フレームレート設定
const frameRates = [24, 30, 60];

// ビデオ品質
const videoQualities = [
  { name: '低', bitrate: '4000k' },
  { name: '中', bitrate: '8000k' },
  { name: '高', bitrate: '16000k' }
];

// カスタム時間を設定
const setCustomDuration = () => {
  // 最大30秒までに制限
  if (customDuration.value > 0 && customDuration.value <= 30) {
    exportSettings.value.duration = customDuration.value;
  } else if (customDuration.value > 30) {
    customDuration.value = 30;
    exportSettings.value.duration = 30;
    alert('最大30秒までしかエクスポートできません');
  }
};

// 解像度の表示をフォーマット
const formatResolution = () => {
  const res = resolutions.find(r => r.id === exportSettings.value.resolution);
  return `${res.width} × ${res.height}`;
};

// 品質ラベルの取得
const getQualityLabel = (bitrate) => {
  switch(bitrate) {
    case '4000k': return '低';
    case '8000k': return '中';
    case '16000k': return '高';
    default: return '中';
  }
};

// ファイルサイズの推定
const estimatedFileSize = computed(() => {
  const res = resolutions.find(r => r.id === exportSettings.value.resolution);
  const videoBitrate = parseInt(exportSettings.value.videoBitrate);
  const audioBitrate = parseInt(exportSettings.value.audioBitrate);
  const fps = exportSettings.value.fps;
  
  // bitrate = bits per second
  const totalBitrate = videoBitrate + audioBitrate * 1000;
  const duration = exportSettings.value.duration || audioStore.duration || 180; // 3分をデフォルトとする
  
  // ビットレート×時間（秒）÷8 = バイト単位のサイズ
  const sizeInBytes = (totalBitrate * duration) / 8;
  
  // サイズを適切な単位で表示
  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
});

// エンコード時間の推定（とても大雑把）
const estimatedEncodingTime = computed(() => {
  const res = resolutions.find(r => r.id === exportSettings.value.resolution);
  const fps = exportSettings.value.fps;
  const duration = exportSettings.value.duration || audioStore.duration || 180;
  
  // 解像度が高いほど、フレームレートが高いほど時間がかかる
  const resolutionFactor = res.width * res.height / (1280 * 720); // 720pを基準
  const fpsFactor = fps / 30; // 30fpsを基準
  
  // 1分あたりの処理時間（高解像度・高フレームレートほど長い）
  const processingTimePerMinute = 2 * resolutionFactor * fpsFactor;
  
  // 総処理時間（分）
  const totalMinutes = (duration / 60) * processingTimePerMinute;
  
  // 時間と分に変換
  if (totalMinutes < 1) {
    return `${Math.ceil(totalMinutes * 60)} 秒`;
  } else if (totalMinutes < 60) {
    return `${Math.floor(totalMinutes)} 分 ${Math.ceil((totalMinutes % 1) * 60)} 秒`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    return `${hours} 時間 ${mins} 分`;
  }
});
</script>
