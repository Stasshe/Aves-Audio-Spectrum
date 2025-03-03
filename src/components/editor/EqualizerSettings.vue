<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <label class="flex items-center">
        <input type="checkbox" v-model="audioStore.applyEqToAudio" class="mr-2">
        <span class="text-sm">音声にも適用</span>
      </label>
      
      <button @click="resetEqualizer" class="btn btn-secondary text-sm">
        リセット
      </button>
    </div>
    
    <div class="flex items-end gap-1 h-56">
      <div v-for="(band, index) in audioStore.equalizerBands" :key="index" class="flex flex-col items-center flex-1">
        <div class="h-40 relative w-full flex justify-center">
          <input
            type="range"
            v-model.number="band.gain"
            min="-12"
            max="12"
            step="0.5"
            class="eq-slider"
            orient="vertical"
          />
          <div class="absolute bottom-0 w-full h-px bg-gray-300"></div>
        </div>
        <div class="text-xs text-center mt-2">{{ formatFrequency(band.frequency) }}</div>
        <div class="text-xs font-medium mt-1" :class="band.gain > 0 ? 'text-green-600' : (band.gain < 0 ? 'text-red-600' : '')">
          {{ band.gain > 0 ? '+' : '' }}{{ band.gain }}
        </div>
      </div>
    </div>
    
    <div class="mt-4">
      <h3 class="text-sm font-medium mb-2">プリセット</h3>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="(preset, index) in eqPresets"
          :key="index"
          @click="applyEqPreset(preset.gains)"
          class="btn btn-secondary text-sm"
        >
          {{ preset.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();

// イコライザープリセット
const eqPresets = [
  { name: 'フラット', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'ベース増強', gains: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: '高音増強', gains: [0, 0, 0, 0, 0, 2, 4, 6, 8, 8] },
  { name: 'ボーカル', gains: [-2, -2, 0, 4, 6, 6, 4, 2, 0, 0] },
  { name: 'スピーチ', gains: [-6, -2, 0, 4, 6, 6, 4, 0, -2, -6] },
  { name: 'ポップ', gains: [-2, 0, 4, 6, 4, 0, -2, -2, -2, 0] },
];

// 周波数表示のフォーマット
const formatFrequency = (freq) => {
  return freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`;
};

// イコライザーのリセット
const resetEqualizer = () => {
  audioStore.resetEqualizerBands();
};

// イコライザープリセットの適用
const applyEqPreset = (gains) => {
  audioStore.equalizerBands.forEach((band, index) => {
    band.gain = gains[index];
  });
};
</script>

<style scoped>
.eq-slider {
  -webkit-appearance: slider-vertical;
  width: 20px;
  height: 100%;
  background: transparent;
}

.eq-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 10px;
  border-radius: 4px;
  background: #3498DB;
  cursor: pointer;
}

.eq-slider::-moz-range-thumb {
  width: 20px;
  height: 10px;
  border-radius: 4px;
  background: #3498DB;
  cursor: pointer;
}
</style>
