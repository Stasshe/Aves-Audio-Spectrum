<template>
  <div class="audio-controls">
    <div class="player-container">
      <!-- 波形表示 -->
      <div class="waveform-container" v-if="audioFile">
        <AudioWaveform :height="60" />
      </div>
      
      <!-- コントロール -->
      <div class="controls">
        <!-- 時間表示 -->
        <div class="time-display">
          <span>{{ formatTime(currentTime) }}</span>
          <span class="time-divider">/</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
        
        <!-- 再生コントロールボタン -->
        <div class="playback-controls">
          <button class="control-button" @click="skipBackward" :disabled="!audioFile">
            <span class="icon">⏮</span>
          </button>
          
          <button class="control-button play-button" @click="togglePlayback" :disabled="!audioFile">
            <span class="icon" v-if="isPlaying">⏸</span>
            <span class="icon" v-else>▶</span>
          </button>
          
          <button class="control-button" @click="skipForward" :disabled="!audioFile">
            <span class="icon">⏭</span>
          </button>
          
          <!-- ループボタン -->
          <button
            class="control-button loop-button"
            @click="toggleLoop"
            :disabled="!audioFile"
            :class="{ 'active': loop }"
          >
            <span class="icon">🔁</span>
          </button>
        </div>
        
        <!-- 音量コントロール -->
        <div class="volume-control">
          <span class="volume-icon" @click="toggleMute">
            {{ volumeIcon }}
          </span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            v-model.number="volumeValue"
            @input="updateVolume" 
            class="volume-slider"
          />
        </div>
      </div>
    </div>
    
    <!-- タイムラインシークバー -->
    <div class="seeker-container">
      <!-- バーの背景（プログレス表示） -->
      <div class="seeker-progress" :style="{ width: `${progressPercent}%` }"></div>
      <input 
        type="range"
        class="seeker"
        min="0"
        :max="duration"
        step="0.01"
        v-model.number="currentTimeValue"
        @input="seek"
        :disabled="!audioFile"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useAudioStore } from '@/stores/audioStore';
import AudioWaveform from '@/components/waveform/AudioWaveform.vue';
import { formatTime } from '@/utils/audioUtils';

const audioStore = useAudioStore();
const previousVolume = ref(1.0);
let animationFrame = null;

// ストアからのプロパティ
const audioFile = computed(() => audioStore.audioFile);
const duration = computed(() => audioStore.duration);
const isPlaying = computed(() => audioStore.isPlaying);
const loop = computed(() => audioStore.loop);

// 双方向バインディング用プロパティ
const currentTimeValue = ref(0);
const volumeValue = ref(audioStore.volume);

// 計算プロパティ
const currentTime = computed(() => audioStore.currentTime);
const progressPercent = computed(() => {
  if (!duration.value || duration.value <= 0) return 0;
  const percent = (currentTime.value / duration.value) * 100;
  return isNaN(percent) ? 0 : Math.max(0, Math.min(percent, 100));
});

const volumeIcon = computed(() => {
  if (volumeValue.value <= 0) return '🔇';
  if (volumeValue.value < 0.5) return '🔉';
  return '🔊';
});

// ストアの値の変更を監視（双方向バインディング）
watch(() => audioStore.currentTime, (newTime) => {
  if (!isNaN(newTime) && isFinite(newTime)) {
    currentTimeValue.value = newTime;
  }
});

watch(() => audioStore.volume, (newVolume) => {
  volumeValue.value = newVolume;
});

// 再生/一時停止を切り替え
const togglePlayback = () => {
  if (!audioFile.value) return;
  
  if (isPlaying.value) {
    audioStore.pauseAudio();
    stopTimeUpdate();
  } else {
    audioStore.playAudio();
    startTimeUpdate();
  }
};

// ループ再生を切り替え
const toggleLoop = () => {
  audioStore.toggleLoop();
};

// 再生位置を変更
const seek = () => {
  if (!audioFile.value) return;
  audioStore.seekAudio(currentTimeValue.value);
};

// 音量を更新
const updateVolume = () => {
  audioStore.setVolume(volumeValue.value);
};

// ミュート切り替え
const toggleMute = () => {
  if (volumeValue.value > 0) {
    previousVolume.value = volumeValue.value;
    volumeValue.value = 0;
  } else {
    volumeValue.value = previousVolume.value || 1.0;
  }
  updateVolume();
};

// 10秒前へ
const skipBackward = () => {
  if (!audioFile.value) return;
  const newTime = Math.max(currentTime.value - 10, 0);
  audioStore.seekAudio(newTime);
};

// 10秒後へ
const skipForward = () => {
  if (!audioFile.value) return;
  const newTime = Math.min(currentTime.value + 10, duration.value);
  audioStore.seekAudio(newTime);
};

// アニメーションフレームを使用して滑らかに更新
const startTimeUpdate = () => {
  stopTimeUpdate();
  
  const updateTime = () => {
    if (!isPlaying.value) {
      stopTimeUpdate();
      return;
    }
    
    audioStore.updateCurrentTime();
    animationFrame = requestAnimationFrame(updateTime);
  };
  
  animationFrame = requestAnimationFrame(updateTime);
};

const stopTimeUpdate = () => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
};

// ライフサイクルフック
onMounted(() => {
  // 初期値を設定
  currentTimeValue.value = audioStore.currentTime;
  
  // 再生状態を監視
  watch(() => isPlaying.value, (playing) => {
    if (playing) {
      startTimeUpdate();
    } else {
      stopTimeUpdate();
    }
  });
  
  // 既に再生中なら更新を開始
  if (isPlaying.value) {
    startTimeUpdate();
  }
  
  // iOSのオーディオ初期化 (インタラクションが必要)
  const handleFirstTouch = () => {
    audioStore.initAudioForIOS();
    document.removeEventListener('touchstart', handleFirstTouch);
  };
  
  document.addEventListener('touchstart', handleFirstTouch);
  
  // クリーンアップ
  onBeforeUnmount(() => {
    stopTimeUpdate();
    document.removeEventListener('touchstart', handleFirstTouch);
  });
});
</script>

<style scoped>
.audio-controls {
  width: 100%;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
}

.player-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.waveform-container {
  position: relative;
  height: 60px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
}

.time-display {
  font-size: 12px;
  color: #666;
  min-width: 100px;
}

.time-divider {
  margin: 0 4px;
  opacity: 0.5;
}

.playback-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.control-button {
  background: none;
  border: none;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.control-button:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-button {
  background-color: #3498db;
  color: white;
}

.play-button:hover:not(:disabled) {
  background-color: #2980b9;
}

.icon {
  font-size: 18px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 100px;
}

.volume-icon {
  cursor: pointer;
}

.volume-slider {
  width: 70px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #d1d1d1;
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
}

.seeker-container {
  position: relative;
  margin-top: 12px;
  height: 16px;
  display: flex;
  align-items: center;
}

.seeker-progress {
  position: absolute;
  left: 0;
  height: 4px;
  background-color: #3498db;
  border-radius: 2px;
  pointer-events: none;
  z-index: 1;
}

.seeker {
  position: relative;
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #d1d1d1;
  border-radius: 2px;
  outline: none;
  z-index: 2;
  opacity: 0.8;
  cursor: pointer;
}

.seeker::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}

.seeker::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}

.seeker:disabled {
  opacity: 0.4;
}

.loop-button.active {
  color: #3498db;
  background-color: rgba(52, 152, 219, 0.1);
}
</style>
