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

const audioStore = useAudioStore();
const previousVolume = ref(1.0);
let animationFrame = null;

// ストアからのプロパティ
const audioFile = computed(() => audioStore.audioFile);
const duration = computed(() => audioStore.duration);
const isPlaying = computed(() => audioStore.isPlaying);

// 双方向バインディング用プロパティ
const currentTimeValue = ref(0);
const volumeValue = ref(audioStore.volume);

// 計算プロパティ
const currentTime = computed(() => audioStore.currentTime);
const progressPercent = computed(() => {
  return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
});

const volumeIcon = computed(() => {
  if (volumeValue.value <= 0) return '🔇';
  if (volumeValue.value < 0.5) return '🔉';
  return '🔊';
});

// ストアの値の変更を監視
watch(() => audioStore.currentTime, (newTime) => {
  currentTimeValue.value = newTime;
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

// 時間表示のフォーマット
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === Infinity || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
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
  // 再生状態を監視
  watch(() => isPlaying.value, (playing) => {
    if (playing) {
      startTimeUpdate();
    } else {
      stopTimeUpdate();
    }
  });
  
  // iOSのオーディオ初期化 (インタラクションが必要)
  const handleFirstTouch = () => {
    audioStore.initAudioForIOS();
    document.removeEventListener('touchstart', handleFirstTouch);
  };
  
  document.addEventListener('touchstart', handleFirstTouch);
  
  // コンポーネントがアンマウントされる前にイベントリスナーを削除するための参照を保存
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
  margin-top: 12px;
}

.seeker {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #d1d1d1;
  border-radius: 2px;
  outline: none;
}

.seeker::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
}

.seeker:disabled {
  opacity: 0.5;
}
</style>
