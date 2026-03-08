# Stylus Toolkit - Quick Start Guide

Get started with Arbitrum Stylus development in minutes!

## 🚀 Fastest Start (4 Commands)

```bash
# 1. Install
npm install -g stylus-toolkit

# 2. Create project
stylus-toolkit init -n my-app -t basic && cd my-app

# 3. Build
cd contracts-rust && rustup target add wasm32-unknown-unknown && cd .. && stylus-toolkit build

# 4. Deploy (with automatic gas estimation!)
stylus-toolkit deploy --network arbitrum-sepolia --private-key-path=./key.txt
```

**Done!** Your Stylus contract is built and deployed with **automatic gas estimation** that ensures deployment always succeeds.

**No Docker needed** - Deploy to testnet directly with automatic gas calculation.

## Prerequisites

### Required

1. **Node.js** (>= 16.0.0)
   ```bash
   node --version
   ```

2. **Rust** (1.87.0 via rustup)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add wasm32-unknown-unknown
   ```

### Optional (Choose one)

**Option A: Docker** (for local development node)
```bash
docker --version
# macOS: brew install --cask docker
```

**Option B: Use Testnet** (No Docker needed!)
- Get testnet ETH from faucet: https://faucet.quicknode.com/arbitrum/sepolia
- Deploy directly to Arbitrum Sepolia
- No local setup required!

## Installation

```bash
npm install -g stylus-toolkit
```

## 5-Minute Tutorial

### Step 1: Create a New Project

```bash
# Create a basic counter contract
stylus-toolkit init -n my-counter -t basic

# Or choose from templates:
# -t basic    : Simple counter (recommended for beginners)
# -t erc20    : Fungible token
# -t erc721   : NFT contract
# -t defi     : Liquidity pool
```

**Output:**
```
✔ Project created successfully!

▶ Project Details
  Project Name  : my-counter
  Template      : basic
  Location      : /path/to/my-counter
```

### Step 2: Navigate to Your Project

```bash
cd my-counter
```

**Your project structure:**
```
my-counter/
├── contracts-rust/          # Rust smart contract
│   ├── src/
│   │   └── lib.rs          # Main contract code
│   ├── Cargo.toml
│   ├── Cargo.lock
│   └── rust-toolchain.toml
├── contracts-solidity/      # Solidity equivalent (for comparison)
│   └── Counter.sol
├── scripts/                 # Deployment scripts
└── test/                    # Test files
```

### Step 3: Install Rust WASM Target

```bash
# Navigate to Rust project
cd contracts-rust

# Install WASM compilation target (one-time setup)
rustup target add wasm32-unknown-unknown

# Return to project root
cd ..
```

### Step 4: Build Your Contract

```bash
stylus-toolkit build
```

**Output:**
```
✔ Build successful (14.52s)

▶ Build Output
  Contract Name : my-counter
  WASM Size     : 18.24 KB
  Build Mode    : Release
  Output Path   : contracts-rust/target/wasm32-unknown-unknown/release/my_counter.wasm
```

### Step 5: Choose Your Development Environment

**Option A: With Docker (Local Node)**

```bash
# Start node in background
stylus-toolkit dev --detach
```

**Output:**
```
✓ Local Stylus node is running!

▶ Connection Details
  RPC URL    : http://localhost:8547
  Chain ID   : 412346
```

**Option B: Without Docker (Use Testnet) - EASIER!**

```bash
# Configure for testnet (no Docker needed!)
stylus-toolkit config --set defaultNetwork=arbitrum-sepolia
```

Then get free testnet ETH:
- Visit: https://faucet.quicknode.com/arbitrum/sepolia
- Paste your wallet address
- Receive testnet ETH in seconds

**No Docker installation required!** Skip to deployment.

### Step 6: Deploy Your Contract (NEW!)

The toolkit includes **automatic gas estimation** that ensures your deployment always succeeds:

```bash
# Create a key file (NEVER commit to git!)
echo "0xYOUR_PRIVATE_KEY" > key.txt

# Deploy to Arbitrum Sepolia with automatic gas estimation
stylus-toolkit deploy --network arbitrum-sepolia --private-key-path=./key.txt
```

**Features:**
- ✅ **Automatic gas calculation** based on WASM size
- ✅ **2.5x safety buffer** to prevent out-of-gas errors
- ✅ **Network verification** for accurate estimates
- ✅ **Always succeeds** - no more deployment failures!

**Expected Output:**
```
✔ Gas calculated: 14,610,800 (WASM: 14.40 KB, 2.5x safety buffer)
✔ Contract deployed successfully (3.2s)

▶ Deployment Results
  Status           : ✓ Deployed
  Network          : arbitrum-sepolia
  Contract Address : 0x1234...5678
  Gas Used         : 9,740,533
  Gas Limit        : 14,610,800

▶ Explorer Links
  Contract: https://sepolia.arbiscan.io/address/0x1234...5678
```

**Deployment Options:**
```bash
# Estimate gas without deploying
stylus-toolkit deploy --estimate-only --private-key-path=./key.txt

# Deploy to local node
stylus-toolkit deploy --private-key-path=./key.txt

# Deploy to mainnet
stylus-toolkit deploy --network arbitrum-one --private-key-path=./key.txt

# Manual gas limit (if needed)
stylus-toolkit deploy --gas-limit=20000000 --private-key-path=./key.txt
```

See [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) for complete deployment documentation.

### Step 7: Profile Gas Usage

```bash
# Compare Rust vs Solidity gas consumption
stylus-toolkit profile --contract my-counter
```

**Expected Output:**
```
✔ Rust compilation successful (0.21s)
✔ Solidity compilation successful (0.13s)

✅ Excellent gas optimization: 28.70% TCO savings
```

### Step 8: View Your Contract Code

**Rust Contract (`contracts-rust/src/lib.rs`):**
```rust
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{alloy_primitives::U256, prelude::*};

sol_storage! {
    #[entrypoint]
    pub struct Counter {
        uint256 number;
    }
}

#[public]
impl Counter {
    pub fn number(&self) -> U256 {
        self.number.get()
    }

    pub fn set_number(&mut self, new_number: U256) {
        self.number.set(new_number);
    }

    pub fn increment(&mut self) {
        let number = self.number.get();
        self.set_number(number + U256::from(1));
    }
}
```

### Step 9: Configure Networks

```bash
# List current configuration
stylus-toolkit config --list

# Set default network
stylus-toolkit config --set defaultNetwork=arbitrum-sepolia

# Configure custom RPC
stylus-toolkit config --set networks.arbitrum-sepolia.rpcUrl=https://your-rpc-url
```

## Common Workflows

### Development Workflow

```bash
# 1. Create project
stylus-toolkit init -n my-project -t basic
cd my-project

# 2. Setup Rust
cd contracts-rust && rustup target add wasm32-unknown-unknown && cd ..

# 3. Build contracts
stylus-toolkit build

# 4. Start local node
stylus-toolkit dev --detach

# 5. Profile gas
stylus-toolkit profile --contract my-project

# 6. Stop node when done
docker stop nitro-testnode
```

### Testnet Deployment Workflow (No Docker Required!)

This workflow doesn't require Docker at all - perfect if you can't or don't want to install Docker.

```bash
# 1. Create and build project
stylus-toolkit init -n my-project -t basic
cd my-project
cd contracts-rust && rustup target add wasm32-unknown-unknown && cd ..
stylus-toolkit build

# 2. Configure testnet
stylus-toolkit config --set defaultNetwork=arbitrum-sepolia

# 3. Get testnet ETH
# Visit: https://faucet.quicknode.com/arbitrum/sepolia
# Send some testnet ETH to your address

# 4. Install cargo-stylus (one-time)
cargo install cargo-stylus

# 5. Deploy to testnet
cd contracts-rust
cargo stylus deploy \
  --private-key-path=./key.txt \
  --endpoint https://sepolia-rollup.arbitrum.io/rpc

# 6. Profile on testnet (optional)
cd ..
stylus-toolkit profile --network arbitrum-sepolia
```

**No Docker, No Problem!** You can develop, build, and deploy entirely using testnets.

## Available Templates

### 1. Basic (Counter)
Simple counter demonstrating state management.
```bash
stylus-toolkit init -n counter -t basic
```

### 2. ERC-20 (Fungible Token)
Standard token implementation with transfer and allowance.
```bash
stylus-toolkit init -n my-token -t erc20
```

### 3. ERC-721 (NFT)
NFT counter tracking total minted tokens.
```bash
stylus-toolkit init -n my-nft -t erc721
```

### 4. DeFi (Liquidity Pool)
Simple liquidity pool contract.
```bash
stylus-toolkit init -n defi-pool -t defi
```

## All Available Commands

```bash
# Project Management
stylus-toolkit init -n <name> -t <template>    # Create new project
stylus-toolkit build                           # Build contracts
stylus-toolkit config --list                   # View configuration

# Development
stylus-toolkit dev --detach                    # Start local node
stylus-toolkit dev                             # Start node (foreground)
docker stop nitro-testnode                     # Stop local node
docker logs -f nitro-testnode                  # View node logs

# Testing & Profiling
stylus-toolkit profile --contract <name>       # Gas profiling
stylus-toolkit profile --network arbitrum-sepolia  # Profile on testnet
stylus-toolkit benchmark                       # Run benchmarks (in development)

# Configuration
stylus-toolkit config --set key=value          # Set config
stylus-toolkit config --get key                # Get config value
stylus-toolkit config --reset                  # Reset to defaults
```

## Network Configuration

### Local Development
```bash
RPC URL  : http://localhost:8547
Chain ID : 412346
Network  : local
```

### Arbitrum Sepolia (Testnet)
```bash
RPC URL  : https://sepolia-rollup.arbitrum.io/rpc
Chain ID : 421614
Explorer : https://sepolia.arbiscan.io
```

### Arbitrum One (Mainnet)
```bash
RPC URL  : https://arb1.arbitrum.io/rpc
Chain ID : 42161
Explorer : https://arbiscan.io
```

## Troubleshooting

### Issue: "Network 'local' not found"
```bash
# Reset configuration
stylus-toolkit config --reset
```

### Issue: "Can't find crate for `core`"
```bash
# Install wasm32 target in the Rust project directory
cd contracts-rust
rustup target add wasm32-unknown-unknown
cd ..
```

### Issue: "Docker not found"
```bash
# macOS
brew install --cask docker

# Then start Docker Desktop
```

### Issue: "Port 8547 already in use"
```bash
# Find what's using the port
lsof -i :8547

# Use a different port
stylus-toolkit dev --port 8548 --detach
```

## Next Steps

1. **Read the contracts**: Explore the generated Rust and Solidity code
2. **Modify the contract**: Try adding new functions
3. **Write tests**: Add tests in the `test/` directory
4. **Deploy to testnet**: Use `cargo stylus deploy`
5. **Check the docs**: See TROUBLESHOOTING.md for detailed guides

## Useful Resources

- **Stylus Documentation**: https://docs.arbitrum.io/stylus/stylus-gentle-introduction
- **Rust Book**: https://doc.rust-lang.org/book/
- **Arbitrum Discord**: https://discord.gg/arbitrum
- **Stylus SDK**: https://github.com/OffchainLabs/stylus-sdk-rs

## Support

If you encounter issues:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Run with debug: `DEBUG=* stylus-toolkit <command>`
3. Report issues: https://github.com/soloking1412/stylus-toolkit/issues

---

**Happy Building! 🚀**

Built with ❤️ for the Arbitrum Stylus ecosystem
