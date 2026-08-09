#!/bin/bash
# ============================================================
# ローカル開発機用 即時インストールスクリプト
# 使い方: npm run install:local
# 外部ユーザー向けリリースとは独立して動作します
# ============================================================

set -e

ARCH=$(uname -m)
APP_NAME="SportsVideoAnalysis.app"
INSTALL_DIR="/Applications"

# アーキテクチャに応じてビルド対象と出力先を決定
if [ "$ARCH" = "arm64" ]; then
  BUILDER_ARCH="--arm64"
  SRC="release_output/mac-arm64/$APP_NAME"
else
  BUILDER_ARCH="--x64"
  SRC="release_output/mac/$APP_NAME"
fi

echo "🔨 最新コードをビルド中... ($ARCH)"
npm run build

echo "📦 アプリをパッケージ中（$ARCH のみ、publish なし）..."
npx electron-builder --mac $BUILDER_ARCH --publish never

if [ ! -d "$SRC" ]; then
  echo "❌ ビルド出力が見つかりません: $SRC"
  exit 1
fi

echo "🚀 /Applications にインストール中..."
# 実行中のアプリを終了
osascript -e 'quit app "SportsVideoAnalysis"' 2>/dev/null || true
sleep 1

# 古いアプリを完全削除（アイコン二重表示防止）
if [ -d "$INSTALL_DIR/$APP_NAME" ]; then
  rm -rf "$INSTALL_DIR/$APP_NAME"
fi

# ditto でコピー（シンボリックリンク・Macの属性を正しく保持）
ditto "$SRC" "$INSTALL_DIR/$APP_NAME"

# 検疫フラグを除去（「壊れています」回避）
xattr -cr "$INSTALL_DIR/$APP_NAME"

# ✅ release_output内のアプリを削除
# （残しておくとmacOSが検出してアイコンが2つ表示されるため）
rm -rf "release_output/mac-arm64/$APP_NAME" 2>/dev/null || true
rm -rf "release_output/mac/$APP_NAME" 2>/dev/null || true

echo ""
echo "✅ インストール完了！バージョン: $(cat package.json | grep '\"version\"' | head -1 | awk -F'"' '{print $4}')"
echo "   /Applications/$APP_NAME を起動してください"
