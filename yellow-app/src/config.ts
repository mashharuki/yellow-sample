import {
  NitroliteClient,
  WalletStateSigner,
  type RPCAsset,
  type RPCNetworkInfo,
} from "@erc7824/nitrolite";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const { PRIVATE_KEY, SEPOLIA_RPC_URL } = process.env;

export interface Config {
  assets?: RPCAsset[];
  networks?: RPCNetworkInfo[];
  [key: string]: any;
}

// Verify environment variables
const privateKey = PRIVATE_KEY;
if (!privateKey) {
  throw new Error("PRIVATE_KEY not set in .env");
}

// Create account from private key
export const account = privateKeyToAccount(privateKey as `0x${string}`);
console.log("✓ Wallet loaded:", account.address);

// Create public client
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC_URL),
});

// create wallet client
export const walletClient = createWalletClient({
  chain: sepolia,
  transport: http(),
  account,
});

// Initialize Nitrolite Client
export const client = new NitroliteClient({
  publicClient,
  walletClient,
  stateSigner: new WalletStateSigner(walletClient),
  addresses: {
    custody: "0x019B65A265EB3363822f2752141b3dF16131b262",
    adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2",
  },
  chainId: sepolia.id,
  challengeDuration: 3600n,
});

// Connect to Sandbox Node
export const ws = new WebSocket("wss://clearnet-sandbox.yellow.com/ws");
