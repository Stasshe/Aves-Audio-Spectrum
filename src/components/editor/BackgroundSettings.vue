<template>
  <div>
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">背景タイプ</label>
      <div class="grid grid-cols-3 gap-2">
        <button 
          v-for="type in backgroundTypes" 
          :key="type.id"
          @click="background.type = type.id"
          class="btn text-xs p-1" 
          :class="background.type === type.id ? 'btn-primary' : 'btn-secondary'"
        >
          {{ type.name }}
        </button>
      </div>
    </div>
    
    <!-- 単色背景の設定 -->
    <div v-if="background.type === 'color'" class="mb-4">
      <label class="block text-sm font-medium mb-1">背景色</label>
      <input 
        type="color" 
        v-model="background.color" 
        class="w-full h-10 rounded cursor-pointer"
      />
    </div>
    
    <!-- グラデーション背景の設定 -->
    <div v-if="background.type === 'gradient'" class="mb-4">
      <label class="block text-sm font-medium mb-1">グラデーション色</label>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <div v-for="(color, index) in background.gradient.colors" :key="index" class="relative">
          <input 
            type="color"
            v-model="background.gradient.colors[index]"
            class="w-full h-10 rounded cursor-pointer"
          />
          <button 
            v-if="background.gradient.colors.length > 2"
            @click="removeGradientColor(index)"
            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
          >
            &times;
          </button>
        </div>
        <button 
          v-if="background.gradient.colors.length < 5"
          @click="addGradientColor"
          class="border-2 border-dashed border-gray-300 rounded flex items-center justify-center h-10"
        >
          +
        </button>
      </div>
      
      <label class="block text-sm mb-1">角度</label>
      <div class="flex gap-2 items-center">
        <input 
          type="range" 
          v-model.number="background.gradient.angle" 
          min="0" 
          max="360" 
          step="1"
          class="flex-1"
        />
        <span class="text-sm w-12 text-right">{{ background.gradient.angle }}°</span>
      </div>
    </div>
    
    <!-- 画像背景の設定 -->
    <div v-if="background.type === 'image'" class="mb-4">
      <label class="block text-sm font-medium mb-2">背景画像</label>
      <div v-if="!background.image" class="border-2 border-dashed border-gray-300 p-4 text-center rounded-lg">
        <input
          type="file"
          accept="image/*"
          class="hidden"
          ref="imageInput"
          @change="handleImageChange"
        />
        <button
          class="btn btn-primary mb-2"
          @click="$refs.imageInput.click()"
        >
          画像を選択
        </button>
        <p class="text-sm text-gray-500">またはドラッグ＆ドロップ</p>
      </div>
      <div v-else class="relative" v-if="imagePreviewUrl">
        <img 
          :src="imagePreviewUrl" 
          class="w-full h-32 object-cover rounded-lg" 
          alt="背景プレビュー"
        />
        <button
          @click="removeBackgroundImage"
          class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
        >
          &times;
        </button>
      </div>
      
      <div v-if="background.image" class="mt-3">
        <label class="block text-sm mb-1">不透明度</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="background.opacity" 
            min="0.1" 
            max="1" 
            step="0.05"
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ Math.round(background.opacity * 100) }}%</span>
        </div>
        
        <label class="block text-sm mb-1 mt-3">ぼかし</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="background.blur" 
            min="0" 
            max="20" 
            step="1"
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ background.blur }}px</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();
const background = computed(() => audioStore.background);
const imageInput = ref(null);
const imagePreviewUrl = ref(null);

// 背景タイプ
const backgroundTypes = [
  { id: 'color', name: '単色' },
  { id: 'gradient', name: 'グラデーション' },
  { id: 'image', name: '画像' }
];

// グラデーション色を追加
const addGradientColor = () => {
  if (!Array.isArray(background.value.gradient.colors)) {
    background.value.gradient.colors = ['#16213E', '#0F3460', '#533483'];
  } else if (background.value.gradient.colors.length < 5) {
    background.value.gradient.colors.push('#ffffff');
  }
};

// グラデーション色を削除
const removeGradientColor = (index) => {
  if (Array.isArray(background.value.gradient.colors) && background.value.gradient.colors.length > 2) {
    background.value.gradient.colors.splice(index, 1);
  }
};

// 背景画像の選択
const handleImageChange = async (event) => {
  const files = event.target.files || event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  
  const file = files[0];
  if (!file.type.startsWith('image/')) {
    alert('対応していないファイル形式です。画像ファイルを選択してください。');
    return;
  }
  
  try {
    // 画像をBlobとしてストアに保存
    background.value.image = file;
    
    // プレビュー用URLを作成
    if (imagePreviewUrl.value) {
      URL.revokeObjectURL(imagePreviewUrl.value);
    }
    
    imagePreviewUrl.value = URL.createObjectURL(file);
    
    // 画像をキャッシュするためにイベントを発行
    if (audioStore.visualizer) {
      audioStore.visualizer.updateSettings();
    }
  } catch (error) {
    console.error('画像読み込みエラー:', error);
    alert('画像の読み込み中にエラーが発生しました。');
  }
};

// 背景画像の削除
const removeBackgroundImage = () => {
  background.value.image = null;
  
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
    imagePreviewUrl.value = null;
  }
  
  // ファイル入力をリセット
  if (imageInput.value) {
    imageInput.value.value = '';
  }
  
  // 画像キャッシュを更新
  if (audioStore.visualizer) {
    audioStore.visualizer.updateSettings();
  }
};

// 背景画像があれば初期表示用のURLを作成
watch(() => background.value.image, (newImage) => {
  if (newImage && !imagePreviewUrl.value) {
    imagePreviewUrl.value = URL.createObjectURL(newImage);
  }
}, { immediate: true });
</script>
