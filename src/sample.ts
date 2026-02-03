// Import your preferred WebSocket library
// Node.js
import {
  createAuthRequestMessage,
  parseAnyRPCResponse
} from '@erc7824/nitrolite';
import WebSocket from 'ws';
// or use the browser's built-in WebSocket

// Create a WebSocket connection to the ClearNode
const ws = new WebSocket('wss://clearnet.yellow.com/ws');

// Create and send auth_request
const authRequestMsg = await createAuthRequestMessage({
  address: '0x51908F598A5e0d8F1A3bAbFa6DF76F9704daD072',
  session_key: '0x1295BDc0C102EB105dC0198fdC193588fe66A1e4',
  application: 'test-app',
  expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour expiration (as string)
  scope: 'console',
  allowances: [],
});

// Set up basic event handlers
ws.onopen = () => {
  console.log('WebSocket connection established');
  // 送信
  ws.send(authRequestMsg);
};

ws.onmessage = (event) => {
  // メッセージ受信
  const message = parseAnyRPCResponse(event.data as any);
  console.log('Received message:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  console.log(`WebSocket closed: ${event.code} ${event.reason}`);
};