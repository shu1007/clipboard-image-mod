# Clipboard Image Editor

クリップボードの画像を手軽に編集できるElectronアプリケーションです。

## 機能

### 基本機能
- **クリップボードから画像読み込み**: ワンクリックでクリップボードの画像を読み込み
- **クリップボードに保存**: 編集した画像をクリップボードに保存
- **画像のリサイズ**: 幅・高さを指定して画像サイズを変更
- **画像の回転**: 左右90度回転
- **画像のトリミング**: 選択範囲をトリミング

### 描画・注釈機能
- **テキスト追加**: クリックした位置にテキストを追加
- **図形描画**: 矩形、円、線の描画
- **色の選択**: 7色のカラーパレット（赤、青、黄色、緑、オレンジ、紫、黒）
- **テキスト・図形の編集**: 追加後の移動、リサイズ、削除が可能

### 表示機能
- **ズーム機能**: 拡大・縮小表示
- **画面フィット**: 画面サイズに合わせて表示
- **実際のサイズ**: 100%表示

## インストール・実行

### 必要な環境
- Node.js
- npm

### セットアップ
```bash
# 依存関係のインストール
npm install

# アプリケーションの起動
npm start
```

### ビルド
```bash
# 現在のプラットフォーム用にビルド
npm run build

# Mac用ビルド（DMG + ZIP）
npm run build:mac

# Windows用ビルド（NSIS インストーラー + ZIP）
npm run build:win

# Mac・Windows両方ビルド
npm run build:all
# または
npm run dist

# ビルド結果は dist/ フォルダに出力されます
```

### ビルド出力
- **Mac**: 
  - `Clipboard Image Editor-1.0.0.dmg` (インストーラー)
  - `Clipboard Image Editor-1.0.0-mac.zip` (圧縮版)
- **Windows**: 
  - `Clipboard Image Editor Setup 1.0.0.exe` (インストーラー)
  - `Clipboard Image Editor-1.0.0-win.zip` (圧縮版)

## 使い方

1. **画像の読み込み**
   - 画像をクリップボードにコピー（スクリーンショットなど）
   - 「クリップボードから読み込み」ボタンをクリック

2. **テキストの追加**
   - 「テキスト」モードを選択
   - 画像上の任意の場所をクリックしてテキストを入力
   - ダブルクリックで既存のテキストを編集

3. **図形の描画**
   - 「矩形」「円」「線」モードを選択
   - ドラッグして図形を描画

4. **オブジェクトの編集**
   - 「選択」モードでオブジェクトをクリック
   - ドラッグで移動、角をドラッグでリサイズ
   - 削除、前面・背面への移動も可能

5. **色の変更**
   - テキスト設定・図形設定でカラーパレットから色を選択
   - デフォルトは赤色

6. **保存**
   - 「クリップボードに保存」で編集した画像をクリップボードに保存

## 操作パネル

各設定は折りたたみ可能です：

- **表示倍率** (デフォルト: 開)
- **描画モード** (デフォルト: 開)
- **テキスト設定** (デフォルト: 開)
- **図形設定** (デフォルト: 閉)
- **選択したオブジェクト** (デフォルト: 閉)
- **リサイズ** (デフォルト: 閉)
- **回転** (デフォルト: 閉)
- **トリミング** (デフォルト: 閉)
- **その他** (デフォルト: 閉)

## 技術仕様

- **フレームワーク**: Electron
- **言語**: JavaScript, HTML, CSS
- **描画**: HTML5 Canvas
- **パッケージマネージャー**: npm

## ファイル構成

```
clipboard-image-mod/
├── main.js          # Electronメインプロセス
├── preload.js       # セキュリティブリッジ
├── index.html       # UI
├── style.css        # スタイル
├── renderer.js      # アプリケーションロジック
├── package.json     # プロジェクト設定
└── README.md        # このファイル
```

## ライセンス

ISC