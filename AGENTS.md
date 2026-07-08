# 将棋AI Web分析システム エージェント開発ガイド

本ドキュメントは、ブラウザ単体（サーバーレス）で動作するPC・スマホ対応の将棋AI分析Webアプリケーションの開発において、AIエージェントおよび開発者が遵守すべきアーキテクチャ方針、実装ルール、UXガイドラインを定義します。

## 1. システム概要 & アーキテクチャ

* **ホスティング環境:** GitHub Pages (Service Worker により COOP/COEP を擬似付与)
* **配信形態:** Webサイト 兼 PWA (Progressive Web App)
* **コアアーキテクチャ:** クライアント完結型 (メインスレッド + Web Worker)
* **Language:** TypeScript 5.x (Strict mode 推奨)
* **Build Tool:** Vite (TypeScript + React の高速開発環境)
