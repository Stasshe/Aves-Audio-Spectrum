<template>
  <div class="main-editor">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- プレビュー領域 -->
      <div class="col-span-2 bg-gray-900 visualizer-wrapper rounded-xl overflow-hidden relative">
        <!-- ビジュアライザーキャンバス -->
        <visualizer-canvas ref="visualizerCanvas" />
        
        <!-- ローディングオーバーレイ -->
        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <p class="loading-text">オーディオを解析中...</p>
        </div>
      </div>
      
      <!-- 設定領域 -->
      <div class="col-span-1 p-4 bg-white rounded-xl">
        <div class="tabs mb-4">
          <button 
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
          >
            {{ tab.name }}
          </button>
        </div>
        
        <!-- タブコンテンツ -->
        <div class="tab-content">
          <!-- オーディオ設定タブ -->
          <audio-settings v-if="activeTab === 'audio'" />
          
          <!-- ビジュアライザー設定タブ -->
          <visualizer-settings v-if="activeTab === 'visualizer'" />
          
          <!-- 背景設定タブ -->
          <background-settings v-if="activeTab === 'background'" />
          
          <!-- エクスポート設定タブ -->
          <export-panel v-if="activeTab === 'export'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAudioStore } from '@/stores/audioStore';
import VisualizerCanvas from '@/components/visualizer/VisualizerCanvas.vue';
import AudioSettings from '@/components/editor/AudioSettings.vue';
import VisualizerSettings from '@/components/editor/VisualizerSettings.vue';
import BackgroundSettings from '@/components/editor/BackgroundSettings.vue';
import ExportPanel from '@/components/editor/ExportPanel.vue';

const audioStore = useAudioStore();

// オーディオストアからローディング状態を監視
const isLoading = computed(() => audioStore.isLoading);

// タブ設定
const tabs = [
  { id: 'audio', name: 'オーディオ' },
  { id: 'visualizer', name: 'ビジュアライザー' },
  { id: 'background', name: '背景' },
  { id: 'export', name: 'エクスポート' }
];

// アクティブタブ
const activeTab = ref('audio');

// ビジュアライザーキャンバスへの参照
const visualizerCanvas = ref(null);
</script>

<style scoped>
.visualizer-wrapper {
  height: 60vh;
  min-height: 300px;
  max-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-btn {
  padding: 0.5rem 1rem;
  margin-right: 0.25rem;
  border-radius: 0.25rem 0.25rem 0 0;
  border-bottom: 2px solid transparent;
  background-color: #f3f4f6;
}

.tab-btn.active {
  background-color: #fff;
  border-bottom: 2px solid #3b82f6;
  font-weight: 500;
}

.tab-content {
  min-height: 400px;
  max-height: 60vh;
  overflow-y: auto;
}

/* ローディングオーバーレイスタイル */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 100;
  animation: fadeIn 0.3s ease-in-out;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

.loading-text {
  margin-top: 16px;
  color: white;
  font-size: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
