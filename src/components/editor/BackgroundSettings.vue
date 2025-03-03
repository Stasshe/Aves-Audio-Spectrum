<template>
  <div>
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">背景タイプ</label>
      <div class="grid grid-cols-3 gap-2">
        <button 
          v-for="type in backgroundTypes" 
          :key="type.id"
          @click="setBackgroundType(type.id)"
          class="btn text-sm p-2" 
          :class="bg.type === type.id ? 'btn-primary' : 'btn-secondary'"
        >
          {{ type.name }}
        </button>
      </div>
    </div>
    
    <!-- 単色背景 -->
    <div v-if="bg.type === 'color'" class="mb-4">
      <label class="block text-sm font-medium mb-1">背景色</label>
      <input 
        type="color" 
        v-model="bg.color"
        class="w-full h-10 rounded cursor-pointer"
      />
    </div>
    
    <!-- グラデーション背景 -->
    <div v-if="bg.type === 'gradient'" class="mb-4">
      <label class="block text-sm font-medium mb-1">グラデーション色</label>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <div v-for="(color, index) in bg.gradient.colors" :key="index" class="relative">
          <input 
            type="color" 
            v-model="bg.gradient.colors[index]"
            class="w-full h-10 rounded cursor-pointer"
          />
          <button 
            v-if="bg.gradient.colors.length > 2" 
            @click="removeGradientColor(index)"
            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
          >
            &times;
          </button>
        </div>
        <button 
          v-if="bg.gradient.colors.length < 5"
          @click="addGradientColor"
          class="border-2 border-dashed border-gray-300 rounded flex items-center justify-center h-10"
        >
          +
        </button>
      </div>
      
      <label class="block text-sm font-medium mb-1">角度</label>
      <div class="flex gap-2 items-center">
        <input 
          type="range" 
          v-model.number="bg.gradient.angle" 
          min="0" 
          max="360" 
          step="1"
          class="flex-1"
        />
        <span class="text-sm w-12 text-right">{{ bg.gradient.angle }}°</span>
      </div>
    </div>
    
    <!-- 画像背景 -->
    <div v-if="bg.type === 'image'" class="mb-4">
      <label class="block text-sm font-medium mb-1">背景画像</label>
      
      <div v-if="!bg.image" class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleImageSelect"
        />
        <button
          @click="$refs.fileInput.click()"
          class="btn btn-secondary"
        >
          画像をアップロード
        </button>
      </div>
      
      <div v-else class="relative">
        <img
          :src="imagePreviewUrl"
          class="w-full h-32 object-cover rounded-lg"
          alt="Background preview"
        />
        <button
          @click="removeImage"
          class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
        >
          &times;
        </button>
      </div>
    </div>
    
    <!-- 共通の設定 (画像のみ) -->
    <div v-if="bg.type === 'image' && bg.image" class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">ぼかし</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="bg.blur" 
            min="0" 
            max="20" 
            step="1"
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ bg.blur }}px</span>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">不透明度</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="bg.opacity" 
            min="0.1" 
            max="1" 
            step="0.05"
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ Math.round(bg.opacity * 100) }}%</span>
        </div>
      </div>
    </div>
    
    <!-- プリセット背景 -->
    <div v-if="bg.type === 'color' || bg.type === 'gradient'" class="mt-4">
      <h3 class="text-sm font-medium mb-2">プリセット</h3>
      <div class="grid grid-cols-4 gap-2">
        <button 
          v-for="(preset, index) in backgroundPresets" 
          :key="index"
          @click="applyPreset(preset)"
          class="h-10 rounded-lg"
          :style="getPresetStyle(preset)"
        ></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();
const bg = computed(() => audioStore.background);
const fileInput = ref(null);

const backgroundTypes = [
  { id: 'color', name: '単色' },
  { id: 'gradient', name: 'グラデーション' },
  { id: 'image', name: '画像' },
];

const backgroundPresets = [
  { type: 'color', color: '#000000' },
  { type: 'color', color: '#ffffff' },
  { type: 'color', color: '#1a1a2e' },
  { type: 'color', color: '#16213e' },
  { type: 'gradient', colors: ['#4158D0', '#C850C0', '#FFCC70'], angle: 45 },
  { type: 'gradient', colors: ['#0F2027', '#203A43', '#2C5364'], angle: 0 },
  { type: 'gradient', colors: ['#8A2387', '#E94057', '#F27121'], angle: 90 },
  { type: 'gradient', colors: ['#3A1C71', '#D76D77', '#FFAF7B'], angle: 135 }
];

// 画像プレビュー用のURL
const imagePreviewUrl = computed(() => {
  if (bg.value.image) {
    return URL.createObjectURL(bg.value.image);
  }
  return null;
});

// 背景タイプの設定
const setBackgroundType = (type) => {
  audioStore.background.type = type;
};

// グラデーション色の追加
const addGradientColor = () => {
  if (bg.value.gradient.colors.length < 5) {
    audioStore.background.gradient.colors.push('#ffffff');
  }
};

// グラデーション色の削除
const removeGradientColor = (index) => {
  if (bg.value.gradient.colors.length > 2) {
    audioStore.background.gradient.colors.splice(index, 1);
  }
};

// 画像のアップロード処理
const handleImageSelect = (e) => {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    audioStore.background.image = file;
  }
};

// 画像の削除
const removeImage = () => {
  audioStore.background.image = null;
};

// プリセットのスタイルを取得
const getPresetStyle = (preset) => {
  if (preset.type === 'color') {
    return { backgroundColor: preset.color };
  } else if (preset.type === 'gradient') {
    const gradientColors = preset.colors.join(', ');
    return {
      background: `linear-gradient(${preset.angle}deg, ${gradientColors})`
    };
  }
};

// プリセットの適用
const applyPreset = (preset) => {
  if (preset.type === 'color') {
    audioStore.background.type = 'color';
    audioStore.background.color = preset.color;
  } else if (preset.type === 'gradient') {
    audioStore.background.type = 'gradient';
    audioStore.background.gradient.colors = [...preset.colors];
    audioStore.background.gradient.angle = preset.angle;
  }
};
</script>
