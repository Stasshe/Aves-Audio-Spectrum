# Aves Audio Spectrum

オーディオファイルのスペクトル分析と視覚化を行うWebアプリケーション。様々なビジュアライザーを使用してオーディオを視覚的に表現し、画像や動画として保存できます。

## 特徴

- 複数のビジュアライザータイプ（バー、円形、波形など）
- カスタマイズ可能な色と背景設定
- オーディオファイルの再生とリアルタイム視覚化
- 高品質な動画・画像エクスポート機能
- レスポンシブデザイン

## ビジュアライザータイプ

- **バー**: クラシックなオーディオスペクトラム表示
- **円形**: 中心から放射状に広がるスペクトラム
- **波形**: 周波数に応じて変化する曲線
- **音波**: オーディオの波形を表示
- **パーティクル**: 音に反応して動くパーティクル

## 使用方法

1. オーディオファイルをアップロードまたはドラッグ＆ドロップ
2. ビジュアライザータイプと設定をカスタマイズ
3. 背景や色の設定を調整
4. 「エクスポート」タブでビデオまたは画像として保存

## エクスポート機能

### 設定オプション

- **解像度**: HD(720p), Full HD(1080p), 4K
- **フレームレート**: 24fps, 30fps, 60fps
- **ビデオ品質**: 低, 中, 高（ビットレート設定）
- **出力時間**: 全体または秒数指定

### ビデオエクスポート

1. 「エクスポート」タブを選択
2. 希望の設定を選択
3. 「ビデオ書き出し」ボタンをクリック
4. プレビューを確認し、処理完了を待つ
5. 完了後、ファイルが自動的にダウンロードされます

### スクリーンショット

1. 「エクスポート」タブを選択
2. 「スクリーンショット」ボタンをクリック
3. 高解像度の画像がダウンロードされます

## デモ

[ライブデモを試す](https://aves-audio-spectrum.example.com)

![デモ画像](docs/demo.png)

## インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# ビルドのプレビュー
npm run preview
```

## デプロイ

このプロジェクトは[Render](https://render.com/)に静的サイトとしてデプロイするよう設定されています。
`render.yaml`ファイルにデプロイ設定が含まれています。

## 技術スタック

- Vue.js 3
- Pinia (状態管理)
- Web Audio API
- Canvas API
- WaveSurfer.js (波形表示)

## 将来の拡張機能

- 完全な動画エクスポート機能
- オーディオエフェクトの追加
- テンプレートとテーマの拡張
- ソーシャルシェア機能

## ブラウザの互換性

- Google Chrome (最新版推奨)
- Firefox
- Edge
- Safari 14以上

## 注意事項

- ビデオエクスポートは、ブラウザによってサポート状況が異なります
- 高解像度・高フレームレートの設定では処理に時間がかかる場合があります
- パフォーマンスはデバイスの性能に依存します

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
