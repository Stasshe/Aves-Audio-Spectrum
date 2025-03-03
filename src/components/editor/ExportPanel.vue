<template>
  <div class="export-panel">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">エクスポート設定</h3>
      <div class="flex gap-2">
        <button 
          class="btn btn-secondary btn-sm"
          @click="saveScreenshot"
          :disabled="!canExport"
        >
          スクリーンショット
        </button>
        <button 
          class="btn btn-primary btn-sm"
          @click="exportVideo"
          :disabled="!canExport"
        >
          ビデオ書き出し
        </button>
      </div>
    </div>
    
    <export-settings />
    
    <!-- エラー表示 -->
    <div v-if="errorMessage" class="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
      {{ errorMessage }}
    </div>
    
    <!-- ヘルプテキスト -->
    <div class="mt-4 p-3 bg-blue-50 text-sm rounded-md">
      <p class="font-medium mb-1">ビデオエクスポートについて</p>
      <ul class="list-disc pl-5 text-gray-700">
        <li>一部のブラウザでは完全な動画エクスポートに対応していない場合があります</li>
        <li>高解像度・高フレームレートの設定ではパフォーマンスが低下する場合があります</li>
        <li>もし動画出力に問題がある場合は、スクリーンショットでの保存をお試しください</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAudioStore } from '@/stores/audioStore';
import ExportSettings from '@/components/editor/ExportSettings.vue';
import ExportService from '@/services/ExportService';

const audioStore = useAudioStore();
const errorMessage = ref('');

// エクスポートが可能かどうか
const canExport = computed(() => {
  return audioStore.audioBuffer != null && !audioStore.isPlaying;
});

// スクリーンショットを保存する
async function saveScreenshot() {
  if (!canExport.value) return;
  
  try {
    errorMessage.value = '';
    
    // キャンバス要素を取得
    const canvas = document.querySelector('#visualizer-canvas');
    if (!canvas) throw new Error('ビジュアライザーキャンバスが見つかりません');
    
    // スクリーンショット保存
    const fileName = ExportService.generateFilename('png');
    const result = ExportService.saveScreenshot(canvas, fileName);
    
    if (!result) {
      errorMessage.value = 'スクリーンショットの保存に失敗しました';
    }
  } catch (error) {
    console.error('スクリーンショットエラー:', error);
    errorMessage.value = `エラー: ${error.message || '不明なエラー'}`;
  }
}

// ビデオをエクスポートする
async function exportVideo() {
  if (!canExport.value) return;
  
  try {
    errorMessage.value = '';
    
    // オーディオファイルがなければエラー
    if (!audioStore.audioFile) {
      errorMessage.value = 'オーディオファイルがありません';
      return;
    }
    
    // ビジュアライザーがなければエラー
    if (!audioStore.visualizer) {
      errorMessage.value = 'ビジュアライザーが初期化されていません';
      return;
    }
    
    // ビデオエクスポート実行
    await ExportService.exportVideo(
      audioStore.audioFile,
      audioStore.exportSettings,
      audioStore.visualizer
    );
  } catch (error) {
    console.error('ビデオエクスポートエラー:', error);
    errorMessage.value = `エラー: ${error.message || '不明なエラー'}`;
  }
}
</script>
