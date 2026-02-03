# Yellow Network - Nitrolite SDK Demo

このプロジェクトは、Yellow NetworkのNitrolite SDKを使用したステートチャネルの操作デモです。

## セットアップ

### 必要なもの
- Bun（パッケージマネージャー）
- Sepoliaテストネット用のウォレット秘密鍵
- Alchemy RPC URL（オプション）

### 環境変数の設定

`.env`ファイルをプロジェクトルートに作成し、以下を設定してください：

```env
PRIVATE_KEY=0x...
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY  # オプション
```

### 依存関係のインストール

```bash
bun install
```

## スクリプト

### 1. デモスクリプト (`demo.ts`)

チャンネルの完全なライフサイクルをデモします：
- チャンネル作成
- 資金投入（リサイズ）
- チャンネルクローズ
- 資金引き出し

```bash
bun run demo
```

**実行フロー：**
1. WebSocket接続を確立
2. 認証（セッションキー生成）
3. 既存チャンネルの確認
   - 存在する場合：そのチャンネルを使用
   - 存在しない場合：新規作成
4. チャンネルに資金を投入（20 USDC）
5. チャンネルをクローズ
6. 資金を引き出し

### 2. クリーンアップスクリプト (`cleanup.ts`)

L1上の全てのオープンチャンネルを一括でクローズします。

```bash
bun run cleanup
```

**用途：**
- テストで残ったチャンネルの整理
- 開発環境のリセット
- エラーでクローズできなかったチャンネルの処理

**実行フロー：**
1. L1コントラクトから全てのオープンチャンネルを取得
2. 各チャンネルに対してクローズリクエストを送信
3. Nodeからの署名を受け取りL1でクローズ処理を実行

### 3. フォーマット

コードをフォーマットします：

```bash
bun run format
```

## トラブルシューティング

### エラー: "Insufficient Balance"
- Yellow Faucetでテストトークンを取得してください
- 既存のチャンネルが資金で満たされている可能性があります

### エラー: "Contract call simulation failed for function 'prepareWithdraw'"
- チャンネルクローズ直後は引き出しが失敗することがあります
- ブロックチェーンの状態が完全に同期されるまで待つ必要があります
- 後で手動で引き出し処理を実行できます

### WebSocket接続エラー
- インターネット接続を確認してください
- `wss://clearnet-sandbox.yellow.com/ws`が利用可能か確認してください

## プロジェクト構造

```
yellow-app/
├── src/
│   ├── config.ts       # 共通設定（クライアント、WebSocket）
│   ├── demo.ts         # フルデモスクリプト
│   ├── cleanup.ts      # クリーンアップユーティリティ
│   └── index.ts        # エントリポイント
├── package.json
├── tsconfig.json
└── README.md
```

## 参考リンク

- [Yellow Network Documentation](https://docs.yellow.com)
- [Nitrolite SDK GitHub](https://github.com/erc7824/nitrolite)
- [Sepolia Testnet Faucet](https://sepoliafaucet.com/)
- [Yellow Testnet Faucet](https://faucet.yellow.com/)

## ライセンス

MIT

