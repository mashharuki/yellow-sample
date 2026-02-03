# Yellow Protocol Quick Start

Yellow Protocol（ERC7824）の Nitrolite SDK を使ったクイックスタートプログラムです。

## 🚀 機能

このプログラムは以下の機能を実装しています：

1. **ClearNode への接続** - Yellow Protocol のメッセージブローカーに WebSocket 接続
2. **認証** - EIP-712 署名を使った安全な認証フロー
3. **チャネル情報取得** - アカウントに紐付くチャネルの一覧表示
4. **残高確認** - オフチェーン残高の確認
5. **💸 ステートチャネル内送信** - Yellow Protocolの真骨頂！瞬時のオフチェーン送信（yellow-app/src/demo.ts）

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

## � ステートチャネル内での送金

Yellow Protocolの最大の特徴は、**オフチェーンで瞬時に送金できる**ことです！

### Application Sessionを使った送金

```typescript
import { createAppSessionMessage, parseRPCResponse } from '@erc7824/nitrolite';

// Step 1: Application Sessionを作成
const appDefinition = {
  protocol: 'payment-app-v1',
  participants: [yourAddress, recipientAddress],
  weights: [50, 50],
  quorum: 100,
  challenge: 0,
  nonce: Date.now()
};

const allocations = [
  { participant: yourAddress, asset: 'usdc', amount: '1000000' }, // 1 USDC
  { participant: recipientAddress, asset: 'usdc', amount: '0' }
];

const sessionMessage = await createAppSessionMessage(
  messageSigner,
  [{ definition: appDefinition, allocations }]
);
ws.send(sessionMessage);

// Step 2: ペイメントを送信（瞬時・ガス代なし！）
const paymentData = {
  type: 'payment',
  session_id: appSessionId,
  amount: '100000', // 0.1 USDC
  recipient: recipientAddress,
  sender: yourAddress,
  timestamp: Date.now()
};

const signature = await messageSigner(JSON.stringify(paymentData));
ws.send(JSON.stringify({ ...paymentData, signature }));
console.log('💸 Payment sent instantly!');
```

### メリット

- ⚡ **瞬時に完了**: ブロックチェーンの確認を待つ必要なし
- 💰 **ガス代ゼロ**: オフチェーンで処理されるため手数料不要
- 🔄 **無制限の送信**: セッション内で何度でも送金可能
- 🔒 **安全性**: 暗号署名により保護

## �🛠️ 次のステップ

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

## 動かした記録

### サンプルコード

```bash
bun run sample
```

```json
{
  res: [ 0, "assets", {
      assets: [
        {
          token: "0x45268ba6c9A0459Eda6F6fAb4E5083c61730F375",
          chain_id: 137,
          symbol: "beatwav",
          decimals: 6,
        }, {
          token: "0xDB33fEC4e2994a675133320867a6439Da4A5acD8",
          chain_id: 1,
          symbol: "beatwav",
          decimals: 18,
        }, {
          token: "0x0000000000000000000000000000000000000000",
          chain_id: 56,
          symbol: "bnb",
          decimals: 18,
        }, {
          token: "0x0000000000000000000000000000000000000000",
          chain_id: 8453,
          symbol: "eth",
          decimals: 18,
        }, {
          token: "0x0000000000000000000000000000000000000000",
          chain_id: 59144,
          symbol: "eth",
          decimals: 18,
        }, {
          token: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD",
          chain_id: 56,
          symbol: "link",
          decimals: 18,
        }, {
          token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          chain_id: 1,
          symbol: "usdc",
          decimals: 6,
        }, {
          token: "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6",
          chain_id: 14,
          symbol: "usdc",
          decimals: 6,
        }, {
          token: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
          chain_id: 56,
          symbol: "usdc",
          decimals: 18,
        }, {
          token: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
          chain_id: 137,
          symbol: "usdc",
          decimals: 6,
        }, {
          token: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
          chain_id: 480,
          symbol: "usdc",
          decimals: 6,
        }, {
          token: "0x3A15461d8AE0f0Fb5fA2629e9dA7D66A794a6E37",
          chain_id: 30,
          symbol: "usdc",
          decimals: 18,
        }, {
          token: "0x2aaBea2058b5aC2D339b163C6Ab6f2b6d53aabED",
          chain_id: 747,
          symbol: "usdc",
          decimals: 6,
        }, {
          token: "0x0b7007c13325c48911f73a2dad5fa5dcbf808adc",
          chain_id: 2020,
          symbol: "usdc",
          decimals: 6,
        }, {
          token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          chain_id: 8453,
          symbol: "usdc",
          decimals: 6,
        }, {
          token: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
          chain_id: 59144,
          symbol: "usdc",
          decimals: 6,
        }, {
          token: "0xa16148c6Ac9EDe0D82f0c52899e22a575284f131",
          chain_id: 1440000,
          symbol: "usdc",
          decimals: 6,
        }, {
          token: "0x55d398326f99059fF775485246999027B3197955",
          chain_id: 56,
          symbol: "usdt",
          decimals: 18,
        }, {
          token: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          chain_id: 8453,
          symbol: "usdt",
          decimals: 6,
        }, {
          token: "0xA219439258ca9da29E9Cc4cE5596924745e12B93",
          chain_id: 59144,
          symbol: "usdt",
          decimals: 6,
        }, {
          token: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
          chain_id: 56,
          symbol: "weth",
          decimals: 18,
        }, {
          token: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
          chain_id: 137,
          symbol: "weth",
          decimals: 18,
        }, {
          token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          chain_id: 1440000,
          symbol: "xrp",
          decimals: 18,
        }
      ],
    }, 1770089998926 ],
  sig: [ "0xbc3596c232c2b1f2da7740a4aa874f1c95f72745db665b7fb695f72a3113d7ae6b42647f4bbf43e708cd17abed6eac38a5017069677783636d1c50c61e64a18c1c"
  ],
}
```

### テスト用のトークンを取得するコマンド

```bash
curl -XPOST https://clearnet-sandbox.yellow.com/faucet/requestTokens \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072"}'
```

以下のようになればOK!

```json
{"success":true,"message":"Tokens sent successfully","txId":"14765","amount":"10000000","asset":"ytest.usd","destination":"0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072"}
```

### デモ用のコード

```bash
bun run demo
```

以下のようになればOK!

```bash
$ bun run ./src/demo.ts
✓ Wallet loaded: 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072
✓ Sent auth request from 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072 to 0x4d93aA3Dd2D21f47aD56597cf9703e8913734C6D
✓ Sent create channel request for ytest.usd on Sepolia
Message type: assets
Message type: auth_challenge
✓ Received auth challenge: f0aa2f3d-2756-4ce2-aacf-3d282adeccb9
Message type: get_config
Supported chains: undefined
Contract addresses: undefined
Message type: auth_challenge
✓ Received auth challenge: ef26370d-2b24-422a-8e4e-e75408d006f7
Message type: error
Message type: auth_verify
✓ Authenticated successfully
  Session key: 0x4d93aA3Dd2D21f47aD56597cf9703e8913734C6D
  JWT token received
Sent get_ledger_balances request...
Message type: channels
✓ Found existing open channel
  Channel already funded with 20 USDC.
  Skipping resize to avoid "Insufficient Balance" errors.
  Using existing channel: 0x36b12211fe9784e4894f4a371352816c96286888ecf7d75eb25294e5a4c515ff
  Waiting 5s for Node to index channel...
Message type: bu
Message type: auth_verify
✓ Authenticated successfully
  Session key: 0x4d93aA3Dd2D21f47aD56597cf9703e8913734C6D
  JWT token received
Sent get_ledger_balances request...
Message type: get_ledger_balances
Message type: get_ledger_balances
  Skipping resize step (already funded).
✓ Channel funded with 20 USDC
✓ User Custody Balance after resize: 32

  Closing channel...
✓ Sent close channel request
Message type: close_channel
✓ Close prepared
  Submitting close to chain...
✓ Channel closed on-chain: 0x231d840f3f217a05308737593315a5870411d1a3a3ed7c3274420cc0aaee98a6
  Waiting for close transaction confirmation...
Message type: bu
Message type: cu
✓ Close transaction confirmed
  Withdrawing funds...
✓ User Custody Balance (Withdrawable): 32
  Attempting to withdraw 32 of 0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb...
✓ Funds withdrawn successfully: 0xc51cccb3db6fb3356b6fdd6d1d2e6798c9c345dc48ff7b98ae3cb04325de95af

✓ Demo completed successfully!
```

[withdrawしたときのトランザクション](https://sepolia.etherscan.io/tx/0xc51cccb3db6fb3356b6fdd6d1d2e6798c9c345dc48ff7b98ae3cb04325de95af)

## トラブルシューティング

### "out of gas: not enough gas for reentrancy sentry" エラー

withdrawトランザクション実行時にこのエラーが発生する場合、ガスリミットが不足している可能性があります。

**解決方法:**

コード内で`client.withdrawal()`を呼び出す際に、明示的にガスリミットを設定してください：

```typescript
const withdrawalTx = await client.withdrawal(
  token as `0x${string}`,
  withdrawableBalance,
  {
    gas: 500_000n, // ガスリミットを明示的に設定
  }
);
```

このガスリミットは以下の要因に応じて調整が必要な場合があります：
- コントラクトの複雑さ
- reentrancy保護の実装
- ネットワークの混雑状況

**代替方法:**

もし上記の方法で解決しない場合は、walletClientを使って直接トランザクションを送信することもできます：

```typescript
const hash = await walletClient.writeContract({
  address: client.addresses.custody,
  abi: custodyAbi,
  functionName: 'withdrawDeposit',
  args: [token, withdrawableBalance],
  gas: 500_000n,
});
```

### Application Session作成時のエラー

Application Sessionの作成時に`Message type: error`が表示される場合：

**よくある原因:**

1. **パラメータの解析エラー (`"failed to parse parameters"`)**
   - **最も可能性が高い**: `asset`フィールドにトークンシンボル文字列（例: `"usdc"`）ではなく、**実際のトークンアドレス**を使用する必要があります
   ```typescript
   // ❌ 間違い
   asset: "usdc"
   
   // ✅ 正しい
   asset: "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb" // 実際のトークンアドレス
   ```
   - チャネルで使用しているトークンアドレスを取得して使用してください

2. **Asset（資産）がサポートされていない**
   - Sepolia testnetで使用可能なトークンアドレスを確認
   - `get_config`メソッドでサポートされているアセットを確認

3. **参加者の残高不足**
   - 両方の参加者がチャネル内に十分な残高を持っている必要があります
   - `get_ledger_balances`で残高を確認

4. **無効な参加者アドレス**
   - 参加者のアドレスが正しいフォーマットか確認
   - 実際に資金を持っているアドレスを使用

**デバッグ方法:**

```bash
# 詳細なエラー情報を確認
bun run demo

# エラーメッセージの"Error details"セクションを確認
# 特に"message"フィールドに具体的な原因が記載されています
```

**解決策:**

```typescript
// より詳細なログを有効にする
console.log("Debug: Message sent:", JSON.stringify({
  participants: appDefinition.participants,
  allocations: allocations
}, null, 2));
```

## 参考文献
- [雛形生成アプリ(バグあり)](https://github.com/Yellow-Scafolding/scaffolding/tree/main)
- [Yellow Getting Started](https://docs.yellow.org/docs/learn/getting-started/prerequisites)

## 💸 Yellow Protocolの真の力：ステートチャネル内送信

### Yellow Protocolの最大の強み

Yellow Protocolは**ステートチャネル技術**を使用して、以下を実現します：

- ⚡ **瞬時の送信** - ブロックチェーンの承認待ちなし
- 💰 **ガス代ゼロ** - オフチェーンでの状態更新
- 🔒 **高セキュリティ** - 暗号署名による保証
- 🚀 **無制限のスループット** - L1の制約を受けない

### ⚠️ 実装に関する重要な注意

現在のYellow Protocol（Nitrolite SDK v0.5.3）では、**ステートチャネル内での直接的な資金送信を実装するには、Application Sessionの利用が推奨されています**。

### 実装方法

#### オプション1: Application Session（推奨）

`src/index.ts`の`createApplicationSession`関数を参照してください。Application Sessionを使用すると、カスタムロジックを実装できます。

```typescript
// Application Sessionの作成
const appSessionId = await createApplicationSession(
  ws,
  participantB as `0x${string}`,
  'usdc',
  '1000000'
);

// Application Session内での状態更新（支払い処理）
// 詳細は公式ドキュメントを参照
```

#### オプション2: チャネルクローズ時のアロケーション再配分

最もシンプルな方法は、チャネルをクローズする際に最終的な資金配分を指定することです：

```typescript
const closeMsg = await createCloseChannelMessage(
  sessionSigner,
  channelId as `0x${string}`,
  account.address,
  // 最終アロケーションをここで指定
);
```

### 仕組み

1. **チャネル作成（L1）** - 最初に一度だけブロックチェーンにデプロイ
2. **オフチェーン送信** - Application Session内で状態を更新
   - ClearNodeを通じて署名付きメッセージを交換
   - ガス代なし、承認待ちなし
   - 両者の署名で状態を更新
3. **チャネルクローズ（L1）** - 最終状態をブロックチェーンに記録

### なぜ速いのか？

- **L1トランザクション**: ブロック承認待ち（数秒〜数分）、ガス代あり
- **ステートチャネル**: WebSocket通信（ミリ秒）、ガス代なし

### ユースケース

- 💱 高頻度トレーディング
- 🎮 ゲーム内マイクロペイメント
- 💬 メッセージング報酬
- 🛒 少額決済が多いEコマース
- ⚡ リアルタイム送金アプリ

### 詳細情報

Yellow Protocolの最新のAPI仕様については、公式ドキュメントをご確認ください：
- [Yellow Protocol Docs](https://docs.yellow.org)
- [ERC7824 Specification](https://eips.ethereum.org/EIPS/eip-7824)
- [Quickstart](https://docs.yellow.org/docs/build/quick-start/)