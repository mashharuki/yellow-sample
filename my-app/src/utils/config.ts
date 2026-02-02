export interface YellowConfig {
  channelId: string;
  clearNodeUrl: string;
  chains: string[];
  features: string[];
  privateKey?: string;
  appDefinition?: string;
}

// Default config for browser environment
const defaultConfig: YellowConfig = {
  channelId: '',
  clearNodeUrl: 'wss://clearnet.yellow.com/ws',
  chains: ['polygon', 'celo', 'base'],
  features: ['websocket', 'authentication', 'session-management']
};

let configInstance: YellowConfig = defaultConfig;

export const loadConfig = (): YellowConfig => {
  // Load from environment variables (Vite uses import.meta.env)
  // @ts-ignore - Vite injects import.meta.env at build time
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    configInstance = {
      // @ts-ignore
      channelId: import.meta.env.VITE_YELLOW_CHANNEL_ID || defaultConfig.channelId,
      // @ts-ignore
      clearNodeUrl: import.meta.env.VITE_YELLOW_CLEARNODE_URL || defaultConfig.clearNodeUrl,
      chains: defaultConfig.chains,
      features: defaultConfig.features,
      // @ts-ignore
      privateKey: import.meta.env.VITE_YELLOW_PRIVATE_KEY,
      // @ts-ignore
      appDefinition: import.meta.env.VITE_YELLOW_APP_DEFINITION
    };
  }

  return configInstance;
};

export const getConfig = (): YellowConfig => {
  return configInstance;
};

export const config = loadConfig();
