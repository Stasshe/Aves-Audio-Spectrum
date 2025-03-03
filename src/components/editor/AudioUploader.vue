<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">オーディオファイルをアップロード</h2>
    
    <div 
      class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
      @dragover.prevent="dragover = true"
      @dragleave.prevent="dragover = false"
      @drop.prevent="onDrop"
      :class="{'bg-blue-50 border-blue-300': dragover}"
    >
      <input
        ref="fileInput"
        type="file"
        accept="*"
        class="hidden"
        @change="onFileSelect"
      />
      
      <div class="flex flex-col items-center">
        <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
        </svg>
        
        <p class="text-gray-600 mb-4">
          ドラッグ＆ドロップするか、クリックしてオーディオファイルを選択してください
        </p>
        
        <button 
          @click="$refs.fileInput.click()" 
          class="btn btn-primary"
        >
          オーディオファイルを選択
        </button>
      </div>
    </div>
    
    <div class="mt-4 text-sm text-gray-600">
      <p>サポートされている形式: MP3, WAV, AAC, OGG, FLAC</p>
      <p>最大ファイルサイズ: 100MB</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();
const dragover = ref(false);
const fileInput = ref(null);

const onFileSelect = (event) => {
  const files = event.target.files;
  if (files.length > 0) {
    handleAudioFile(files[0]);
  }
};

const onDrop = (event) => {
  dragover.value = false;
  const files = event.dataTransfer.files;
  
  if (files.length > 0) {
    handleAudioFile(files[0]);
  }
};

const handleAudioFile = (file) => {
  // ファイルサイズチェック (100MB)
  if (file.size > 100 * 1024 * 1024) {
    alert('ファイルサイズは100MB以下にしてください');
    return;
  }
  
  // ファイル形式チェック
  if (!file.type.startsWith('audio/')) {
    alert('オーディオファイルを選択してください');
    return;
  }
  
  // ストアにファイルを設定
  audioStore.audioFile = file;
};
</script>
