<template>
  <div class="card">
    <h2 class="text-xl font-bold mb-4">オーディオをアップロード</h2>
    
    <div v-if="!audioStore.audioFile" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <input
        ref="fileInput"
        type="file"
        accept="*"
        class="hidden"
        @change="handleAudioSelect"
      />
      <p class="text-gray-500 mb-4">オーディオファイルをドラッグ＆ドロップするか、クリックしてアップロード</p>
      <button
        @click="$refs.fileInput.click()"
        class="btn btn-primary"
      >
        ファイルを選択
      </button>
    </div>
    
    <div v-else class="flex justify-between items-center">
      <div>
        <p class="font-medium">{{ audioStore.audioFile.name }}</p>
        <p class="text-sm text-gray-500">{{ formatFileSize(audioStore.audioFile.size) }}</p>
      </div>
      <button
        @click="clearAudioFile"
        class="btn btn-outline-danger"
      >
        削除
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();
const fileInput = ref(null);
const dropZone = ref(null);

// ファイルサイズのフォーマット
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
};

// オーディオファイルが選択された時の処理
const handleAudioSelect = (e) => {
  const files = e.target.files || e.dataTransfer.files;
  if (files && files.length > 0) {
    const file = files[0];
    
    // ファイルのMIMEタイプをチェック
    if (file.type.startsWith('audio/') || isSupportedFormat(file)) {
      audioStore.setAudioFile(file);
    } else {
      alert('サポートされていないファイル形式です。音声ファイルを選択してください。');
    }
  }
  
  // ファイル選択をリセット（同じファイルを再選択できるようにする）
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// オーディオファイルをクリア
const clearAudioFile = () => {
  audioStore.setAudioFile(null);
};

// ファイル形式のサポートチェック（拡張子ベース）
const isSupportedFormat = (file) => {
  const supportedExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'];
  const fileName = file.name.toLowerCase();
  return supportedExtensions.some(ext => fileName.endsWith(ext));
};

// ドラッグ＆ドロップの処理を設定
onMounted(() => {
  const container = document.querySelector('.card');
  if (!container) return;
  
  // ブラウザのデフォルト動作を防止
  const preventDefault = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  // ドロップゾーンのスタイル変更
  const highlight = () => {
    container.classList.add('border-primary');
  };
  
  const unhighlight = () => {
    container.classList.remove('border-primary');
  };
  
  // ファイルをドロップした時の処理
  const handleDrop = (e) => {
    preventDefault(e);
    unhighlight();
    handleAudioSelect(e);
  };
  
  // イベントリスナーを登録
  container.addEventListener('dragenter', (e) => {
    preventDefault(e);
    highlight();
  });
  
  container.addEventListener('dragover', (e) => {
    preventDefault(e);
    highlight();
  });
  
  container.addEventListener('dragleave', (e) => {
    preventDefault(e);
    unhighlight();
  });
  
  container.addEventListener('drop', handleDrop);
});
</script>
