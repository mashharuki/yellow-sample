import {
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createCloseChannelMessage,
  createEIP712AuthMessageSigner,
} from "@erc7824/nitrolite";
import * as readline from "readline";
import { account, client, walletClient, ws } from "./config";
import { generateSessionAccount } from "./demo";

// Helper to prompt for input
const askQuestion = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
};

/**
 * メイン関数
 */
async function main() {
  console.log("Starting cleanup script...");

  // Generate temporary session key
  const { sessionPrivateKey, sessionSigner, sessionAccount } =
    generateSessionAccount();

  await new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve());
    ws.addEventListener("error", (err) => reject(err));
  });
  console.log("✓ Connected to WebSocket");

  // Authenticate
  const authParams = {
    session_key: sessionAccount.address,
    allowances: [{ asset: "ytest.usd", amount: "1000000000" }],
    expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
    scope: "test.app",
  };

  const authRequestMsg = await createAuthRequestMessage({
    address: account.address,
    application: "Test app",
    ...authParams,
  });
  ws.send(authRequestMsg);

  ws.addEventListener("message", async (data) => {
    const response = JSON.parse(data.toString());

    if (response.res) {
      const type = response.res[1];

      if (type === "auth_challenge") {
        const challenge = response.res[2].challenge_message;
        // Sign and verify
        const signer = createEIP712AuthMessageSigner(walletClient, authParams, {
          name: "Test app",
        });
        const verifyMsg = await createAuthVerifyMessageFromChallenge(
          signer,
          challenge,
        );
        ws.send(verifyMsg);
      }

      if (type === "auth_verify") {
        console.log("✓ Authenticated");

        // Fetch open channels from L1 Contract
        console.log("Fetching open channels from L1...");
        try {
          // オープンされているチャネルを全て取得する
          const openChannelsL1 = await client.getOpenChannels();
          console.log(`Found ${openChannelsL1.length} open channels on L1.`);

          if (openChannelsL1.length === 0) {
            console.log("No open channels on L1 to close.");
            ws.close();
            process.exit(0);
          }

          // Iterate and close
          for (const channelId of openChannelsL1) {
            console.log(`Attempting to close channel ${channelId}...`);

            // Send close request to Node
            const closeMsg = await createCloseChannelMessage(
              sessionSigner,
              channelId,
              account.address,
            );
            ws.send(closeMsg);

            // Small delay to avoid rate limits
            await new Promise((r) => setTimeout(r, 500));
          }
        } catch (e) {
          console.error("Error fetching L1 channels:", e);
          ws.close();
          process.exit(1);
        }
      }

      if (type === "close_channel") {
        const { channel_id, state, server_signature } = response.res[2];
        console.log(`✓ Node signed close for ${channel_id}`);

        const finalState = {
          intent: state.intent,
          version: BigInt(state.version),
          data: state.state_data,
          allocations: state.allocations.map((a: any) => ({
            destination: a.destination,
            token: a.token,
            amount: BigInt(a.amount),
          })),
          channelId: channel_id,
          serverSignature: server_signature,
        };

        try {
          console.log(`  Submitting close to L1 for ${channel_id}...`);
          const txHash = await client.closeChannel({
            finalState,
            stateData: finalState.data,
          });
          console.log(`✓ Closed on-chain: ${txHash}`);

          // Check if all channels are closed
          const remainingChannels = await client.getOpenChannels();
          if (remainingChannels.length === 0) {
            console.log("\n✓ All channels closed successfully!");
            ws.close();
            process.exit(0);
          }
        } catch (e: any) {
          // If it fails (e.g. already closed or race condition), just log and continue
          console.error(`Failed to close ${channel_id} on-chain:`, e.message);
        }
      }

      if (response.error) {
        console.error("WS Error:", response.error);
      }
    }
  });

  // Handle WebSocket close
  ws.addEventListener("close", () => {
    console.log("WebSocket connection closed");
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
