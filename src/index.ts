/**
 * Yellow Protocol (Nitrolite SDK) Quick Start
 *
 * This example demonstrates:
 * 1. Connecting to ClearNode
 * 2. Authentication with EIP-712 signatures
 * 3. Getting channel information
 * 4. Checking balances
 */

import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createECDSAMessageSigner,
  createGetChannelsMessageV2,
  createGetLedgerBalancesMessage,
  parseAnyRPCResponse,
  RPCMethod,
  type MessageSigner,
} from '@erc7824/nitrolite';
import { ethers } from 'ethers';
import WebSocket from 'ws';

// Configuration
const CLEARNODE_URL = process.env.CLEARNODE_URL || 'wss://clearnet.yellow.com/ws';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const APPLICATION_NAME = process.env.APPLICATION_NAME || 'yellow-quickstart';

// Validate configuration
if (!PRIVATE_KEY) {
  console.error('❌ Error: PRIVATE_KEY environment variable is required');
  console.log('💡 Tip: Create a .env file based on .env.example');
  process.exit(1);
}

// Initialize wallet and signer
let wallet: ethers.Wallet;
let messageSigner: MessageSigner;
try {
  // Ensure private key has 0x prefix
  const privateKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;

  wallet = new ethers.Wallet(privateKey);
  // Create ECDSA message signer from private key
  messageSigner = createECDSAMessageSigner(privateKey as `0x${string}`);
  console.log('✅ Wallet initialized');
  console.log('📍 Address:', wallet.address);
} catch (error) {
  console.error('❌ Error: Invalid private key');
  process.exit(1);
}

/**
 * メイン関数
 */
async function main() {
  console.log('\n🚀 Yellow Protocol Quick Start\n');
  console.log('📡 Connecting to ClearNode:', CLEARNODE_URL);

  const ws = new WebSocket(CLEARNODE_URL);

  // Connection state
  let isConnected = false;
  let isAuthenticated = false;

  // Connection timeout
  const connectionTimeout = setTimeout(() => {
    if (!isConnected) {
      console.error('❌ Connection timeout');
      ws.close();
      process.exit(1);
    }
  }, 10000);

  // Handle connection open
  ws.on('open', async () => {
    clearTimeout(connectionTimeout);
    isConnected = true;
    console.log('✅ WebSocket connected');

    try {
      // Step 1: Send authentication request
      console.log('\n🔐 Starting authentication...');

      const authRequest = await createAuthRequestMessage({
        address: wallet.address as `0x${string}`,
        session_key: wallet.address as `0x${string}`,
        application: APPLICATION_NAME,
        expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour
        scope: 'console',
        allowances: [],
      });

      ws.send(authRequest);
      console.log('📤 Auth request sent');
    } catch (error) {
      console.error('❌ Auth request failed:', error);
      ws.close();
    }
  });

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const rawData = typeof data === 'string' ? data : data.toString();
      const message = parseAnyRPCResponse(rawData);

      console.log('📨 Received:', message.method);

      switch (message.method) {
        case RPCMethod.AuthChallenge:
          // Step 2: Handle authentication challenge
          console.log('🔑 Received auth challenge');

          try {
            // For simplicity, we use the ECDSA message signer for auth
            // In production, you should use createEIP712AuthMessageSigner for wallet integration
            const authVerifyMsg = await createAuthVerifyMessage(
              messageSigner,
              message as any // Type assertion for compatibility
            );

            ws.send(authVerifyMsg);
            console.log('📤 Auth verification sent');
          } catch (error) {
            console.error('❌ Auth verification failed:', error);
            ws.close();
          }
          break;

        case RPCMethod.AuthVerify:
          // Step 3: Handle authentication result
          if (message.params && 'success' in message.params && message.params.success) {
            isAuthenticated = true;
            console.log('✅ Authentication successful!');

            if ('jwtToken' in message.params && message.params.jwtToken) {
              console.log('🎟️  JWT token received (store this for reconnection)');
            }

            // Now that we're authenticated, get channels
            getChannels(ws);
          } else {
            console.error('❌ Authentication failed');
            ws.close();
          }
          break;

        case RPCMethod.GetChannels:
          // Step 4: Handle channel information
          console.log('\n📊 Channel Information:');

          const channels = message.params && 'channels' in message.params ? message.params.channels : [];
          if (channels && channels.length > 0) {
            channels.forEach((channel, index) => {
              console.log(`\n  Channel ${index + 1}:`);
              console.log(`    ID: ${channel.channelId || 'N/A'}`);
              console.log(`    Status: ${channel.status || 'N/A'}`);
              console.log(`    Wallet: ${channel.wallet || 'N/A'}`);
              if ('chainId' in channel) console.log(`    Chain ID: ${channel.chainId}`);
            });

            // Get balances for the first channel
            if (channels[0]) {
              await getBalances(ws, wallet.address as `0x${string}`);
            }
          } else {
            console.log('  No channels found');
            console.log('  💡 Create a channel at https://apps.yellow.com');
            gracefulShutdown(ws);
          }
          break;

        case RPCMethod.GetLedgerBalances:
          // Step 5: Handle balance information
          console.log('\n💰 Balance Information:');

          const balances = message.params && 'ledgerBalances' in message.params ? message.params.ledgerBalances : [];
          if (balances && balances.length > 0) {
            balances.forEach((balance) => {
              console.log(`  ${balance.asset?.toUpperCase() || 'UNKNOWN'}: ${balance.amount || '0'}`);
            });
          } else {
            console.log('  No balances found');
          }

          // All done, close gracefully
          console.log('\n✅ Quick start completed successfully!');
          gracefulShutdown(ws);
          break;

        case RPCMethod.Error:
          const errorMsg = message.params && 'error' in message.params ? message.params.error : 'Unknown error';
          console.error('❌ RPC Error:', errorMsg);
          ws.close();
          break;

        default:
          console.log('ℹ️  Unhandled message type:', message.method);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });

  // Handle close
  ws.on('close', (code, reason) => {
    console.log(`\n🔌 Connection closed: ${code} ${reason.toString()}`);

    if (!isAuthenticated) {
      console.log('💡 Tip: Make sure you have created a channel at https://apps.yellow.com');
    }

    process.exit(isAuthenticated ? 0 : 1);
  });
}

// Helper function to get channels
function getChannels(ws: WebSocket) {
  try {
    console.log('\n📋 Fetching channels...');

    const message = createGetChannelsMessageV2(wallet.address as `0x${string}`);

    ws.send(message);
  } catch (error) {
    console.error('❌ Error getting channels:', error);
    ws.close();
  }
}

// Helper function to get balances
async function getBalances(ws: WebSocket, participant: `0x${string}`) {
  try {
    console.log('\n💵 Fetching balances...');

    const message = await createGetLedgerBalancesMessage(
      messageSigner,
      participant
    );

    ws.send(message);
  } catch (error) {
    console.error('❌ Error getting balances:', error);
    ws.close();
  }
}

// Graceful shutdown
function gracefulShutdown(ws: WebSocket) {
  setTimeout(() => {
    ws.close(1000, 'Normal closure');
  }, 1000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down...');
  process.exit(0);
});

// Run the application
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
