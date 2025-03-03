import { defineStore } from 'pinia';

export const useAudioStore = defineStore('audio', {
  state: () => ({
    // オーディオ関連
    audioFile: null,
    audioBuffer: null,
    audioContext: null,
    audioSource: null,
    analyser: null,
    gainNode: null,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    volume: 1.0,
    
    // ビジュアライザー関連
    visualizer: null, // ビジュアライザーオブジェクトへの参照を保持
    visualizerSettings: {
      type: 'bars',
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      sensitivity: 1.0,
      
      // バータイプの設定
      bars: {
        count: 64,
        width: 10,
        spacing: 2,
        minHeight: 2,
        roundedTop: true,
        horizontalAlign: 'center',
        verticalAlign: 'bottom'
      },
      
      // 円形タイプの設定
      circle: {
        radius: 100,
        centerX: 0.5,
        centerY: 0.5,
        rotation: 0,
        mirrorMode: false
      },
      
      // 波形タイプの設定
      wave: {
        points: 100,
        amplitude: 50,
        frequency: 1,
        smoothing: 0.5
      },
      
      // 色設定
      color: {
        type: 'solid',
        solid: '#3498DB',
        gradient: {
          colors: ['#3498DB', '#8E44AD'],
          angle: 90
        },
        frequencyColors: [
          { freq: 20, color: '#0000FF' },
          { freq: 200, color: '#00FF00' },
          { freq: 500, color: '#FFFF00' },
          { freq: 2000, color: '#FF0000' },
          { freq: 20000, color: '#FF00FF' }
        ]
      }
    },
    
    // 背景設定
    background: {
      type: 'gradient', // color, gradient, image
      color: '#000000',
      gradient: {
        colors: ['#16213E', '#0F3460', '#533483'],
        angle: 180
      },
      image: null,
      blur: 0,
      opacity: 1
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
    
    // イコライザーが音声に適用されるか
    applyEqToAudio: true,
    
    // エクスポート設定
    exportSettings: {
      resolution: '1080p', // 720p, 1080p, 4k
      fps: 30,
      format: 'mp4', // mp4, webm, gif
      videoBitrate: '8000k', // 4000k, 8000k, 16000k
      audioBitrate: '256k', // 128k, 256k, 320k
      duration: null // null = 全体
    }
  }),
  
  actions: {
    setAudioFile(file) {
      this.audioFile = file;
    },
    
    resetEqualizerBands() {
      this.equalizerBands.forEach(band => {
        band.gain = 0;
      });
    },
    
    // ストア内のオーディオメタデータを更新
    updateAudioMetadata(metadata) {
      if (metadata) {
        this.duration = metadata.duration || 0;
      }
    }
  },
  
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'aves-audio-settings',
        storage: localStorage,
        paths: ['visualizerSettings', 'background', 'equalizerBands', 'applyEqToAudio', 'exportSettings']
      }
    ]
  }
});
