<template>
  <div class="about">
    <h1 class="text-3xl font-bold mb-6">Aves Audio Spectrum について</h1>
    
    <div class="card">
      <p class="mb-4">Aves Audio Spectrumは、音楽や音声ファイルを視覚化し、美しいスペクトラムアニメーションを作成するためのウェブアプリケーションです。</p>
      
      <p class="mb-4">特徴：</p>
      <ul class="list-style-disc pl-6 mb-4">
        <li>複数の視覚化スタイル（バー、円形、波形、粒子など）</li>
        <li>各種パラメータのカスタマイズ（カラー、サイズ、感度など）</li>
        <li>背景の変更（単色、グラデーション、画像）</li>
        <li>イコライザーによる音声調整</li>
        <li>オーディオビジュアルのスクリーンショット保存</li>
        <li>直感的なインターフェース</li>
      </ul>
      
      <p class="mb-4">使用方法：</p>
      <ol class="list-style-decimal pl-6 mb-4">
        <li>エディター画面でオーディオファイルをアップロード</li>
        <li>ビジュアライザータイプと各種設定をカスタマイズ</li>
        <li>背景や色を調整</li>
        <li>必要に応じてイコライザーで音声を調整</li>
        <li>エクスポートボタンでスクリーンショットを保存</li>
      </ol>
      
      <div class="p-3 bg-gray-100 rounded-lg mb-4">
        <h3 class="font-bold mb-2">エクスポート機能について</h3>
        <p class="text-sm">現在のバージョンでは、ビジュアライゼーションのスクリーンショット保存が可能です。完全な動画出力機能は今後のアップデートで追加予定です。</p>
      </div>
      
      <p class="mb-4">このアプリケーションはVue.js、Web Audio API、Canvas APIを使用して構築されています。</p>
      
      <p>バージョン: 1.0.0</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AboutView'
}
</script>

<style>
.list-style-disc {
  list-style-type: disc;
}
.list-style-decimal {
  list-style-type: decimal;
}
.pl-6 {
  padding-left: 1.5rem;
}
.text-3xl {
  font-size: 1.875rem;
  line-height: 2.25rem;
}
</style>
