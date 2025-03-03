# Aves Audio Spectrum

音声ファイルをリアルタイムでビジュアライズするウェブアプリケーション。

## 機能

- 様々なスタイルのオーディオビジュアライゼーション
  - バー型スペクトラム
  - 円形スペクトラム
  - 波形表示
  - パーティクル表示
- カラーカスタマイズ（単色、グラデーション、周波数ベース）
- バックグラウンド設定
- イコライザー機能
- スクリーンショット保存

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

## ライセンス

MIT
