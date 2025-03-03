<template>
  <div id="audio-settings-component">
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
    
    <!-- 波形表示コンポーネント -->
    <div class="mb-2" v-if="audioFile">
      <AudioWaveform :height="80" />
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
      
      <!-- 改善されたイコライザー -->
      <div class="equalizer-container">
        <div
          v-for="(band, index) in equalizerBands"
          :key="index"
          class="equalizer-band"
        >
          <span class="gain-value" :class="getBandClass(band.gain)">
            {{ band.gain > 0 ? '+' : '' }}{{ band.gain.toFixed(1) }}
          </span>
          <div class="slider-container">
            <input
              type="range"
              class="vertical-slider"
              min="-12"
              max="12"
              step="0.5"
              v-model.number="band.gain"
              @input="updateEqualizer"
            />
            <div class="center-line"></div>
          </div>
          <span class="frequency-label">{{ formatFrequency(band.frequency) }}</span>
        </div>
      </div>
      
      <div class="flex items-center mt-2">
        <input type="checkbox" v-model="audioStore.applyEqToAudio" id="applyEq" class="mr-2" />
        <label for="applyEq" class="text-sm">音声にも適用する</label>
      </div>
      
      <!-- イコライザープリセット -->
      <div class="mt-4">
        <h4 class="text-sm font-medium mb-2">プリセット</h4>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="(preset, index) in eqPresets"
            :key="index"
            @click="applyEqPreset(preset.gains)"
            class="btn btn-sm btn-secondary"
          >
            {{ preset.name }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useAudioStore } from '@/stores/audioStore';
import AudioWaveform from '@/components/waveform/AudioWaveform.vue';
import { formatTime, formatFileSize, formatFrequency, isSupportedAudioFormat } from '@/utils/audioUtils';

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
  if (!file.type.startsWith('audio/') && !isSupportedAudioFormat(file)) {
    alert('対応していないファイル形式です。オーディオファイルを選択してください。');
    return;
  }
  
  try {
    // ファイルをストアに保存
    audioStore.setAudioFile(file);
    
    // ファイルをロード
    const success = await audioStore.loadAudioFile(file);
    if (!success) {
      alert('オーディオファイルのロードに失敗しました');
      audioStore.setAudioFile(null);
    }
  } catch (error) {
    console.error('オーディオファイル読み込みエラー:', error);
    alert('オーディオファイルの読み込み中にエラーが発生しました。');
    audioStore.setAudioFile(null);
  }
};

// ファイル削除
const removeAudioFile = () => {
  // 再生停止
  stopPlayback();
  
  // ストアのオーディオファイル情報をクリア
  audioStore.setAudioFile(null);
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
    audioStore.pauseAudio();
  } else {
    audioStore.playAudio();
  }
};

// 再生停止
const stopPlayback = () => {
  audioStore.stopAudio();
};

// 再生位置の変更
const seekAudio = () => {
  audioStore.seekAudio(currentTime.value);
};

// 音量の更新
const updateVolume = () => {
  audioStore.setVolume(volume.value);
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

// イコライザーゲイン値に応じたクラスを返す
const getBandClass = (gain) => {
  if (gain > 0) return 'gain-positive';
  if (gain < 0) return 'gain-negative';
  return 'gain-neutral';
};

// イコライザープリセット
const eqPresets = [
  { name: 'フラット', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'ベース増強', gains: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: '高音増強', gains: [0, 0, 0, 0, 0, 2, 4, 6, 8, 8] },
  { name: 'ボーカル', gains: [-2, -2, 0, 4, 6, 6, 4, 2, 0, 0] },
  { name: 'スピーチ', gains: [-6, -2, 0, 4, 6, 6, 4, 0, -2, -6] },
  { name: 'ポップ', gains: [-2, 0, 4, 6, 4, 0, -2, -2, -2, 0] },
];

// イコライザープリセットの適用
const applyEqPreset = (gains) => {
  audioStore.equalizerBands.forEach((band, index) => {
    if (index < gains.length) {
      band.gain = gains[index];
    }
  });
  audioStore.updateEqualizer();
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

/* 改善されたイコライザーのスタイル */
.equalizer-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 180px;
  padding: 10px 0;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
}

.equalizer-band {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
  padding: 0 2px;
}

.gain-value {
  font-size: 0.75rem;
  font-weight: 500;
  height: 20px;
  display: flex;
  align-items: center;
}

.gain-positive {
  color: #4caf50;
}

.gain-negative {
  color: #f44336;
}

.gain-neutral {
  color: #757575;
}

.slider-container {
  position: relative;
  height: 120px;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0 5px;
}

.vertical-slider {
  -webkit-appearance: slider-vertical;
  width: 20px;
  height: 100%;
  background: transparent;
  margin: 0;
  padding: 0;
}

.vertical-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 8px;
  border-radius: 4px;
  background: #3498DB;
  cursor: pointer;
}

.vertical-slider::-moz-range-thumb {
  width: 16px;
  height: 8px;
  border-radius: 4px;
  background: #3498DB;
  cursor: pointer;
}

.center-line {
  position: absolute;
  top: 50%;
  width: 100%;
  height: 1px;
  background: rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

.frequency-label {
  font-size: 0.7rem;
  color: #666;
  margin-top: 6px;
  text-align: center;
  height: 20px;
}
</style>