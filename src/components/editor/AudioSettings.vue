<template>
  <div>
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">オーディオファイル</label>
      <div v-if="!audioFile" class="border-2 border-dashed border-gray-300 p-4 text-center rounded-lg">
        <input
          type="file"
          accept="*"
          class="hidden"
          ref="fileInput"
          @change="handleFileChange"
        />
        <button
          class="btn btn-primary mb-2"
          @click="$refs.fileInput.click()"
        >
          ファイルを選択
        </button>
        <p class="text-sm text-gray-500">または、ファイルをここにドラッグ＆ドロップ</p>
      </div>
      <div v-else class="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
        <div class="flex-1 truncate">
          <p class="font-medium truncate">{{ audioFile.name }}</p>
          <p class="text-xs text-gray-500">{{ formatFileSize(audioFile.size) }}</p>
        </div>
        <button
          class="btn btn-sm btn-danger"
          @click="removeAudioFile"
        >
          削除
        </button>
      </div>
    </div>
    
    <div class="mb-4" v-if="audioFile">
      <label class="block text-sm font-medium mb-1">再生コントロール</label>
      <div class="flex gap-2">
        <button
          class="btn flex-1"
          @click="togglePlayback"
        >
          {{ isPlaying ? '一時停止' : '再生' }}
        </button>
        <button
          class="btn btn-secondary"
          @click="stopPlayback"
        >
          停止
        </button>
      </div>
    </div>
    
    <div class="mb-4" v-if="audioFile">
      <div class="flex items-center justify-between">
        <span class="text-sm">{{ formatTime(currentTime) }}</span>
        <span class="text-sm">{{ formatTime(duration) }}</span>
      </div>
      <input
        type="range"
        class="w-full"
        min="0"
        :max="duration"
        step="0.01"
        v-model.number="currentTime"
        @change="seekAudio"
      />
    </div>
    
    <div class="mb-4" v-if="audioFile">
      <label class="block text-sm font-medium mb-1">音量 ({{ Math.round(volume * 100) }}%)</label>
      <input
        type="range"
        class="w-full"
        min="0"
        max="1"
        step="0.01"
        v-model.number="volume"
        @input="updateVolume"
      />
    </div>
    
    <div class="mb-4" v-if="audioFile && equalizerBands.length > 0">
      <div class="flex items-center justify-between mb-2">
        <label class="block text-sm font-medium">イコライザー</label>
        <button
          class="btn btn-sm btn-secondary"
          @click="resetEqualizer"
        >
          リセット
        </button>
      </div>
      
      <div class="grid grid-cols-5 gap-2">
        <div
          v-for="(band, index) in equalizerBands"
          :key="index"
          class="flex flex-col items-center"
        >
          <input
            type="range"
            class="h-24 rotate-270"
            min="-12"
            max="12"
            step="0.1"
            v-model.number="band.gain"
            @input="updateEqualizer"
            orient="vertical"
          />
          <span class="text-xs mt-1">{{ formatFrequency(band.frequency) }}</span>
          <span class="text-xs">{{ band.gain.toFixed(1) }}dB</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();

// Pinia ストアから値を取得
const audioFile = computed(() => audioStore.audioFile);
const isPlaying = computed(() => audioStore.isPlaying);
const currentTime = computed({
  get: () => audioStore.currentTime,
  set: (value) => { audioStore.currentTime = value; }
});
const duration = computed(() => audioStore.duration);
const volume = computed({
  get: () => audioStore.volume,
  set: (value) => { audioStore.volume = value; }
});
const equalizerBands = computed(() => audioStore.equalizerBands);

// ファイル入力の参照
const fileInput = ref(null);

// ファイル選択ハンドラ
const handleFileChange = async (event) => {
  const files = event.target.files || event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  
  const file = files[0];
  if (!file.type.startsWith('audio/')) {
    alert('対応していないファイル形式です。オーディオファイルを選択してください。');
    return;
  }
  
  try {
    // オーディオコンテキストとソースノードの設定
    if (!audioStore.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioStore.audioContext = new AudioContext();
    }
    
    // ファイルをストアに保存
    audioStore.setAudioFile(file);
    
    // ファイルを読み込んでバッファに変換
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioStore.audioContext.decodeAudioData(arrayBuffer);
    
    // オーディオストアを更新
    audioStore.audioBuffer = audioBuffer;
    audioStore.duration = audioBuffer.duration;
    audioStore.currentTime = 0;
    
    // メタデータを更新
    audioStore.updateAudioMetadata({
      duration: audioBuffer.duration
    });
    
    // 既存の接続を解除
    if (audioStore.audioSource) {
      audioStore.audioSource.disconnect();
      audioStore.audioSource = null;
    }
    
    // イコライザーノードを初期化
    initEqualizerNodes();
    
  } catch (error) {
    console.error('オーディオファイル読み込みエラー:', error);
    alert('オーディオファイルの読み込み中にエラーが発生しました。');
  }
};

// ファイル削除
const removeAudioFile = () => {
  // 再生停止
  stopPlayback();
  
  // リソース解放
  if (audioStore.audioSource) {
    audioStore.audioSource.disconnect();
    audioStore.audioSource = null;
  }
  
  // ストアの状態をリセット
  audioStore.audioFile = null;
  audioStore.audioBuffer = null;
  audioStore.duration = 0;
  audioStore.currentTime = 0;
  
  // ファイル入力をリセット
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// 再生/一時停止の切り替え
const togglePlayback = () => {
  if (isPlaying.value) {
    pauseAudio();
  } else {
    playAudio();
  }
};

// オーディオ再生
const playAudio = async () => {
  if (!audioStore.audioBuffer || isPlaying.value) return;
  
  try {
    // AudioContextを再開（一時停止状態の場合）
    if (audioStore.audioContext.state === 'suspended') {
      await audioStore.audioContext.resume();
    }
    
    // 新しいソースノードを作成
    const source = audioStore.audioContext.createBufferSource();
    source.buffer = audioStore.audioBuffer;
    
    // 再生位置を設定
    const offset = audioStore.currentTime;
    
    // ゲインノードを設定（ボリューム制御用）
    if (!audioStore.gainNode) {
      audioStore.gainNode = audioStore.audioContext.createGain();
    }
    audioStore.gainNode.gain.value = audioStore.volume;
    
    // アナライザーノードを設定（ビジュアライザー用）
    if (!audioStore.analyser) {
      audioStore.analyser = audioStore.audioContext.createAnalyser();
      audioStore.analyser.fftSize = audioStore.visualizerSettings.fftSize;
      audioStore.analyser.smoothingTimeConstant = audioStore.visualizerSettings.smoothingTimeConstant;
    }
    
    // イコライザーノードに接続
    if (audioStore.applyEqToAudio && audioStore.eqNodes) {
      source.connect(audioStore.eqNodes[0]);
      audioStore.eqNodes[audioStore.eqNodes.length - 1].connect(audioStore.gainNode);
    } else {
      source.connect(audioStore.gainNode);
    }
    
    audioStore.gainNode.connect(audioStore.analyser);
    audioStore.analyser.connect(audioStore.audioContext.destination);
    
    // 再生開始
    source.start(0, offset);
    audioStore.audioSource = source;
    audioStore.isPlaying = true;
    
    // 再生終了時の処理
    source.onended = () => {
      audioStore.isPlaying = false;
      audioStore.currentTime = 0;
    };
    
    // 現在時間を更新する定期実行
    startTimeUpdate();
    
  } catch (error) {
    console.error('オーディオ再生エラー:', error);
  }
};

// オーディオ一時停止
const pauseAudio = () => {
  if (!isPlaying.value) return;
  
  try {
    // AudioContextを一時停止
    audioStore.audioContext.suspend();
    audioStore.isPlaying = false;
    
    // 定期更新を停止
    stopTimeUpdate();
  } catch (error) {
    console.error('オーディオ一時停止エラー:', error);
  }
};

// オーディオ停止
const stopPlayback = () => {
  if (!audioStore.audioSource) return;
  
  try {
    // 再生を停止
    audioStore.audioSource.stop();
    audioStore.audioSource.disconnect();
    audioStore.audioSource = null;
    audioStore.isPlaying = false;
    audioStore.currentTime = 0;
    
    // 定期更新を停止
    stopTimeUpdate();
  } catch (error) {
    console.error('オーディオ停止エラー:', error);
  }
};

// 再生位置の変更
const seekAudio = () => {
  if (!audioStore.audioBuffer) return;
  
  const wasPlaying = isPlaying.value;
  
  // 再生中なら一度停止
  if (wasPlaying) {
    stopPlayback();
  }
  
  // 再生していた場合は新しい位置から再開
  if (wasPlaying) {
    setTimeout(() => {
      playAudio();
    }, 50);
  }
};

// 音量の更新
const updateVolume = () => {
  if (audioStore.gainNode) {
    audioStore.gainNode.gain.value = volume.value;
  }
};

// イコライザーの初期化
const initEqualizerNodes = () => {
  if (!audioStore.audioContext || !audioStore.equalizerBands || audioStore.equalizerBands.length === 0) return;
  
  // 既存のノードを解放
  if (audioStore.eqNodes) {
    audioStore.eqNodes.forEach(node => {
      node.disconnect();
    });
  }
  
  // 各バンドのフィルターノードを作成
  audioStore.eqNodes = audioStore.equalizerBands.map(band => {
    const filter = audioStore.audioContext.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = band.frequency;
    filter.gain.value = band.gain;
    filter.Q.value = 1;
    return filter;
  });
  
  // フィルターノードを直列に接続
  for (let i = 0; i < audioStore.eqNodes.length - 1; i++) {
    audioStore.eqNodes[i].connect(audioStore.eqNodes[i + 1]);
  }
};

// イコライザーの更新
const updateEqualizer = () => {
  if (!audioStore.eqNodes || audioStore.eqNodes.length === 0) return;
  
  // 各バンドのゲイン値を更新
  audioStore.equalizerBands.forEach((band, index) => {
    if (audioStore.eqNodes[index]) {
      audioStore.eqNodes[index].gain.value = band.gain;
    }
  });
};

// イコライザーのリセット
const resetEqualizer = () => {
  audioStore.resetEqualizerBands();
  updateEqualizer();
};

// 時間表示のフォーマット
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

// ファイルサイズのフォーマット
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
};

// 周波数表示のフォーマット
const formatFrequency = (hz) => {
  if (hz < 1000) return hz + ' Hz';
  else return (hz / 1000) + ' kHz';
};

// タイマーID
let timeUpdateInterval = null;

// 再生時間の定期更新を開始
const startTimeUpdate = () => {
  stopTimeUpdate();
  
  timeUpdateInterval = setInterval(() => {
    if (!isPlaying.value) return;
    
    const now = audioStore.audioContext.currentTime;
    const offset = audioStore.currentTime;
    const elapsed = now - audioStore.startTime + offset;
    
    if (elapsed >= audioStore.duration) {
      stopPlayback();
      return;
    }
    
    audioStore.currentTime = Math.min(elapsed, audioStore.duration);
  }, 100);
};

// 再生時間の定期更新を停止
const stopTimeUpdate = () => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }
};

// イベントリスナーの設定
onMounted(() => {
  // ドラッグ&ドロップ操作の処理
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // ファイルを取得して処理
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      // ファイル選択ハンドラに処理を委譲
      handleFileChange({ dataTransfer: event.dataTransfer });
    }
  };
  
  // コンポーネントにドラッグ&ドロップイベントリスナーを設定
  document.addEventListener('dragover', handleDragOver);
  document.addEventListener('drop', handleDrop);
  
  // クリーンアップ
  onBeforeUnmount(() => {
    document.removeEventListener('dragover', handleDragOver);
    document.removeEventListener('drop', handleDrop);
    stopTimeUpdate();
  });
});
</script>

<style scoped>
/* イコライザーのスライダーを縦向きに表示 */
input[orient="vertical"] {
  writing-mode: bt-lr; /* IE */
  -webkit-appearance: slider-vertical; /* WebKit */
  width: 8px;
  height: 100%;
}
</style>