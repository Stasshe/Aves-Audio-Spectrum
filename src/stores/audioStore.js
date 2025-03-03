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
    eqNodes: [], // イコライザーノード配列
    duration: 0,
    currentTime: 0,
    startTime: 0, // オーディオ開始時刻を保存
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
    },
    
    // ループ再生設定
    loop: false,
    
    // ローディング状態
    isLoading: false
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
    },
    
    // オーディオファイルの読み込みとデコード
    async loadAudioFile(file) {
      if (!file) return false;
      
      try {
        // ローディング状態を設定
        this.isLoading = true;
        
        // 既存のオーディオ接続をクリーンアップ
        this.stopAudio();
        
        // AudioContext の初期化
        if (!this.audioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.audioContext = new AudioContext();
        }
        
        // ファイルをバッファに変換
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        // ストアの状態を更新
        this.audioBuffer = audioBuffer;
        this.duration = audioBuffer.duration;
        this.currentTime = 0;
        
        console.log('オーディオファイル読み込み完了:', {
          name: file.name,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels
        });
        
        // イコライザーを初期化
        this.initAudioNodes();
        
        // ローディング完了
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error('オーディオファイル読み込みエラー:', error);
        this.isLoading = false;
        return false;
      }
    },
    
    // オーディオノードを初期化
    initAudioNodes() {
      if (!this.audioContext) return;
      
      // ゲインノード（音量調整用）
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      
      // アナライザーノード（可視化用）
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.visualizerSettings.fftSize;
      this.analyser.smoothingTimeConstant = this.visualizerSettings.smoothingTimeConstant;
      
      // イコライザーフィルターを初期化
      this.initEqualizerNodes();
    },
    
    // 再生開始
    playAudio() {
      if (!this.audioBuffer) {
        console.warn('再生するオーディオバッファがありません');
        return false;
      }
      
      if (this.isPlaying) {
        console.log('既に再生中です');
        return true;
      }
      
      try {
        // オーディオコンテキストのチェック
        if (!this.audioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.audioContext = new AudioContext();
          this.initAudioNodes();
        } else if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        
        // 既存のソースノードを解放
        if (this.audioSource) {
          try {
            this.audioSource.stop();
            this.audioSource.disconnect();
          } catch (e) {
            // 既に停止している場合のエラーは無視
          }
        }
        
        // 新しいソースノードを作成
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        
        // ループ設定を適用
        source.loop = this.loop;
        
        // 開始位置を設定（範囲を確認して安全な値を設定）
        const safeCurrentTime = Math.max(0, Math.min(this.currentTime, this.duration));
        
        // ノードを接続
        this.connectAudioNodes(source);
        
        // 再生開始
        source.start(0, safeCurrentTime);
        this.audioSource = source;
        this.isPlaying = true;
        
        // 開始時間を記録（時間追跡用）
        this.startTime = this.audioContext.currentTime - safeCurrentTime;
        
        // 終了時のコールバック
        source.onended = () => {
          // ループモードでない場合かつ自然に終了した場合
          if (!this.loop && this.isPlaying) {
            // 曲の終わりに近い場合は再生終了
            const currentPos = this.currentTime;
            if (this.duration - currentPos < 0.5) {
              if (this.loop) {
                // ループの場合は再度最初から再生
                this.currentTime = 0;
                this.playAudio();
              } else {
                // 通常再生の場合は停止
                this.currentTime = 0;
                this.isPlaying = false;
              }
            }
          }
        };
        
        return true;
      } catch (error) {
        console.error('オーディオ再生エラー:', error);
        this.isPlaying = false;
        return false;
      }
    },
    
    // 一時停止
    pauseAudio() {
      if (!this.isPlaying) return false;
      
      try {
        // 現在の再生位置を保存
        const elapsedTime = this.audioContext.currentTime - this.startTime;
        this.currentTime = Math.min(elapsedTime, this.duration);
        
        // オーディオソースを停止
        if (this.audioSource) {
          this.audioSource.stop();
          this.audioSource.disconnect();
          this.audioSource = null;
        }
        
        this.isPlaying = false;
        return true;
      } catch (error) {
        console.error('一時停止エラー:', error);
        return false;
      }
    },
    
    // 完全停止
    stopAudio() {
      if (!this.audioSource && !this.isPlaying) return true;
      
      try {
        // オーディオソースを停止
        if (this.audioSource) {
          try {
            this.audioSource.stop();
            this.audioSource.disconnect();
          } catch (e) {
            // 既に停止している場合のエラーは無視
          }
          this.audioSource = null;
        }
        
        this.isPlaying = false;
        this.currentTime = 0;
        return true;
      } catch (error) {
        console.error('停止エラー:', error);
        return false;
      }
    },
    
    // シーク（再生位置変更）
    seekAudio(time) {
      // 有効な範囲内に制限
      const safeTime = Math.max(0, Math.min(time, this.duration));
      
      // 現在位置を更新
      this.currentTime = safeTime;
      
      // 再生中なら一旦停止して新しい位置から再開
      if (this.isPlaying) {
        // 現在のソースを停止
        if (this.audioSource) {
          try {
            this.audioSource.stop();
            this.audioSource.disconnect();
          } catch (e) {
            // 既に停止している場合は無視
          }
          this.audioSource = null;
        }
        
        // 少し遅延してから再開（iOSの互換性のため）
        setTimeout(() => {
          this.playAudio();
        }, 50);
      }
      
      return true;
    },
    
    // 音量変更
    setVolume(value) {
      // 有効な範囲内に制限
      const safeVolume = Math.max(0, Math.min(1, value));
      this.volume = safeVolume;
      
      // ゲインノードがあれば音量を更新
      if (this.gainNode) {
        this.gainNode.gain.value = safeVolume;
      }
    },
    
    // イコライザーノードの初期化
    initEqualizerNodes() {
      if (!this.audioContext || !this.equalizerBands || this.equalizerBands.length === 0) return;
      
      // 既存のノードをクリア
      if (this.eqNodes && this.eqNodes.length > 0) {
        this.eqNodes.forEach(node => {
          try {
            node.disconnect();
          } catch (e) {
            // 切断エラーは無視
          }
        });
      }
      
      // 各周波数帯域のフィルターを作成
      this.eqNodes = this.equalizerBands.map(band => {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'peaking'; // EQのピーキングフィルター
        filter.frequency.value = band.frequency;
        filter.Q.value = 1.0;
        filter.gain.value = band.gain;
        return filter;
      });
      
      // フィルターを直列につなぐ
      for (let i = 0; i < this.eqNodes.length - 1; i++) {
        this.eqNodes[i].connect(this.eqNodes[i + 1]);
      }
    },
    
    // イコライザーを更新
    updateEqualizer() {
      if (!this.eqNodes || this.eqNodes.length === 0) return;
      
      // 各バンドのゲイン値を設定
      this.equalizerBands.forEach((band, index) => {
        if (index < this.eqNodes.length) {
          this.eqNodes[index].gain.value = band.gain;
        }
      });
      
      // 再接続が必要な場合（オーディオソースを変更した場合など）
      if (this.audioSource && this.isPlaying) {
        this.connectAudioNodes(this.audioSource);
      }
    },
    
    // オーディオノードの接続
    connectAudioNodes(source) {
      if (!source || !this.gainNode || !this.analyser) return;
      
      // イコライザーを適用するかどうかで接続を変える
      if (this.applyEqToAudio && this.eqNodes && this.eqNodes.length > 0) {
        // イコライザー経由で接続
        source.connect(this.eqNodes[0]);
        this.eqNodes[this.eqNodes.length - 1].connect(this.gainNode);
      } else {
        // イコライザーをバイパス
        source.connect(this.gainNode);
      }
      
      // 音量とアナライザーを接続
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    },
    
    // 現在の再生時間を更新（アニメーションフレーム用）
    updateCurrentTime() {
      if (!this.isPlaying || !this.audioContext || !this.startTime) return;
      
      // 開始時間からの経過を計算
      const elapsedTime = this.audioContext.currentTime - this.startTime;
      
      if (this.loop) {
        // ループモードの場合は時間を循環させる
        this.currentTime = elapsedTime % this.duration;
        return;
      }
      
      // 曲の長さを超えた場合は再生を停止
      if (elapsedTime >= this.duration) {
        this.currentTime = this.duration;
        this.isPlaying = false;
        
        // オーディオソースも停止
        if (this.audioSource) {
          try {
            this.audioSource.stop();
          } catch (e) {
            // 既に停止している場合は無視
          }
        }
        return;
      }
      
      // 現在の再生位置を更新
      this.currentTime = elapsedTime;
    },
    
    // iOSの黙示的再生対応
    initAudioForIOS() {
      // iOSではユーザー操作がないとオーディオが再生できない
      if (!this.audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
      }
      
      // 無音バッファを再生して初期化
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    },
    
    // ループ設定の切り替え
    toggleLoop() {
      this.loop = !this.loop;
      
      // 再生中なら現在のソースノードにもループ設定を適用
      if (this.audioSource) {
        this.audioSource.loop = this.loop;
      }
      
      return this.loop;
    }
  },
  
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'aves-audio-settings',
        storage: localStorage,
        paths: ['visualizerSettings', 'background', 'equalizerBands', 'applyEqToAudio', 'exportSettings', 'volume', 'loop']
      }
    ]
  }
});
