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
✓ Sent auth request from 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072 to 0xec068B1Ae32Ab956842cE6B34BAb5009196c06c9
✓ Sent create channel request for ytest.usd on Sepolia
Message type: assets
Message type: auth_challenge
✓ Received auth challenge: c0a1c468-45bb-466c-9f8b-25598b640cac
Message type: get_config
Supported chains: undefined
Contract addresses: undefined
Message type: auth_challenge
✓ Received auth challenge: 42bc5595-349f-446d-b855-57ce7ab87ca6
Message type: error
Message type: auth_verify
✓ Authenticated successfully
  Session key: 0xec068B1Ae32Ab956842cE6B34BAb5009196c06c9
  JWT token received
Sent get_ledger_balances request...
Message type: channels
  No existing open channel found, creating new one...
  Using token: 0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb for chain: 11155111
Message type: bu
Message type: auth_verify
✓ Authenticated successfully
  Session key: 0xec068B1Ae32Ab956842cE6B34BAb5009196c06c9
  JWT token received
Sent get_ledger_balances request...
Message type: get_ledger_balances
Message type: create_channel
✓ Channel prepared: 0x36b12211fe9784e4894f4a371352816c96286888ecf7d75eb25294e5a4c515ff
  State object: {
  "intent": 1,
  "version": 0,
  "state_data": "0x",
  "allocations": [
    {
      "destination": "0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072",
      "token": "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb",
      "amount": "0"
    },
    {
      "destination": "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC",
      "token": "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb",
      "amount": "0"
    }
  ]
}
Message type: get_ledger_balances
✓ Channel created on-chain: 0x2b09a64a322398b1b597c635e414b23f61e13f323c13de1dffc9593e17da1cea
  Waiting for transaction confirmation...
Message type: cu
Message type: bu
✓ Transaction confirmed
  Using existing channel: 0x36b12211fe9784e4894f4a371352816c96286888ecf7d75eb25294e5a4c515ff
  Waiting 5s for Node to index channel...

Requesting resize to fund channel with 20 tokens...
  Waiting for resize confirmation...
Message type: resize_channel
✓ Resize prepared
  Server returned allocations: [
  {
    "destination": "0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072",
    "token": "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb",
    "amount": "20"
  },
  {
    "destination": "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC",
    "token": "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb",
    "amount": "0"
  }
]
DEBUG: resizeState: {
  "intent": 2,
  "version": "1",
  "data": "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014",
  "allocations": [
    {
      "destination": "0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072",
      "token": "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb",
      "amount": "20"
    },
    {
      "destination": "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC",
      "token": "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb",
      "amount": "0"
    }
  ],
  "channelId": "0x36b12211fe9784e4894f4a371352816c96286888ecf7d75eb25294e5a4c515ff",
  "serverSignature": "0x026675ce5e93feaabc83d6ab710b0d75b672f6d9ce5aef398f92d52b3ec3d3fa73d52d932a91f5b4f36917729694882b51f0c7a6d645aa8bd648bd6bfd5fdd971b"
}
DEBUG: On-chain channel data: {
  "channel": {
    "participants": [
      "0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072",
      "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC"
    ],
    "adjudicator": "0x7c7ccbc98469190849BCC6c926307794fDfB11F2",
    "challenge": "3600",
    "nonce": "1770119739560"
  },
  "status": 2,
  "wallets": [
    "0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072",
    "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC"
  ],
  "challengeExpiry": "0",
  "lastValidState": {
    "intent": 1,
    "version": "0",
    "data": "0x",
    "allocations": [
      {
        "destination": "0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072",
        "token": "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb",
        "amount": "0"
      },
      {
        "destination": "0xc7E6827ad9DA2c89188fAEd836F9285E6bFdCCCC",
        "token": "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb",
        "amount": "0"
      }
    ],
    "sigs": [
      "0x39f5012392a33cf4861a96f934200d43e906985f97a9a4d37e2023cbdf89d39d4a789717e4c5d24ec552ad79538f3b3c16a1b9377bc0737576098f86ee7ec0381b",
      "0xffa168f7803bfcc4ac56c6fc8bd77833f146dabdf0ef8493a13749adf84f17e46841cc01a1de6bccc863abe6df69df00dede9973e46c4d27aa75497be533fe021c"
    ]
  }
}
  Waiting for channel funding (Required: 20)...
  Checking User Custody Balance for 0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072... [v2]
  Skipping L1 deposit (using off-chain faucet funds)...
✓ User funded in Custody (Balance: 32)
  Submitting resize to chain...
✓ Channel resized on-chain: 0x085e04365026553af642f743bce3ff4a4fb350976167f26a371fb2d7b0087c5a
✓ Channel funded with 20 USDC
  Skipping transfer to verify withdrawal amount...
  Debug: channel_id = 0x36b12211fe9784e4894f4a371352816c96286888ecf7d75eb25294e5a4c515ff
✓ Resize complete.
✓ Channel funded with 0 USDC
✓ User Custody Balance after resize: 32

  Closing channel...
✓ Sent close channel request
Message type: close_channel
✓ Close prepared
  Submitting close to chain...
✓ Channel closed on-chain: 0x75e59dbc841def60fb9ce69b541994bac4f8dfcb79f1e295b73e1f95bbc1c49e
  Waiting for close transaction confirmation...
  Closing channel: 0x36b12211fe9784e4894f4a371352816c96286888ecf7d75eb25294e5a4c515ff
Message type: close_channel
✓ Close prepared
  Submitting close to chain...
✓ Channel closed on-chain: 0x5289e2e0f466344154dcda14971521a0b099e8f1ef12d0aca61099bd12535eb0
  Waiting for close transaction confirmation...
Message type: bu
Message type: cu
✓ Close transaction confirmed
  Withdrawing funds...
✓ Close transaction confirmed
  Withdrawing funds...
✓ User Custody Balance (Withdrawable): 32
  Attempting to withdraw 32 of 0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb...
✓ User Custody Balance (Withdrawable): 32
  Attempting to withdraw 32 of 0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb...
⚠ Withdrawal failed: Contract call simulation failed for function 'Failed to execute withdrawDeposit on contract'
This may happen if the channel state hasn't fully settled on-chain yet.

✓ Channel operations completed successfully (create → resize → close)
  Note: Withdrawal can be performed manually later when the state settles.

✓ Demo completed successfully!
```

## 参考文献
- [雛形生成アプリ(バグあり)](https://github.com/Yellow-Scafolding/scaffolding/tree/main)
- [Yellow Getting Started](https://docs.yellow.org/docs/learn/getting-started/prerequisites)