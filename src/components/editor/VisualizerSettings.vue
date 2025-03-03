<template>
  <div>
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">ビジュアライザータイプ</label>
      <div class="grid grid-cols-3 gap-2">
        <button 
          v-for="type in visualizerTypes" 
          :key="type.id"
          @click="settings.type = type.id"
          class="btn text-sm p-2" 
          :class="settings.type === type.id ? 'btn-primary' : 'btn-secondary'"
        >
          {{ type.name }}
        </button>
      </div>
    </div>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">感度</label>
      <div class="flex gap-2 items-center">
        <input 
          type="range" 
          v-model.number="settings.sensitivity" 
          min="0.1" 
          max="5" 
          step="0.1" 
          class="flex-1"
        />
        <span class="text-sm w-12 text-right">{{ settings.sensitivity }}</span>
      </div>
    </div>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">平滑化</label>
      <div class="flex gap-2 items-center">
        <input 
          type="range" 
          v-model.number="settings.smoothingTimeConstant" 
          min="0" 
          max="0.99" 
          step="0.01" 
          class="flex-1"
        />
        <span class="text-sm w-12 text-right">{{ settings.smoothingTimeConstant }}</span>
      </div>
    </div>
    
    <!-- バータイプの設定 -->
    <div v-if="settings.type === 'bars'">
      <h3 class="font-medium text-sm mb-2 mt-4">バー設定</h3>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">バー数</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.bars.count" 
            min="16" 
            max="200" 
            step="1" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.bars.count }}</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">バー幅</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.bars.width" 
            min="1" 
            max="50" 
            step="1" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.bars.width }}px</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">間隔</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.bars.spacing" 
            min="0" 
            max="20" 
            step="1" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.bars.spacing }}px</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">最小高さ</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.bars.minHeight" 
            min="0" 
            max="20" 
            step="1" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.bars.minHeight }}px</span>
        </div>
      </div>
      
      <div class="mb-4 flex gap-4">
        <div>
          <label class="flex items-center">
            <input type="checkbox" v-model="settings.bars.roundedTop" class="mr-2">
            <span class="text-sm">丸い上部</span>
          </label>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">横位置</label>
        <div class="grid grid-cols-3 gap-2">
          <button 
            v-for="align in horizontalAligns" 
            :key="align.id"
            @click="settings.bars.horizontalAlign = align.id"
            class="btn text-xs p-1" 
            :class="settings.bars.horizontalAlign === align.id ? 'btn-primary' : 'btn-secondary'"
          >
            {{ align.name }}
          </button>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">縦位置</label>
        <div class="grid grid-cols-3 gap-2">
          <button 
            v-for="align in verticalAligns" 
            :key="align.id"
            @click="settings.bars.verticalAlign = align.id"
            class="btn text-xs p-1" 
            :class="settings.bars.verticalAlign === align.id ? 'btn-primary' : 'btn-secondary'"
          >
            {{ align.name }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 円形タイプの設定 -->
    <div v-if="settings.type === 'circle'">
      <h3 class="font-medium text-sm mb-2 mt-4">円形設定</h3>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">テーマ</label>
        <div class="grid grid-cols-2 gap-2">
          <button 
            v-for="theme in circleThemes" 
            :key="theme.id"
            @click="settings.circle.theme = theme.id"
            class="btn text-xs p-1" 
            :class="settings.circle.theme === theme.id ? 'btn-primary' : 'btn-secondary'"
          >
            {{ theme.name }}
          </button>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">最大半径</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.circle.radius" 
            min="50" 
            max="500" 
            step="10" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.circle.radius }}px</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">最小半径</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.circle.minRadius" 
            :min="10" 
            :max="settings.circle.radius - 10" 
            step="5" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.circle.minRadius }}px</span>
        </div>
      </div>
      
      <div v-if="settings.circle.theme === 'outline' || settings.circle.theme === 'outlineFilled'" class="mb-4">
        <label class="block text-sm mb-1">線の太さ</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.circle.lineWidth" 
            min="1" 
            max="10" 
            step="0.5" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.circle.lineWidth }}px</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">X中心位置</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.circle.centerX" 
            min="0" 
            max="1" 
            step="0.01" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.circle.centerX }}</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">Y中心位置</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.circle.centerY" 
            min="0" 
            max="1" 
            step="0.01" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.circle.centerY }}</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">回転角度</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.circle.rotation" 
            min="0" 
            max="360" 
            step="1" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.circle.rotation }}°</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="flex items-center">
          <input type="checkbox" v-model="settings.circle.mirrorMode" class="mr-2">
          <span class="text-sm">ミラーモード</span>
        </label>
      </div>
    </div>
    
    <!-- 波形タイプの設定 -->
    <div v-if="settings.type === 'wave'">
      <h3 class="font-medium text-sm mb-2 mt-4">波形設定</h3>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">ポイント数</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.wave.points" 
            min="20" 
            max="500" 
            step="10" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.wave.points }}</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">振幅</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.wave.amplitude" 
            min="10" 
            max="200" 
            step="5" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.wave.amplitude }}</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">周波数</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.wave.frequency" 
            min="0.1" 
            max="5" 
            step="0.1" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.wave.frequency }}</span>
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm mb-1">スムージング</label>
        <div class="flex gap-2 items-center">
          <input 
            type="range" 
            v-model.number="settings.wave.smoothing" 
            min="0" 
            max="0.95" 
            step="0.05" 
            class="flex-1"
          />
          <span class="text-sm w-12 text-right">{{ settings.wave.smoothing }}</span>
        </div>
      </div>
    </div>
    
    <!-- 色設定 (すべてのタイプ共通) -->
    <h3 class="font-medium text-sm mb-2 mt-4">色設定</h3>
    
    <div class="mb-4">
      <label class="block text-sm mb-1">カラータイプ</label>
      <div class="grid grid-cols-3 gap-2">
        <button 
          v-for="type in colorTypes" 
          :key="type.id"
          @click="settings.color.type = type.id"
          class="btn text-xs p-1" 
          :class="settings.color.type === type.id ? 'btn-primary' : 'btn-secondary'"
        >
          {{ type.name }}
        </button>
      </div>
    </div>
    
    <!-- 単色設定 -->
    <div v-if="settings.color.type === 'solid'" class="mb-4">
      <label class="block text-sm mb-1">カラー</label>
      <input 
        type="color" 
        v-model="settings.color.solid" 
        class="w-full h-10 rounded cursor-pointer"
      />
    </div>
    
    <!-- グラデーション設定 -->
    <div v-if="settings.color.type === 'gradient'" class="mb-4">
      <label class="block text-sm mb-1">グラデーション色</label>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <div v-for="(color, index) in settings.color.gradient.colors" :key="index" class="relative">
          <input 
            type="color"
            v-model="settings.color.gradient.colors[index]"
            class="w-full h-10 rounded cursor-pointer"
          />
          <button 
            v-if="settings.color.gradient.colors.length > 2"
            @click="removeGradientColor(index)"
            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
          >
            &times;
          </button>
        </div>
        <button 
          v-if="settings.color.gradient.colors.length < 5"
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
          v-model.number="settings.color.gradient.angle" 
          min="0" 
          max="360" 
          step="1"
          class="flex-1"
        />
        <span class="text-sm w-12 text-right">{{ settings.color.gradient.angle }}°</span>
      </div>
    </div>
    
    <!-- 周波数カラー設定 -->
    <div v-if="settings.color.type === 'frequency'" class="mb-4">
      <label class="block text-sm mb-1">周波数カラーマップ</label>
      <div v-for="(item, index) in settings.color.frequencyColors" :key="index" class="mb-2 flex items-center gap-2">
        <div class="w-16 text-xs">{{ formatFrequency(item.freq) }}</div>
        <input 
          type="color" 
          v-model="item.color"
          class="h-8 flex-1 rounded cursor-pointer"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAudioStore } from '@/stores/audioStore';

const audioStore = useAudioStore();
const settings = computed(() => audioStore.visualizerSettings);

// ビジュアライザータイプ
const visualizerTypes = [
  { id: 'bars', name: 'バー' },
  { id: 'circle', name: '円形' },
  { id: 'wave', name: '波形' },
  { id: 'waveform', name: '音波' },
  { id: 'particles', name: 'パーティクル' }
];

// 色タイプ
const colorTypes = [
  { id: 'solid', name: '単色' },
  { id: 'gradient', name: 'グラデーション' },
  { id: 'frequency', name: '周波数' }
];

// 位置設定
const horizontalAligns = [
  { id: 'left', name: '左' },
  { id: 'center', name: '中央' },
  { id: 'right', name: '右' }
];

const verticalAligns = [
  { id: 'top', name: '上' },
  { id: 'middle', name: '中央' },
  { id: 'bottom', name: '下' }
];

// グラデーション色を追加
const addGradientColor = () => {
  if (!Array.isArray(settings.value.color.gradient.colors)) {
    settings.value.color.gradient.colors = ['#3498DB', '#8E44AD'];
  } else if (settings.value.color.gradient.colors.length < 5) {
    settings.value.color.gradient.colors.push('#ffffff');
  }
};

// グラデーション色を削除
const removeGradientColor = (index) => {
  if (Array.isArray(settings.value.color.gradient.colors) && settings.value.color.gradient.colors.length > 2) {
    settings.value.color.gradient.colors.splice(index, 1);
  }
};

// 周波数のフォーマット
const formatFrequency = (freq) => {
  return freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`;
};

// 円形テーマ
const circleThemes = [
  { id: 'default', name: 'デフォルト' },
  { id: 'outline', name: 'アウトライン' },
  { id: 'outlineFilled', name: 'アウトライン塗りつぶし' }
];
</script>