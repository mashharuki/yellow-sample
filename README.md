# Yellow Protocol Quick Start

Yellow Protocol（ERC7824）の Nitrolite SDK を使ったクイックスタートプログラムです。

## 🚀 機能

このプログラムは以下の機能を実装しています：

1. **ClearNode への接続** - Yellow Protocol のメッセージブローカーに WebSocket 接続
2. **認証** - EIP-712 署名を使った安全な認証フロー
3. **チャネル情報取得** - アカウントに紐付くチャネルの一覧表示
4. **残高確認** - オフチェーン残高の確認

## 📋 前提条件

- [Bun](https://bun.sh) がインストールされていること
- [apps.yellow.com](https://apps.yellow.com) でチャネルを作成済みであること
- ウォレットの秘密鍵

## 🔧 セットアップ

### 1. 依存関係のインストール

```bash
bun install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成：

```bash
cp .env.example .env
```

`.env` ファイルを編集して、秘密鍵を設定：

```bash
# あなたのウォレットの秘密鍵（0x プレフィックスなし）
PRIVATE_KEY=your_private_key_here

# ClearNode WebSocket URL（本番環境）
CLEARNODE_URL=wss://clearnet.yellow.com/ws

# アプリケーション名（認証に使用）
APPLICATION_NAME=yellow-quickstart
```

⚠️ **重要**: `.env` ファイルは Git にコミットしないでください！秘密鍵が含まれています。

### 3. チャネルの作成

[apps.yellow.com](https://apps.yellow.com) にアクセスして、アカウントを作成し、チャネルを設定してください。

## ▶️ 実行

```bash
bun run dev
```

## 📊 実行例

正常に実行されると、以下のような出力が表示されます：

```
🚀 Yellow Protocol Quick Start

✅ Wallet initialized
📍 Address: 0x1234567890abcdef1234567890abcdef12345678
📡 Connecting to ClearNode: wss://clearnet.yellow.com/ws
✅ WebSocket connected

🔐 Starting authentication...
📤 Auth request sent
📨 Received: auth_challenge
🔑 Received auth challenge
📤 Auth verification sent
📨 Received: auth_verify
✅ Authentication successful!
🎟️  JWT token received (store this for reconnection)

📋 Fetching channels...
📨 Received: get_channels

📊 Channel Information:

  Channel 1:
    ID: 0xfedcba9876543210...
    Status: open
    Participant: 0x1234567890abcdef...
    Token: 0xeeee567890abcdef...
    Amount: 100000
    Chain ID: 137

💵 Fetching balances...
📨 Received: get_ledger_balances

💰 Balance Information:
  USDC: 1.0

✅ Quick start completed successfully!

🔌 Connection closed: 1000 Normal closure
```

## 📖 コードの説明

### 主要な機能

1. **ウォレット初期化**
   ```typescript
   const wallet = new ethers.Wallet(PRIVATE_KEY);
   ```

2. **メッセージ署名**
   ```typescript
   const messageSigner: MessageSigner = async (payload) => {
     const message = JSON.stringify(payload);
     const digestHex = ethers.id(message);
     const messageBytes = ethers.getBytes(digestHex);
     const { serialized: signature } = wallet.signingKey.sign(messageBytes);
     return signature;
   };
   ```

3. **認証フロー**
   ```typescript
   // 1. 認証リクエストを送信
   const authRequest = await createAuthRequestMessage({ ... });
   ws.send(authRequest);

   // 2. チャレンジに応答
   const authVerifyMsg = await createAuthVerifyMessage(messageSigner, message);
   ws.send(authVerifyMsg);
   ```

4. **データ取得**
   ```typescript
   // チャネル情報の取得
   const channelsMsg = await createGetChannelsMessage(messageSigner, wallet.address);
   ws.send(channelsMsg);

   // 残高の取得
   const balancesMsg = await createGetLedgerBalancesMessage(messageSigner, participant);
   ws.send(balancesMsg);
   ```

## 🔍 トラブルシューティング

### 認証エラー

- **症状**: `❌ Authentication failed` と表示される
- **解決策**:
  - 秘密鍵が正しいか確認
  - [apps.yellow.com](https://apps.yellow.com) でチャネルが作成されているか確認
  - ウォレットアドレスが正しいか確認

### 接続タイムアウト

- **症状**: `❌ Connection timeout` と表示される
- **解決策**:
  - インターネット接続を確認
  - ClearNode URL が正しいか確認（`wss://clearnet.yellow.com/ws`）
  - ファイアウォールで WebSocket 接続がブロックされていないか確認

### チャネルが見つからない

- **症状**: `No channels found` と表示される
- **解決策**:
  - [apps.yellow.com](https://apps.yellow.com) でチャネルを作成
  - 正しいウォレットアドレスでチャネルが作成されているか確認

## 🛠️ 次のステップ

1. **アプリケーションセッションの作成**
   - `createAppSessionMessage` を使用してセッションを作成
   - 参加者間でのトランザクションを実行

2. **フロントエンド統合**
   - React、Vue.js、Angular などのフレームワークと統合
   - `.claude/skills/yellow-protocol.skill` のサンプルコードを参照

3. **本番環境へのデプロイ**
   - 秘密鍵の安全な管理（環境変数、秘密管理サービス）
   - エラーハンドリングの強化
   - ログとモニタリングの追加

## 📚 リソース

- **公式ドキュメント**: [erc7824.org](https://erc7824.org)
- **チャネル管理**: [apps.yellow.com](https://apps.yellow.com)
- **NPM パッケージ**: [@erc7824/nitrolite](https://www.npmjs.com/package/@erc7824/nitrolite)
- **Yellow Protocol Skill**: `.claude/skills/yellow-protocol.skill`

## 🔒 セキュリティ

- **秘密鍵を絶対に公開しないでください**
- `.env` ファイルは Git にコミットしないでください
- 本番環境では、秘密鍵を環境変数や秘密管理サービスで管理してください
- テスト用には新しいウォレットを作成することをお勧めします

## 📝 ライセンス

このサンプルコードは自由に使用できます。

## 参考文献
- [雛形生成アプリ](https://github.com/Yellow-Scafolding/scaffolding/tree/main)