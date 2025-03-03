#!/bin/bash
echo "Aves Audio Spectrum ビルドスクリプト"
echo "====================================="

# terserをインストールする
echo "1. 必要な依存関係をインストールしています..."
npm install terser --save-dev

# その他の依存関係を更新
echo "2. 依存関係を更新しています..."
npm install

# プロジェクトをビルド
echo "3. プロジェクトをビルドしています..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ ビルドが完了しました！"
  echo "dist/ ディレクトリにビルド結果が格納されています。"
else
  echo "❌ ビルドに失敗しました。エラーを確認してください。"
  exit 1
fi

echo ""
echo "プレビューを開始するには次のコマンドを実行してください:"
echo "npm run preview"
