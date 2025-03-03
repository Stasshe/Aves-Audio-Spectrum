<template>
  <div class="app">
    <header class="bg-gradient-to-r from-purple-900 to-indigo-800 text-white py-4 px-6 shadow-md">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold">Aves Audio Spectrum</h1>
        <div class="flex items-center space-x-4">
          <a href="https://github.com/username/Aves-Audio-Spectrum" target="_blank" class="text-white hover:text-purple-200">
            GitHub
          </a>
        </div>
      </div>
    </header>
    
    <main class="container mx-auto py-8 px-4">
      <main-editor />
    </main>
    
    <footer class="bg-gray-800 text-gray-300 py-4 px-6">
      <div class="container mx-auto text-center text-sm">
        <p>© {{ new Date().getFullYear() }} Aves Audio Spectrum</p>
        <p class="mt-1">オーディオビジュアライゼーションとスペクトルアナライザー</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import MainEditor from '@/components/editor/MainEditor.vue';

onMounted(() => {
  // サービスワーカーの登録は開発環境では行わない
  // Codespaces環境ではサービスワーカーが動作しないため、エラーを避けるためにコメントアウト
  /*
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/service-worker.js').catch(error => {
      console.error('Service worker registration failed:', error);
    });
  }
  */
  
  // ブラウザ互換性をチェック
  checkBrowserCompatibility();
});

// ブラウザの互換性チェック
function checkBrowserCompatibility() {
  // Web Audio APIのサポート確認
  if (!window.AudioContext && !window.webkitAudioContext) {
    alert('お使いのブラウザはWeb Audio APIをサポートしていないため、この機能を使用できません。Chrome、Firefox、Safariの最新版をお使いください。');
    return false;
  }
  
  // Canvas APIのサポート確認
  const canvas = document.createElement('canvas');
  if (!canvas.getContext) {
    alert('お使いのブラウザはCanvas APIをサポートしていないため、この機能を使用できません。');
    return false;
  }
  
  return true;
}
</script>

<style>
/* グローバルスタイル */
.container {
  max-width: 1280px;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #e5e7eb;
  color: #4b5563;
}

.btn-secondary:hover {
  background-color: #d1d5db;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

/* フォーム要素のスタイル */
input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #e5e7eb;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}
</style>
