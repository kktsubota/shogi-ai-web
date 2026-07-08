# 将棋AI Web分析システム エージェント開発ガイド

本ドキュメントは、ブラウザ単体（サーバーレス）で動作するPC・スマホ対応の将棋AI分析Webアプリケーションの開発において、AIエージェントおよび開発者が遵守すべきアーキテクチャ方針、実装ルール、UXガイドラインを定義します。

---

## 1. システム概要 & アーキテクチャ

* **ホスティング環境:** GitHub Pages (Service Worker により COOP/COEP を擬似付与)
* **配信形態:** Webサイト 兼 PWA (Progressive Web App)
* **コアアーキテクチャ:** クライアント完結型 (メインスレッド + Web Worker)

```
[ UI Layer (React / Tailwind CSS) ]
│  ▲
│  │ レスポンシブUI / タッチ＆クリック操作 / 評価値グラフ / インポートModal
▼  │
[ tsshogi (局面管理 / 法手生成 / SFEN・KIF・CSAパース) ]
│  ▲
│  │ postMessage / USIテキストコマンド
▼  │
[ Web Worker (YaneuraOu WASM + AobaNNUE) ]
```

---

## 2. 主要技術スタック
* **Language:** TypeScript 5.x (Strict mode 推奨)
* **Build Tool:** Vite
* **UI Framework:** React (または Vue / Svelte) + Tailwind CSS
* **Shogi Core Logic:** `tsshogi` (局面管理、SFEN/KIF/CSAパース、指し手・合法手生成)
* **Shogi AI Engine:** `YaneuraOu.wasm` (Emscripten / WASM SIMD対応)
* **Evaluation Function:** `AobaNNUE` (v1.1)
* **Storage:** IndexedDB (WASMバイナリおよび評価関数モデルのローカルキャッシュ), `localStorage` (ユーザー設定・将棋クエストID保持)
* **HTTP/Header Utility:** `coi-serviceworker` (GitHub Pages 上での SharedArrayBuffer 有効化)

---

## 3. 重要制約 & 実装ルール

### A. クロスデバイス対応 & リソース自動最適化
デバイス環境（PC / スマホ）およびブラウザ制限に応じて、初期設定パラメータを動的に分岐・制御すること。

| 設定項目 | PC (Desktop) | スマホ (Mobile / Tablet) |
| :--- | :--- | :--- |
| **`USI_Hash`** | `128MB` 〜 `256MB` | **`16MB` 〜 `32MB`** (iOS Safari クラッシュ対策) |
| **`Threads`** | CPUコア数 - 1 | **`1` または `2`** (発熱・バッテリー消費対策) |
| **思考上限** | 無制限 / 深さ指定 | **ノード数指定 (`go nodes ...`) または自動ストップ** |

### B. COOP / COEP ヘッダーとマルチスレッド
* GitHub Pages はレスポンスヘッダーの独自設定が不可のため、`coi-serviceworker` を組み込んで `SharedArrayBuffer`（マルチスレッド動作）を有効化すること。
* 何らかの理由で `crossOriginIsolated` が `false` の場合は、強制的に `Threads=1`（シングルスレッド）で動作するフォールバック処理を入れること。

### C. バックグラウンド処理・メモリ管理
* **Page Visibility API:** 画面が非表示（タブ切替やバックグラウンド移行）になった場合、自動的に `stop` コマンドを送出し、CPU負荷とバッテリー消費を防止すること。
* **ローカルキャッシュ:** 評価関数（数十MB）は初回Fetch時に IndexedDB へキャッシュし、2回目以降の通信量を削減すること。

---

## 4. インポート & UI/UX ガイドライン

### A. 棋譜インポート UX
ユーザーが他アプリ（将棋ウォーズ、将棋クエスト等）からスムーズに棋譜を持ち込めるよう、以下のインターフェースを提供すること。

* **ワンタップ貼り付け (Async Clipboard API):**
  * `navigator.clipboard.readText()` を使用し、クリップボード内の棋譜テキスト/URLをワンタップで自動取得・パースするボタンを配置する。
* **将棋クエスト (c-loft) 連携:**
  * ユーザーが設定した「将棋クエスト ユーザー名」を `localStorage` に保持する。
  * `https://c-loft.com/shogi/quest/` 経由で直近対局リスト（対戦相手・日時・勝敗・手数）を自動取得し、選択一覧を表示する。
* **ドラッグ＆ドロップ / ファイル選択:**
  * `.kif`, `.csa`, `.sfen`, `.txt` ファイルのドラッグ＆ドロップおよびファイルダイアログ選択に対応する。
* **`tsshogi` プレビュー:**
  * インポート完了時、解析開始前に `tsshogi` から取得した初手〜数手の指し手プレビュー（および局面表示）を行い、正しく読み込まれたか確認できるUIにする。

### B. レスポンシブ設計
* **PC (横画面):** 3カラム構成（左: 評価値グラフ / 中央: 盤面 / 右: 候補手・棋譜リスト）。
* **スマホ (縦画面):** 上部「盤面」 / 下部「タブ切替（解析・グラフ・棋譜・設定）」の構成。タッチ操作ミス防止のため、タップ判定エリアを十分に確保すること。

### C. 初期ロード UX
* 評価関数のダウンロード時は、プログレスバー（`0%` 〜 `100%`）で進行状況を明示すること。
* モバイル環境向けに、低容量な「軽量モデル（Small Model）」を選択できるダイアログを用意すること。

---

## 5. コーディング & ライセンス原則

1. **USIプロトコル準拠:** Web Worker との通信は標準的な USI コマンド（`isready`, `position`, `go`, `stop`）を厳密に使用すること。
2. **ライセンス遵守 (GPL v3):**
   * やねうら王および AobaNNUE をクライアント側で実行可能形式（WASM）として配布するため、本リポジトリ全体を **GPL v3** ライセンス下で管理し、GitHub 上で公開状態を維持すること。

---

## 6. 環境構築・実行に関する注意点

* **Node.js (nvm) パスの読み込み問題:**
  * 非インタラクティブなシェル（AIエージェントのコマンド実行環境やCI/CDなど）では、ユーザーの `.bashrc` 等に書かれた nvm のパス設定がロードされず、`node` や `npm` が `command not found` になることがあります。
  * その場合、コマンドの実行前に明示的に nvm の初期化スクリプトをロードする必要があります。
  * 例: `. /home/ktsubota22/.nvm/nvm.sh && npm run dev`

