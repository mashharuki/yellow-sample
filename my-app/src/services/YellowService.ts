import {
  createAuthRequestMessage,
  createAuthVerifyMessageWithJWT,
  createAppSessionMessage,
  createSubmitAppStateMessage,
  createCloseAppSessionMessage,
  createGetAppSessionsMessage,
  createECDSAMessageSigner
} from '@erc7824/nitrolite';
import { getConfig } from '../utils/config';
import { logger } from '../utils/logger';

export interface AppSession {
  appSessionId: string;
  status: string;
  participants: string[];
  appDefinition: string;
  channelNonce: bigint;
  challengeDuration: number;
  turnNum: bigint;
  appData: string;
}

export class YellowService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private jwtToken: string | null = null;
  private messageHandlers = new Map<string, {
    resolve: (data: any) => void;
    reject: (error: Error) => void;
    timeout: any;
  }>();
  private messageSigner: any = null;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const config = getConfig();
        this.ws = new WebSocket(config.clearNodeUrl);

        this.ws.onopen = async () => {
          logger.info('Connected to Yellow ClearNode');
          this.isConnected = true;

          // Initialize message signer if privateKey is available
          if (config.privateKey) {
            this.messageSigner = createECDSAMessageSigner(config.privateKey as any);
          }

          await this.authenticate();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          logger.info(`WebSocket closed: ${event.code} ${event.reason}`);
          this.isConnected = false;
          this.cleanup();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private async authenticate(): Promise<void> {
    if (!this.ws) throw new Error('WebSocket not connected');

    try {
      const config = getConfig();

      // Try to reconnect with stored JWT first
      if (typeof window !== 'undefined') {
        const storedJWT = localStorage.getItem('yellow_jwt_token');
        if (storedJWT) {
          const authMessage = await createAuthVerifyMessageWithJWT(storedJWT);
          this.ws.send(authMessage);
          logger.info('Authenticating with stored JWT');
          return;
        }
      }

      // Initial authentication with channel ID
      const authRequest = await createAuthRequestMessage({
        address: config.channelId as any,
        session_key: '0x0000000000000000000000000000000000000000000000000000000000000000' as any,
        app_name: 'Auction DApp',
        allowances: [],
        expire: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        scope: 'app_session',
        application: '0x0000000000000000000000000000000000000000' as any
      });

      this.ws.send(authRequest);
      logger.info('Sent authentication request');
    } catch (error) {
      logger.error('Authentication failed:', error);
      throw error;
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      // Handle auth responses
      if (data.method === 'auth_success') {
        this.jwtToken = data.params?.jwtToken || data.result?.jwtToken;
        if (typeof window !== 'undefined' && this.jwtToken) {
          localStorage.setItem('yellow_jwt_token', this.jwtToken);
        }
        logger.info('✅ Yellow authentication successful');
        return;
      }

      if (data.method === 'auth_failure') {
        logger.error('❌ Authentication failed:', data.params?.error || data.error);
        return;
      }

      // Handle responses for pending requests
      const requestId = data.id?.toString();
      if (requestId && this.messageHandlers.has(requestId)) {
        const handler = this.messageHandlers.get(requestId)!;
        clearTimeout(handler.timeout);

        if (data.error) {
          handler.reject(new Error(data.error.message || 'RPC Error'));
        } else {
          handler.resolve(data.result || data.params);
        }

        this.messageHandlers.delete(requestId);
      }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  }

  private async sendRPCMessage<T = any>(message: string, timeoutMs: number = 30000): Promise<T> {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to Yellow ClearNode');
    }

    return new Promise((resolve, reject) => {
      const messageData = JSON.parse(message);
      const requestId = messageData.id?.toString() || Date.now().toString();

      const timeout = setTimeout(() => {
        this.messageHandlers.delete(requestId);
        reject(new Error('Request timeout'));
      }, timeoutMs);

      this.messageHandlers.set(requestId, { resolve, reject, timeout });
      this.ws!.send(message);
    });
  }

  async createAppSession(params: {
    participants: string[];
    appDefinition: string;
    appData: string;
    challengeDuration?: number;
  }): Promise<{ appSessionId: string; turnNum: bigint }> {
    if (!this.messageSigner) {
      throw new Error('Message signer not initialized. Please provide privateKey in config.');
    }

    const sessionMessage = await createAppSessionMessage(this.messageSigner, {
      definition: {
        protocol: '0.2' as any, // RPCProtocolVersion.NitroRPC_0_2
        participants: params.participants as any[],
        weights: params.participants.map(() => 1),
        quorum: 1,
        challenge: params.challengeDuration || 3600
      },
      allocations: params.participants.map(p => ({
        asset: '0x0000000000000000000000000000000000000000',
        amount: '0',
        participant: p as any
      })),
      session_data: params.appData
    });

    const response = await this.sendRPCMessage(sessionMessage);

    logger.info('App session created:', response.app_session_id);

    return {
      appSessionId: response.app_session_id,
      turnNum: BigInt(response.turn_num || 0)
    };
  }

  async submitAppState(params: {
    appSessionId: string;
    turnNum: bigint;
    appData: string;
    isFinal?: boolean;
  }): Promise<{ turnNum: bigint }> {
    if (!this.messageSigner) {
      throw new Error('Message signer not initialized');
    }

    const stateMessage = await createSubmitAppStateMessage(this.messageSigner, {
      app_session_id: params.appSessionId as any,
      allocations: [], // Empty allocations for state update
      session_data: params.appData
    });

    const response = await this.sendRPCMessage(stateMessage);

    logger.info('App state submitted:', response.turn_num);

    return {
      turnNum: BigInt(response.turn_num || params.turnNum)
    };
  }

  async closeAppSession(appSessionId: string): Promise<void> {
    if (!this.messageSigner) {
      throw new Error('Message signer not initialized');
    }

    const closeMessage = await createCloseAppSessionMessage(this.messageSigner, {
      app_session_id: appSessionId as any,
      allocations: [],
      session_data: ''
    });

    await this.sendRPCMessage(closeMessage);
    logger.info('App session closed:', appSessionId);
  }

  async getAppSessions(participant?: string, status?: string): Promise<AppSession[]> {
    if (!this.messageSigner) {
      throw new Error('Message signer not initialized');
    }

    const config = getConfig();
    const getMessage = await createGetAppSessionsMessage(
      this.messageSigner,
      (participant || config.channelId) as any,
      status as any
    );

    const response = await this.sendRPCMessage<{ app_sessions: any[] }>(getMessage);
    return response.app_sessions || [];
  }

  private cleanup(): void {
    // Clear all pending handlers
    for (const [id, handler] of this.messageHandlers.entries()) {
      clearTimeout(handler.timeout);
      handler.reject(new Error('Connection closed'));
    }
    this.messageHandlers.clear();
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.cleanup();
  }

  isReady(): boolean {
    return this.isConnected && this.jwtToken !== null;
  }
}
