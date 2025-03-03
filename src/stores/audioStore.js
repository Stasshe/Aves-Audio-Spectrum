import { defineStore } from 'pinia';

export const useAudioStore = defineStore('audio', {
  state: () => ({
    // 音声ファイル
    audioFile: null,
    audioElement: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    
    // 解析設定
    analyzerNode: null,
    
    // ビジュアライザー設定
    visualizerSettings: {
      type: 'bars',  // bars, circle, wave, waveform, particles
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      sensitivity: 1.0,
      
      // バータイプ設定
      bars: {
        count: 64,
        width: 10,
        spacing: 2,
        minHeight: 3,
        roundedTop: false,
        horizontalAlign: 'center', // 'left', 'center', 'right'
        verticalAlign: 'bottom'    // 'top', 'middle', 'bottom'
      },
      
      // 円形タイプ設定
      circle: {
        radius: 150,         // 最大半径
        minRadius: 75,       // 最小半径（新規追加）
        centerX: 0.5,        // 中心X位置（0-1）
        centerY: 0.5,        // 中心Y位置（0-1）
        rotation: 0,         // 回転（度）
        mirrorMode: false,   // ミラーモード
        theme: 'default',    // 円形テーマ（新規追加): 'default', 'outline', 'outlineFilled', 'hollow'
        lineWidth: 2         // アウトラインの線の太さ（新規追加）
      },
      
      // 波形タイプ設定
      wave: {
        points: 100,
        amplitude: 50,
        frequency: 1.0,
        smoothing: 0.7
      },
      
      // 色設定
      color: {
        type: 'gradient',  // 'solid', 'gradient', 'frequency'
        
        // 単色の場合
        solid: '#3498DB',
        
        // グラデーションの場合
        gradient: {
          colors: ['#3498DB', '#8E44AD'],
          angle: 90  // 90度は下から上へ
        },
        
        // 周波数カラーマッピング
        frequencyColors: [
          { freq: 20, color: '#0000FF' },    // 20Hz = 青
          { freq: 200, color: '#00FF00' },   // 200Hz = 緑
          { freq: 2000, color: '#FFFF00' },  // 2kHz = 黄
          { freq: 20000, color: '#FF0000' }  // 20kHz = 赤
        ]
      }
    },
    
    // 背景設定
    background: {
      type: 'color',  // 'color', 'gradient', 'image'
      
      // 単色の場合
      color: '#000000',
      
      // グラデーションの場合
      gradient: {
        colors: ['#000000', '#333333'],
        angle: 45
      },
      
      // 画像の場合
      image: null,
      opacity: 0.8,
      blur: 0,
      
      // キャシュ用（直接変更しない）
      _imageCache: null
    },
    
    // 一般設定
    generalSettings: {
      fpsLimit: 60,
      highQuality: false,
      responsiveSizing: true
    }
  }),
  
  actions: {
    // オーディオファイルをセット
    setAudioFile(file) {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.src = '';
      }
      
      this.audioFile = file;
      this.isPlaying = false;
      this.currentTime = 0;
      
      if (file) {
        this.audioElement = new Audio();
        this.audioElement.src = URL.createObjectURL(file);
        
        // メタデータ読み込み後にdurationをセット
        this.audioElement.onloadedmetadata = () => {
          this.duration = this.audioElement.duration;
        };
        
        // 終了時の処理
        this.audioElement.onended = () => {
          this.isPlaying = false;
        };
        
        // 時間更新
        this.audioElement.ontimeupdate = () => {
          this.currentTime = this.audioElement.currentTime;
        };
      } else {
        this.audioElement = null;
        this.duration = 0;
      }
    },
    
    // 再生・一時停止
    togglePlay() {
      if (!this.audioElement) return;
      
      if (this.isPlaying) {
        this.audioElement.pause();
      } else {
        this.audioElement.play();
      }
      
      this.isPlaying = !this.isPlaying;
    },
    
    // シーク
    seek(time) {
      if (!this.audioElement) return;
      
      this.audioElement.currentTime = time;
      this.currentTime = time;
    },
    
    // ボリューム設定
    setVolume(volume) {
      if (!this.audioElement) return;
      
      this.volume = volume;
      this.audioElement.volume = volume;
    },
    
    // ビジュアライザー設定を更新
    updateVisualizerSettings(settings) {
      this.visualizerSettings = {
        ...this.visualizerSettings,
        ...settings
      };
    },
    
    // 背景設定を更新
    updateBackground(settings) {
      this.background = {
        ...this.background,
        ...settings
      };
    },
    
    // 背景画像をアップロード
    setBackgroundImage(file) {
      // 以前の画像のObjectURLを解放
      if (this.background.image && typeof this.background.image === 'object') {
        URL.revokeObjectURL(this.background.image);
      }
      
      this.background.image = file;
      this.background.type = 'image';
      
      // キャッシュをクリア（新たに読み込む）
      this.background._imageCache = null;
    }
  },
  
  getters: {
    hasAudio: (state) => !!state.audioFile,
    formattedCurrentTime: (state) => {
      const minutes = Math.floor(state.currentTime / 60);
      const seconds = Math.floor(state.currentTime % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    formattedDuration: (state) => {
      const minutes = Math.floor(state.duration / 60);
      const seconds = Math.floor(state.duration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
