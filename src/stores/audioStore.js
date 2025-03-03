import { defineStore } from 'pinia';

export const useAudioStore = defineStore('audio', {
  state: () => ({
    audioFile: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    
    // ビジュアライザー設定
    visualizerSettings: {
      type: 'bars', // 'bars', 'circle', 'wave', 'waveform', 'particles'
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      sensitivity: 1.5,
      
      // バー設定
      bars: {
        count: 64,
        width: 10,
        spacing: 2,
        minHeight: 3,
        roundedTop: true,
        horizontalAlign: 'center', // 'left', 'center', 'right'
        verticalAlign: 'bottom',   // 'top', 'middle', 'bottom'
      },
      
      // 円形設定 - 感度調整済み
      circle: {
        radius: 150,
        centerX: 0.5,
        centerY: 0.5,
        rotation: 0,
        mirrorMode: false,
      },
      
      // 波形設定
      wave: {
        points: 100,
        amplitude: 50,
        frequency: 1,
        smoothing: 0.5,
      },
      
      // 色設定
      color: {
        type: 'solid', // 'solid', 'gradient', 'frequency'
        solid: '#3498DB',
        gradient: {
          colors: ['#3498DB', '#8E44AD'],
          angle: 90,
        },
        frequencyColors: [
          { freq: 20, color: '#0066FF' },    // 低音
          { freq: 300, color: '#00CCFF' },  // 中低音
          { freq: 2000, color: '#00FFCC' }, // 中音
          { freq: 10000, color: '#FFCC00' }, // 高音
          { freq: 20000, color: '#FF3300' }  // 超高音
        ]
      }
    },
    
    // 背景設定
    background: {
      type: 'color', // 'color', 'gradient', 'image'
      color: '#000000',
      gradient: {
        colors: ['#16213E', '#0F3460'],
        angle: 45
      },
      image: null,
      blur: 0,
      opacity: 1,
      _imageCache: null // 内部用、画像キャッシュ
    },
    
    // イコライザー設定
    equalizerBands: [
      { frequency: 32, gain: 0 },
      { frequency: 64, gain: 0 },
      { frequency: 125, gain: 0 },
      { frequency: 250, gain: 0 },
      { frequency: 500, gain: 0 },
      { frequency: 1000, gain: 0 },
      { frequency: 2000, gain: 0 },
      { frequency: 4000, gain: 0 },
      { frequency: 8000, gain: 0 },
      { frequency: 16000, gain: 0 }
    ],
    applyEqToAudio: false,
    
    // エクスポート設定
    exportSettings: {
      resolution: '1080p',
      fps: 30,
      format: 'mp4',
      videoBitrate: '8000k',
      audioBitrate: '320k',
      duration: null // null は全体をエクスポート
    }
  }),
  
  actions: {
    // イコライザーバンドをリセット
    resetEqualizerBands() {
      this.equalizerBands.forEach(band => {
        band.gain = 0;
      });
    },
    
    // エクスポート設定を更新
    updateExportSettings(settings) {
      this.exportSettings = {
        ...this.exportSettings,
        ...settings
      };
    },
    
    // ビジュアライザー設定を更新
    updateVisualizerSettings(settings) {
      this.visualizerSettings = {
        ...this.visualizerSettings,
        ...settings
      };
    }
  },
  
  getters: {
    // エクスポート解像度を取得
    exportDimensions(state) {
      switch(state.exportSettings.resolution) {
        case '720p': return { width: 1280, height: 720 };
        case '1080p': return { width: 1920, height: 1080 };
        case '4k': return { width: 3840, height: 2160 };
        default: return { width: 1920, height: 1080 };
      }
    }
  }
});
