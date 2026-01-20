import Conf from 'conf';
import { ToolkitConfig, NetworkConfig } from '../types';

const defaultNetworks: Map<string, NetworkConfig> = new Map([
  [
    'local',
    {
      name: 'Local Stylus Testnet',
      rpcUrl: 'http://localhost:8547',
      chainId: 412346,
    },
  ],
  [
    'arbitrum-sepolia',
    {
      name: 'Arbitrum Sepolia',
      rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
      chainId: 421614,
      explorer: 'https://sepolia.arbiscan.io',
    },
  ],
  [
    'arbitrum-one',
    {
      name: 'Arbitrum One',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      chainId: 42161,
      explorer: 'https://arbiscan.io',
    },
  ],
]);

const defaultConfig: ToolkitConfig = {
  defaultNetwork: 'local',
  networks: defaultNetworks,
  gasPrice: 'auto',
  resultsDir: '.stylus-toolkit/results',
};

class ConfigManager {
  private config: Conf<ToolkitConfig>;

  constructor() {
    this.config = new Conf({
      projectName: 'stylus-toolkit',
      defaults: defaultConfig as any,
    });
  }

  get(key: keyof ToolkitConfig): any {
    return this.config.get(key);
  }

  set(key: keyof ToolkitConfig, value: any): void {
    this.config.set(key, value);
  }

  getNetwork(networkName: string): NetworkConfig | undefined {
    const networks = this.config.get('networks') as any;
    return networks[networkName];
  }

  addNetwork(name: string, network: NetworkConfig): void {
    const networks = this.config.get('networks') as any;
    networks[name] = network;
    this.config.set('networks', networks);
  }

  listNetworks(): string[] {
    const networks = this.config.get('networks') as any;
    return Object.keys(networks);
  }

  reset(): void {
    this.config.clear();
    this.config.set(defaultConfig as any);
  }

  getAll(): ToolkitConfig {
    return this.config.store as ToolkitConfig;
  }
}

export const config = new ConfigManager();
