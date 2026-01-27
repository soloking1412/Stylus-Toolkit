# Stylus Toolkit

**The easiest way to build Arbitrum Stylus smart contracts in Rust.**

[![npm version](https://img.shields.io/npm/v/stylus-toolkit.svg)](https://www.npmjs.com/package/stylus-toolkit)
[![License](https://img.shields.io/npm/l/stylus-toolkit)](LICENSE)
[![Downloads](https://img.shields.io/npm/dt/stylus-toolkit.svg)](https://www.npmjs.com/package/stylus-toolkit)
[![CI](https://github.com/soloking1412/Stylus-Toolkit/workflows/CI/badge.svg)](https://github.com/soloking1412/Stylus-Toolkit/actions)
[![Node Version](https://img.shields.io/node/v/stylus-toolkit.svg)](https://nodejs.org)

Build, deploy, and profile Stylus contracts with simple commands. **No Docker required** - works with testnets out of the box!

## ✨ Features

- 🚀 **One-command project setup** - 4 ready-to-deploy templates
- 📦 **Built-in WASM compiler** - Automatic Rust to WebAssembly compilation
- ⚡ **Gas profiling** - Compare Rust vs Solidity gas usage
- 🌐 **Network support** - Local, testnet, and mainnet configurations
- 🐳 **Docker optional** - Use testnets for development (no Docker needed!)
- 📊 **Multiple export formats** - JSON, CSV, HTML reports

## 🎯 Quick Start (3 Commands)

```bash
# 1. Install
npm install -g stylus-toolkit

# 2. Create project
stylus-toolkit init -n my-counter -t basic && cd my-counter

# 3. Build
cd contracts-rust && rustup target add wasm32-unknown-unknown && cd .. && stylus-toolkit build
```

**That's it!** Your contract is ready to deploy.

**No Docker?** No problem! Deploy to testnet directly:
```bash
stylus-toolkit config --set defaultNetwork=arbitrum-sepolia
```

## 📋 Prerequisites

**Required:**
- Node.js 16+ ([Download](https://nodejs.org/))
- Rust ([Install](https://rustup.rs/))

**Optional:**
- Docker (only if you want local node) ([Download](https://www.docker.com/get-started))

Most developers use testnet and don't need Docker!

## 📚 Documentation

- **[Quick Start Guide](./QUICKSTART.md)** - Complete tutorial from zero to deployment
- **[Cheat Sheet](./CHEATSHEET.md)** - All commands at a glance
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

## 🛠️ Commands

### init

Initialize a new Stylus project.

```bash
stylus-toolkit init [options]

Options:
  -n, --name <name>          Project name
  -t, --template <template>  Template (basic, erc20, erc721, defi)
  --rust-only                Rust only
  --solidity-only            Solidity only
```

### profile

Profile and compare gas usage.

```bash
stylus-toolkit profile [options]

Options:
  -c, --contract <name>      Contract name
  -r, --rpc <url>            RPC endpoint
  -n, --network <network>    Network (local, arbitrum-sepolia, arbitrum-one)
  --export <format>          Export format (json, csv, html)
  --detailed                 Show detailed breakdown
```

### config

Manage configuration.

```bash
stylus-toolkit config [options]

Options:
  --set <key=value>  Set config value
  --get <key>        Get config value
  --list             List all config
  --reset            Reset to defaults
```

## Example Output

```
┌────────────┬──────────────┬──────────────┬──────────┬────────┐
│ Metric     │ Rust         │ Solidity     │ Savings  │ %      │
├────────────┼──────────────┼──────────────┼──────────┼────────┤
│ Deployment │ 120,456      │ 845,231      │ 724,775  │ 85.75% │
│ increment  │ 2,341        │ 43,892       │ 41,551   │ 94.67% │
└────────────┴──────────────┴──────────────┴──────────┴────────┘
```

## Configuration

Default networks:
- Local: `http://localhost:8547`
- Arbitrum Sepolia: Testnet
- Arbitrum One: Mainnet

Add custom networks:

```bash
stylus-toolkit config --set networks.custom.rpcUrl=https://your-rpc.com
```

## Project Structure

```
my-project/
├── contracts-rust/
│   └── src/lib.rs
├── contracts-solidity/
│   └── Contract.sol
├── .stylus-toolkit/
└── README.md
```

## Development

```bash
git clone https://github.com/soloking1412/stylus-toolkit.git
cd stylus-toolkit
npm install
npm run build
```

## License

MIT

## Links

- [Stylus Docs](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- [Stylus SDK](https://github.com/OffchainLabs/stylus-sdk-rs)
- [Issues](https://github.com/soloking1412/stylus-toolkit/issues)
