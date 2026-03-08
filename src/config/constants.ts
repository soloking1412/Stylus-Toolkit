export const DEFAULT_DOCKER_IMAGE = 'offchainlabs/nitro-node:v2.3.3-6a1c1a7';
export const DEFAULT_RPC_PORT = 8547;
export const DEFAULT_CHAIN_ID = 412346;

export const GAS_FUNCTION_ESTIMATES = {
  rust: {
    read: { avgGas: 5000, calls: 100 },
    write: { avgGas: 12000, calls: 100 },
    compute: { avgGas: 8000, calls: 100 },
    oracle: { avgGas: 75000, calls: 100 },
  },
  solidity: {
    read: { avgGas: 6000, calls: 100 },
    write: { avgGas: 20000, calls: 100 },
    compute: { avgGas: 15000, calls: 100 },
    oracle: { avgGas: 103000, calls: 100 },
  },
};

export const NETWORK_CONFIGS = {
  local: { rpc: 'http://localhost:8547', chainId: 412346 },
  'arbitrum-sepolia': { rpc: 'https://sepolia-rollup.arbitrum.io/rpc', chainId: 421614 },
  'arbitrum-one': { rpc: 'https://arb1.arbitrum.io/rpc', chainId: 42161 },
};
