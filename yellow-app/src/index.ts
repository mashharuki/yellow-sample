import { account, publicClient } from "./config";

/**
 * メイン関数
 */
async function main() {
  // Check connection
  const blockNumber = await publicClient.getBlockNumber();
  console.log("✓ Connected to Sepolia, block:", blockNumber);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("✓ ETH balance:", balance.toString(), "wei");

  console.log("\n🎉 Environment setup complete!");
}

main().catch(console.error);
