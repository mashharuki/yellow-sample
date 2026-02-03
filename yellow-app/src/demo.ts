import {
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createCloseChannelMessage,
  createCreateChannelMessage,
  createECDSAMessageSigner,
  createEIP712AuthMessageSigner,
  createGetConfigMessage,
  createGetLedgerBalancesMessage,
  createResizeChannelMessage,
} from "@erc7824/nitrolite";
import console from "node:console";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import {
  account,
  client,
  publicClient,
  walletClient,
  ws,
  type Config,
} from "./config";

const { PRIVATE_KEY } = process.env;

/**
 * 一時的なセッションキーをアカウントを作成する。
 */
export const generateSessionAccount = () => {
  // Generate temporary session key
  const sessionPrivateKey = generatePrivateKey();
  const sessionSigner = createECDSAMessageSigner(sessionPrivateKey);
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);

  return { sessionPrivateKey, sessionSigner, sessionAccount };
};

// Generate temporary session key
const { sessionPrivateKey, sessionSigner, sessionAccount } =
  generateSessionAccount();

// Get session address
const authParams = {
  session_key: sessionAccount.address, // Session key you generated
  allowances: [
    {
      // Add allowance for ytest.usd
      asset: "ytest.usd",
      amount: "1000000000", // Large amount
    },
  ],
  expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour in seconds
  scope: "test.app",
};

// Send auth request
const authRequestMsg = await createAuthRequestMessage({
  address: account.address,
  application: "Test app",
  ...authParams,
});

// create channel message
const createChannelMsg = await createCreateChannelMessage(
  sessionSigner, // Sign with session key
  {
    chain_id: 11155111, // Sepolia
    token: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // ytest.usd
  },
);

// State to prevent infinite auth loops
let isAuthenticated = false;
// We need to capture channelId to close it.
let activeChannelId: string | undefined;

// =============================================================
// ヘルパーメソッド
// =============================================================

/**
 * リサイズ(資金追加投入)のヘルパーメソッd
 * @param channelId
 * @param token
 * @param skipResize
 */
const triggerResize = async (
  channelId: string,
  token: string,
  skipResize: boolean = false,
) => {
  console.log("  Using existing channel:", channelId);

  // Add delay to ensure Node indexes the channel
  console.log("  Waiting 5s for Node to index channel...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // For withdrawal, we don't need to check user balance or allowance
  // because the Node (counterparty) is the one depositing funds.

  // For withdrawal, we don't deposit (we are withdrawing off-chain funds).
  // -------------------------------------------------------------------
  // 3. Fund Channel (Resize)
  // -------------------------------------------------------------------
  // We use 'allocate_amount' to move funds from the User's Unified Balance (off-chain)
  // into the Channel. This assumes the user has funds in their Unified Balance (e.g. from faucet).

  const amountToFund = 20n;
  if (!skipResize)
    console.log("\nRequesting resize to fund channel with 20 tokens...");

  if (!skipResize) {
    const resizeMsg = await createResizeChannelMessage(sessionSigner, {
      channel_id: channelId as `0x${string}`,
      // resize_amount: 10n, // <-- This requires L1 funds in Custody (which we don't have)
      allocate_amount: amountToFund, // <-- This pulls from Unified Balance (Faucet) (Variable name adjusted)
      funds_destination: account.address,
    });

    ws.send(resizeMsg);

    // Wait for resize confirmation
    console.log("  Waiting for resize confirmation...");

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Resize timeout")),
        30000,
      );
      const handler = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        if (msg.res && msg.res[1] === "resize_channel") {
          const payload = msg.res[2];
          if (payload.channel_id === channelId) {
            clearTimeout(timeout);
            ws.removeEventListener("message", handler);
            resolve();
          }
        }
      };
      ws.addEventListener("message", handler);
    });

    // Wait for balance update
    await new Promise((r) => setTimeout(r, 2000));
    console.log("✓ Resize complete.");
  } else {
    console.log("  Skipping resize step (already funded).");
  }

  /**
   * Verify Channel Balance
   * チャンネルはスマコン
   */
  const channelBalances = (await publicClient.readContract({
    address: client.addresses.custody,
    abi: [
      {
        name: "getChannelBalances",
        type: "function",
        stateMutability: "view",
        inputs: [
          { name: "channelId", type: "bytes32" },
          { name: "tokens", type: "address[]" },
        ],
        outputs: [{ name: "balances", type: "uint256[]" }],
      },
    ],
    functionName: "getChannelBalances",
    args: [channelId as `0x${string}`, [token as `0x${string}`]],
  })) as bigint[];

  console.log(`✓ Channel funded with ${channelBalances[0]} USDC`);

  // ユーザーの残高を確認する
  let finalUserBalance = 0n;
  try {
    const result = (await publicClient.readContract({
      address: client.addresses.custody,
      abi: [
        {
          type: "function",
          name: "getAccountsBalances",
          inputs: [
            { name: "users", type: "address[]" },
            { name: "tokens", type: "address[]" },
          ],
          outputs: [{ type: "uint256[]" }],
          stateMutability: "view",
        },
      ] as const,
      functionName: "getAccountsBalances",
      args: [[client.account.address], [token as `0x${string}`]],
    })) as bigint[];
    // リサイズ後のユーザー残高
    finalUserBalance = result[0];
    console.log(`✓ User Custody Balance after resize: ${finalUserBalance}`);
  } catch (e) {
    console.warn("    Error checking final user balance:", e);
  }

  // -------------------------------------------------------------------
  // 4. Close Channel
  // -------------------------------------------------------------------
  console.log("\n  Closing channel...");
  const closeMsg = await createCloseChannelMessage(
    sessionSigner,
    channelId as `0x${string}`,
    account.address,
  );
  ws.send(closeMsg);
  console.log("✓ Sent close channel request");
};

/**
 * 設定内容を取得するヘルパーメソッド
 * @returns
 */
async function fetchConfig(): Promise<Config> {
  const signer = createECDSAMessageSigner(PRIVATE_KEY! as `0x${string}`);
  const message = await createGetConfigMessage(signer);

  const ws = new WebSocket("wss://clearnet-sandbox.yellow.com/ws");

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      ws.send(message);
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data.toString());
        // Response format: [requestId, method, result, timestamp]
        // or NitroliteRPCMessage structure depending on implementation
        // Based on types: NitroliteRPCMessage { res: RPCData }
        // RPCData: [RequestID, RPCMethod, object, Timestamp?]

        if (response.res && response.res[2]) {
          resolve(response.res[2] as Config);
          ws.close();
        } else if (response.error) {
          reject(new Error(response.error.message || "Unknown RPC error"));
          ws.close();
        }
      } catch (err) {
        reject(err);
        ws.close();
      }
    };

    ws.onerror = (error) => {
      reject(error);
      ws.close();
    };
  });
}

const config = await fetchConfig();

// =============================================================
// WebSocket接続とメッセージ処理
// =============================================================

// WebSocket接続が開かれた時のハンドリング
ws.onopen = () => {
  const request = {
    req: [1, "get_config", {}, Date.now()],
    sig: [],
  };
  // 設定を取得するリクエストを送信
  ws.send(JSON.stringify(request));

  // Send auth request
  ws.send(authRequestMsg);
  console.log(
    "✓ Sent auth request from",
    account.address,
    "to",
    sessionAccount.address,
  );

  // Create channel
  ws.send(createChannelMsg);
  console.log("✓ Sent create channel request for ytest.usd on Sepolia");
};

// メッセージ受信時のハンドリング
ws.onmessage = async (event) => {
  // 受信データを解析
  const response = JSON.parse(event.data.toString());
  // console.log("Received WS message:", JSON.stringify(response, null, 2));

  if (response.error) {
    console.error("RPC Error:", response.error);
    process.exit(1);
  }

  // メッセージタイプを確認
  const messageType = response.res?.[1];
  console.log("Message type:", messageType);

  // Auth challengeを受信した場合の処理
  if (messageType === "auth_challenge") {
    const challenge = response.res[2].challenge_message;
    console.log("✓ Received auth challenge:", challenge);
    // Sign with MAIN wallet
    const signer = createEIP712AuthMessageSigner(walletClient, authParams, {
      name: "Test app",
    });
    const verifyMsg = await createAuthVerifyMessageFromChallenge(
      signer,
      challenge,
    );
    ws.send(verifyMsg);
  }

  if (messageType === "auth_verify") {
    console.log("✓ Authenticated successfully");
    isAuthenticated = true; // Mark as authenticated

    // セッションキーを取得する
    const sessionKey = response.res[2].session_key;
    console.log("  Session key:", sessionKey);
    console.log("  JWT token received");

    // Query Ledger Balances
    const ledgerMsg = await createGetLedgerBalancesMessage(
      sessionSigner,
      account.address,
      Date.now(),
    );
    ws.send(ledgerMsg);
    console.log("Sent get_ledger_balances request...");
  }

  if (messageType === "get_config") {
    console.log("Supported chains:", response.res[2].chains);
    console.log("Contract addresses:", response.res[2].contracts);
  }

  if (messageType === "channels") {
    const channels = response.res[2].channels;
    const openChannel = channels.find((c: any) => c.status === "open");

    // Derive token
    const chainId = sepolia.id;
    // サポート対象のアセットを探す
    const supportedAsset = (config.assets as any)?.find(
      (a: any) => a.chain_id === chainId,
    );
    // トークンを探す
    const token = supportedAsset
      ? supportedAsset.token
      : "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

    if (openChannel) {
      console.log("✓ Found existing open channel");

      // CORRECT: Check if channel is already funded
      const currentAmount = BigInt(openChannel.amount || 0); // Need to parse amount
      // Wait, standard RPC returns strings. Let's rely on openChannel structure.
      // openChannel object from logs: { ..., amount: "40", ... }

      if (BigInt(openChannel.amount) >= 20n) {
        console.log(
          `  Channel already funded with ${openChannel.amount} USDC.`,
        );
        console.log(
          '  Skipping resize to avoid "Insufficient Balance" errors.',
        );
        // Call triggerResize but indicate skipping actual resize
        await triggerResize(openChannel.channel_id, token, true);
      } else {
        await triggerResize(openChannel.channel_id, token, false);
      }
    } else {
      console.log("  No existing open channel found, creating new one...");
      console.log("  Using token:", token, "for chain:", chainId);

      // Request channel creation
      const createChannelMsg = await createCreateChannelMessage(sessionSigner, {
        chain_id: 11155111, // Sepolia
        token: token,
      });
      ws.send(createChannelMsg);
    }
  }

  if (messageType === "create_channel") {
    const { channel_id, channel, state, server_signature } = response.res[2];
    activeChannelId = channel_id;

    console.log("✓ Channel prepared:", channel_id);
    console.log("  State object:", JSON.stringify(state, null, 2));

    // Transform state object to match UnsignedState interface
    const unsignedInitialState = {
      intent: state.intent,
      version: BigInt(state.version),
      data: state.state_data, // Map state_data to data
      allocations: state.allocations.map((a: any) => ({
        destination: a.destination,
        token: a.token,
        amount: BigInt(a.amount),
      })),
    };

    // Submit to blockchain
    const createResult = await client.createChannel({
      channel,
      unsignedInitialState,
      serverSignature: server_signature,
    });

    // createChannel returns an object { txHash, ... } or just hash depending on version.
    // Based on logs: { channelId: ..., initialState: ..., txHash: ... }
    // We need to handle both or just the object.
    const txHash =
      typeof createResult === "string" ? createResult : createResult.txHash;

    console.log("✓ Channel created on-chain:", txHash);
    console.log("  Waiting for transaction confirmation...");
    // トランザクションが完了するまで待つ
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log("✓ Transaction confirmed");

    // Retrieve token from allocations

    const token = state.allocations[0].token;
    await triggerResize(channel_id, token, false);
  }

  if (messageType === "resize_channel") {
    const { channel_id, state, server_signature } = response.res[2];

    console.log("✓ Resize prepared");
    console.log(
      "  Server returned allocations:",
      JSON.stringify(state.allocations, null, 2),
    );

    // Construct the resize state object expected by the SDK
    const resizeState = {
      intent: state.intent,
      version: BigInt(state.version),
      data: state.state_data || state.data, // Handle potential naming differences
      allocations: state.allocations.map((a: any) => ({
        destination: a.destination,
        token: a.token,
        amount: BigInt(a.amount),
      })),
      channelId: channel_id,
      serverSignature: server_signature,
    };

    console.log(
      "DEBUG: resizeState:",
      JSON.stringify(
        resizeState,
        (key, value) => (typeof value === "bigint" ? value.toString() : value),
        2,
      ),
    );

    let proofStates: any[] = [];
    try {
      const onChainData = await client.getChannelData(
        channel_id as `0x${string}`,
      );
      console.log(
        "DEBUG: On-chain channel data:",
        JSON.stringify(
          onChainData,
          (key, value) =>
            typeof value === "bigint" ? value.toString() : value,
          2,
        ),
      );
      if (onChainData.lastValidState) {
        proofStates = [onChainData.lastValidState];
      }
    } catch (e) {
      console.log("DEBUG: Failed to fetch on-chain data:", e);
    }

    // Calculate total required for the token
    const token = resizeState.allocations[0].token;
    const requiredAmount = resizeState.allocations.reduce(
      (sum: bigint, a: any) => {
        if (a.token === token) return sum + BigInt(a.amount);
        return sum;
      },
      0n,
    );

    console.log(
      `  Waiting for channel funding (Required: ${requiredAmount})...`,
    );

    // Poll for User's Custody Balance (since User allocation is increasing)
    let userBalance = 0n;
    let retries = 0;
    const userAddress = client.account.address;

    console.log(`  Checking User Custody Balance for ${userAddress}... [v2]`);

    // Check initial balance first
    try {
      const result = (await publicClient.readContract({
        address: client.addresses.custody,
        abi: [
          {
            type: "function",
            name: "getAccountsBalances",
            inputs: [
              { name: "users", type: "address[]" },
              { name: "tokens", type: "address[]" },
            ],
            outputs: [{ type: "uint256[]" }],
            stateMutability: "view",
          },
        ] as const,
        functionName: "getAccountsBalances",
        args: [[userAddress], [token as `0x${string}`]],
      })) as bigint[];
      userBalance = result[0];
    } catch (e) {
      console.warn("    Error checking initial user balance:", e);
    }

    console.log("  Skipping L1 deposit (using off-chain faucet funds)...");

    if (true) {
      // Skip the wait loop as we just deposited
      // Define ABI fragment for getAccountsBalances
      const custodyAbiFragment = [
        {
          type: "function",
          name: "getAccountsBalances",
          inputs: [
            { name: "users", type: "address[]" },
            { name: "tokens", type: "address[]" },
          ],
          outputs: [{ type: "uint256[]" }],
          stateMutability: "view",
        },
      ] as const;

      while (retries < 30) {
        // Wait up to 60 seconds
        try {
          const result = (await publicClient.readContract({
            address: client.addresses.custody,
            abi: custodyAbiFragment,
            functionName: "getAccountsBalances",
            args: [[userAddress], [token as `0x${string}`]],
          })) as bigint[];

          userBalance = result[0];
        } catch (e) {
          console.warn("    Error checking user balance:", e);
        }

        if (userBalance >= requiredAmount) {
          console.log(`✓ User funded in Custody (Balance: ${userBalance})`);
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
        retries++;
        if (retries % 5 === 0)
          console.log(`    User Custody Balance: ${userBalance}, Waiting...`);
      }

      if (userBalance < requiredAmount) {
        console.error("Timeout waiting for User to fund Custody account");
        console.warn("Proceeding with resize despite low user balance...");
      }
    } else {
      console.log(`✓ User funded in Custody (Balance: ${userBalance})`);
    }

    console.log("  Submitting resize to chain...");
    // Submit to blockchain
    const { txHash } = await client.resizeChannel({
      resizeState,
      proofStates: proofStates,
    });

    console.log("✓ Channel resized on-chain:", txHash);
    console.log("✓ Channel funded with 20 USDC");

    // Skip Transfer for debugging
    console.log("  Skipping transfer to verify withdrawal amount...");
    console.log("  Debug: channel_id =", channel_id);

    // Wait for server to sync state
    await new Promise((r) => setTimeout(r, 3000));

    if (channel_id) {
      console.log("  Closing channel:", channel_id);
      // Close channel
      const closeMsg = await createCloseChannelMessage(
        sessionSigner,
        channel_id as `0x${string}`,
        account.address,
      );
      ws.send(closeMsg);
    } else {
      console.log("  No channel ID available to close.");
    }
  }

  if (messageType === "close_channel") {
    const { channel_id, state, server_signature } = response.res[2];
    console.log("✓ Close prepared");
    console.log("  Submitting close to chain...");

    // チャンネルをクローズするためにブロックチェーンに送信
    const txHash = await client.closeChannel({
      finalState: {
        intent: state.intent,
        version: BigInt(state.version),
        data: state.state_data || state.data,
        allocations: state.allocations.map((a: any) => ({
          destination: a.destination,
          token: a.token,
          amount: BigInt(a.amount),
        })),
        channelId: channel_id,
        serverSignature: server_signature,
      },
      stateData: state.state_data || state.data || "0x",
    });

    console.log("✓ Channel closed on-chain:", txHash);

    // Wait for transaction confirmation
    console.log("  Waiting for close transaction confirmation...");
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log("✓ Close transaction confirmed");

    // Withdraw funds
    console.log("  Withdrawing funds...");
    const token = state.allocations[0].token;

    // Wait longer for state to settle on-chain
    await new Promise((r) => setTimeout(r, 5000));

    let withdrawableBalance = 0n;

    try {
      // ユーザーの引き出し可能な残高を確認する
      const result = (await publicClient.readContract({
        address: client.addresses.custody,
        abi: [
          {
            type: "function",
            name: "getAccountsBalances",
            inputs: [
              { name: "users", type: "address[]" },
              { name: "tokens", type: "address[]" },
            ],
            outputs: [{ type: "uint256[]" }],
            stateMutability: "view",
          },
        ] as const,
        functionName: "getAccountsBalances",
        args: [[client.account.address], [token as `0x${string}`]],
      })) as bigint[];
      withdrawableBalance = result[0];
      console.log(
        `✓ User Custody Balance (Withdrawable): ${withdrawableBalance}`,
      );
    } catch (e) {
      console.warn("    Error checking withdrawable balance:", e);
    }

    if (withdrawableBalance > 0n) {
      console.log(
        `  Attempting to withdraw ${withdrawableBalance} of ${token}...`,
      );
      try {
        // トークンを引き出す
        // ガスリミットを明示的に設定してreentrancy sentryに十分なガスを確保
        const withdrawalTx = await client.withdrawal(
          token as `0x${string}`,
          withdrawableBalance,
          {
            gas: 500_000n, // ガスリミットを明示的に設定
          }
        );
        console.log("✓ Funds withdrawn successfully:", withdrawalTx);
      } catch (withdrawError: any) {
        console.warn("⚠ Withdrawal failed:", withdrawError.message);
        console.warn(
          "This may happen if the channel state hasn't fully settled on-chain yet.",
        );
        console.log(
          "\n✓ Channel operations completed successfully (create → resize → close)",
        );
        console.log(
          "  Note: Withdrawal can be performed manually later when the state settles.",
        );
      }
    } else {
      console.log("  No funds to withdraw.");
    }

    console.log("\n✓ Demo completed successfully!");
    process.exit(0);
  }
};

// エラーが発生した時のハンドリング
ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

// 接続が閉じられた時のハンドリング
ws.onclose = (event) => {
  console.log(`WebSocket closed: ${event.code} ${event.reason}`);
};

// Start the flow
if (ws.readyState === WebSocket.OPEN) {
  ws.send(authRequestMsg);
} else {
  ws.addEventListener("open", () => {
    ws.send(authRequestMsg);
  });
}
