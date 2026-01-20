# Stylus Toolkit

CLI tool for building and profiling Arbitrum Stylus smart contracts.

[![npm version](https://img.shields.io/npm/v/stylus-toolkit.svg)](https://www.npmjs.com/package/stylus-toolkit)
[![License](https://img.shields.io/npm/l/stylus-toolkit)](LICENSE)
[![Downloads](https://img.shields.io/npm/dt/stylus-toolkit.svg)](https://www.npmjs.com/package/stylus-toolkit)
[![CI](https://github.com/soloking1412/Stylus-Toolkit/workflows/CI/badge.svg)](https://github.com/soloking1412/Stylus-Toolkit/actions)
[![Node Version](https://img.shields.io/node/v/stylus-toolkit.svg)](https://nodejs.org)

## Features

- Gas profiling for Rust and Solidity contracts
- Side-by-side performance comparison
- Project templates (ERC-20, ERC-721, DeFi, Basic)
- Multi-format exports (JSON, CSV, HTML)
- Cross-platform support

## Installation

```bash
npm install -g stylus-toolkit
```

**Prerequisites:** Node.js 16+, Rust/Cargo

## Quick Start

```bash
# Create new project
stylus-toolkit init

# Profile gas usage
cd my-stylus-project
stylus-toolkit profile --export html
```

## Commands

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
