<template>
  <div>
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label class="block text-sm font-medium mb-1">解像度</label>
        <select v-model="resolution" class="input-field w-full text-sm" @change="updateResolution">
          <option v-for="res in resolutions" :key="res.label" :value="res">
            {{ res.label }}
          </option>
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">フレームレート</label>
        <select v-model="settings.fps" class="input-field w-full text-sm">
          <option value="24">24fps</option>
          <option value="30">30fps</option>
          <option value="60">60fps</option>
        </select>
      </div>
    </div>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">エクスポート形式</label>
      <select v-model="settings.format" class="input-field w-full text-sm">
        <option value="mp4">MP4 ビデオ</option>
        <option value="webm">WebM ビデオ</option>
        <option value="gif">GIF アニメーション</option>
      </select>
    </div>
    
    <div class="mb-4" v-if="settings.format !== 'gif'">
      <label class="block text-sm font-medium mb-1">ビデオ品質</label>
      <select v-model="settings.videoBitrate" class="input-field w-full text-sm">
        <option value="1M">低 (1 Mbps)</option>
        <option value="4M">中 (4 Mbps)</option>
        <option value="8M">高 (8 Mbps)</option>
      </select>
    </div>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">長さ</label>
      <div class="flex items-center gap-2">
        <select v-model="durationOption" class="input-field text-sm flex-1">
          <option value="full">オーディオ全体</option>
          <option value="custom">カスタム</option>
        </select>
        
        <input
          v-if="durationOption === 'custom'"
          type="number"
          v-model.number="customDuration"
          min="1"
          :max="Math.ceil(audioStore.duration)"
          step="1"
          class="input-field text-sm w-24"
        />
        <span v-if="durationOption === 'custom'" class="text-sm">秒</span>
      </div>
    </div>
    
    <div class="mt-5 border-t pt-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">推定ファイルサイズ:</span>
        <span class="text-sm">{{ estimatedSize }}</span>
      </div>
      
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">推定処理時間:</span>
        <span class="text-sm">{{ estimatedTime }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();
const settings = computed(() => audioStore.exportSettings);

// 解像度プリセット
const resolutions = [
  { label: '720p (HD)', width: 1280, height: 720 },
  { label: '1080p (Full HD)', width: 1920, height: 1080 },
  { label: '480p (SD)', width: 854, height: 480 },
  { label: '360p', width: 640, height: 360 },
  { label: '240p', width: 426, height: 240 },
];

// 現在の解像度
const resolution = ref(resolutions[0]);

// 長さオプション
const durationOption = ref('full');
const customDuration = ref(30);

// 解像度を更新
const updateResolution = () => {
  settings.value.width = resolution.value.width;
  settings.value.height = resolution.value.height;
};

// ファイル容量の推定計算
const estimatedSize = computed(() => {
  const duration = durationOption.value === 'full' ? audioStore.duration : customDuration.value;
  if (!duration) return '計算中...';
  
  let bitsPerSecond;
  switch (settings.value.format) {
    case 'mp4':
      bitsPerSecond = parseInt(settings.value.videoBitrate.replace('M', '')) * 1024 * 1024;
      break;
    case 'webm':
      bitsPerSecond = parseInt(settings.value.videoBitrate.replace('M', '')) * 1024 * 1024 * 0.8; // WebMは効率的
      break;
    case 'gif':
      // GIFはサイズが大きくなる
      bitsPerSecond = settings.value.width * settings.value.height * settings.value.fps * 0.3;
      break;
    default:
      bitsPerSecond = 4 * 1024 * 1024;
  }
  
  // ビットからバイトへ変換して、容量を計算
  const bytes = (bitsPerSecond / 8) * duration;
  
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
});

// 処理時間の推定
const estimatedTime = computed(() => {
  const duration = durationOption.value === 'full' ? audioStore.duration : customDuration.value;
  if (!duration) return '計算中...';
  
  // 解像度とフレームレートから計算
  const pixels = settings.value.width * settings.value.height;
  const complexityFactor = pixels / (1280 * 720); // 720pを基準
  
  // 処理時間の推定（実際のデバイス性能により大きく異なる）
  let processingTimeRatio = 0.5; // 基本的に実時間の0.5倍
  
  if (settings.value.format === 'gif') {
    processingTimeRatio *= 0.8; // GIFは比較的速い
  }
  
  if (settings.value.fps === 60) {
    processingTimeRatio *= 1.8; // 60fpsは処理が重い
  } else if (settings.value.fps === 24) {
    processingTimeRatio *= 0.8; // 24fpsは軽い
  }
  
  const estimatedSeconds = duration * processingTimeRatio * complexityFactor;
  
  if (estimatedSeconds < 60) {
    return `約${Math.ceil(estimatedSeconds)}秒`;
  } else {
    const mins = Math.floor(estimatedSeconds / 60);
    const secs = Math.ceil(estimatedSeconds % 60);
    return `約${mins}分${secs}秒`;
  }
});

// 長さの設定を監視して更新
watch(durationOption, (value) => {
  if (value === 'full') {
    settings.value.duration = null; // 全体を使用
  } else {
    settings.value.duration = customDuration.value;
  }
});

watch(customDuration, (value) => {
  if (durationOption.value === 'custom') {
    settings.value.duration = value;
  }
});

// 初期化
updateResolution();
</script>
