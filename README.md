# Stylus Toolkit

**CLI development environment for Arbitrum Stylus smart contracts.**

Think of it as the "Hardhat for Stylus" — one install, and you have everything needed to build, test, and optimize Rust-based smart contracts on Arbitrum.

[![npm version](https://img.shields.io/npm/v/stylus-toolkit.svg)](https://www.npmjs.com/package/stylus-toolkit)
[![npm downloads](https://img.shields.io/npm/dt/stylus-toolkit.svg)](https://www.npmjs.com/package/stylus-toolkit)
[![License](https://img.shields.io/npm/l/stylus-toolkit)](LICENSE)
[![CI](https://github.com/soloking1412/Stylus-Toolkit/workflows/CI/badge.svg)](https://github.com/soloking1412/Stylus-Toolkit/actions)

---

## What it does

Stylus offers 10-70x gas savings over Solidity, but the tooling hasn't caught up. Stylus Toolkit fills that gap with a single CLI that handles the entire dev workflow — from project init to gas profiling to deployment.

- **Gas profiler** — side-by-side Rust vs Solidity comparison with exact numbers, not estimates
- **Local testnet** — one-command Docker node with pre-funded accounts, no manual setup
- **Analytics dashboard** — web UI to track gas savings over time across all your contracts
- **4 templates** — basic counter, ERC20, ERC721, DeFi pool — all with matching Solidity versions for comparison
- **Export reports** — JSON, CSV, HTML for sharing or CI integration
- **Multi-network** — local, Arbitrum Sepolia, Arbitrum One

This is an [Arbitrum grant-approved](https://forum.arbitrum.foundation) project, actively maintained.

---

## Install

```bash
npm install -g stylus-toolkit
```

**Prerequisites:**

- Node.js 16+
- Rust + wasm32 target

```bash
# Install Rust: https://rustup.rs
rustup target add wasm32-unknown-unknown
```

Docker is only required if you use `stylus-toolkit dev` (local testnet). All other commands work without it.

---

## Quick start

```bash
stylus-toolkit init --name my-counter --template basic
cd my-counter
stylus-toolkit build
stylus-toolkit profile
```

Output:

```
┌──────────────────────┬──────────────┬──────────────┬────────────┬────────┐
│ Function             │ Rust (Stylus)│ Solidity     │ Savings    │ %      │
├──────────────────────┼──────────────┼──────────────┼────────────┼────────┤
│   read               │ 5,000        │ 6,000        │ 1,000      │ 16.67% │
│   write              │ 12,000       │ 20,000       │ 8,000      │ 40.00% │
│   compute            │ 8,000        │ 15,000       │ 7,000      │ 46.67% │
│   oracle             │ 75,000       │ 103,000      │ 28,000     │ 27.18% │
│ Avg per-call         │ -            │ -            │ 11,000     │ 32.63% │
└──────────────────────┴──────────────┴──────────────┴────────────┴────────┘

✅ KPI ACHIEVED: 32.63% average execution gas savings (Target: 25%+)
✅ KPI ACHIEVED: 26.74% full TCO savings (Target: 25%+)
```

---

## Commands

### `init` — Create a new project

```bash
stylus-toolkit init --name <name> --template <template>

# Templates: basic | erc20 | erc721 | defi
stylus-toolkit init --name my-token --template erc20
stylus-toolkit init --name my-nft   --template erc721
stylus-toolkit init --name my-pool  --template defi
```

Each template includes a Rust contract and a matching Solidity version, so you can run `profile` immediately after `build`.

### `build` — Compile Rust to WASM

```bash
stylus-toolkit build

# Output: contracts-rust/target/wasm32-unknown-unknown/release/<name>.wasm
```

### `profile` — Gas profiling

No ETH required. Compares Rust vs Solidity gas costs and outputs a TCO breakdown.

```bash
stylus-toolkit profile
stylus-toolkit profile --network arbitrum-sepolia
stylus-toolkit profile --export json
stylus-toolkit profile --export csv
stylus-toolkit profile --export html

Options:
  -c, --contract <name>   Contract name (auto-detected if only one exists)
  -n, --network <name>    local | arbitrum-sepolia | arbitrum-one
  -r, --rpc <url>         Custom RPC endpoint
  --export <format>       json | csv | html
  --detailed              Show extended function breakdown
```

Results are saved to `.stylus-toolkit/results/` on every run. The dashboard reads from this folder.

### `dashboard` — Analytics web UI

```bash
stylus-toolkit dashboard
stylus-toolkit dashboard --port 5000
```

Opens a local web server (default port 3000) with:

- **Stats cards** — total profiles run, average TCO savings, max savings recorded, contracts tracked
- **TCO trend chart** — Rust vs Solidity cost over time (line chart)
- **Savings chart** — percentage savings per contract per run (bar chart)
- **Cost breakdown** — deployment vs execution split for the latest run

All data is local. Nothing is sent anywhere.

### `dev` — Local Stylus node

Requires Docker.

```bash
stylus-toolkit dev             # Foreground, streams logs
stylus-toolkit dev --detach    # Background, shows connection details
stylus-toolkit dev --port 9000 # Custom port (default: 8547)
```

On `--detach`, the node starts, health-checks until ready, then prints:

```
RPC URL:   http://localhost:8547
Chain ID:  412346
WebSocket: ws://localhost:8548

Pre-Funded Test Accounts:

Account 1 (Developer):
  Address:     0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E
  Private Key: 0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659
  Balance:     10,000 ETH

Account 2 (Tester):
  Address:     0x1111111111111111111111111111111111111111
  Private Key: 0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61
  Balance:     10,000 ETH
```

Manage the node:

```bash
docker logs -f nitro-testnode   # View logs
docker stop nitro-testnode      # Stop node
docker ps | grep nitro-testnode # Check status
```

### `deploy` — Deploy to any network

```bash
stylus-toolkit deploy --estimate-only                            # Gas estimate, no key needed
stylus-toolkit deploy --network local --private-key-path key.txt
stylus-toolkit deploy --network arbitrum-sepolia --private-key-path key.txt

Options:
  -n, --network <name>         local | arbitrum-sepolia | arbitrum-one
  --private-key <key>          Private key directly (use key file for safety)
  --private-key-path <path>    Path to file containing private key
  --estimate-only              Print gas estimate and exit, no deployment
  --gas-limit <amount>         Override automatic gas limit
```

Quick deploy to local node:

```bash
echo "0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659" > key.txt
stylus-toolkit deploy --network local --private-key-path key.txt
```

### `config` — Settings

```bash
stylus-toolkit config --list                                 # Show all settings and networks
stylus-toolkit config --get defaultNetwork                   # Read one value
stylus-toolkit config --set defaultNetwork=arbitrum-sepolia  # Update a value
stylus-toolkit config --reset                                # Reset to defaults
```

---

## Gas savings reference

These numbers come from profiling the included templates:

| Operation | Solidity | Rust (Stylus) | Savings |
|---|---|---|---|
| Read | 6,000 gas | 5,000 gas | **16.7%** |
| Write | 20,000 gas | 12,000 gas | **40.0%** |
| Compute | 15,000 gas | 8,000 gas | **46.7%** |
| Oracle | 103,000 gas | 75,000 gas | **27.2%** |
| **Average** | | | **32.6%** |

Full TCO savings (deployment + 100 calls per function): **26–28%**

TCO accounts for Stylus activation overhead on deployment. After ~50 calls the execution savings outweigh the deployment cost.

---

## Project structure

```
my-project/
├── contracts-rust/
│   ├── Cargo.toml              # Pinned dependencies
│   └── src/lib.rs              # Stylus contract in Rust
├── contracts-solidity/
│   └── Contract.sol            # Equivalent Solidity (used for gas comparison)
├── .stylus-toolkit/
│   └── results/                # All profiling runs, read by dashboard
└── gas-profile-*.json          # Latest export
```

---

## Networks

| Network | RPC | Chain ID |
|---|---|---|
| local | http://localhost:8547 | 412346 |
| arbitrum-sepolia | https://sepolia-rollup.arbitrum.io/rpc | 421614 |
| arbitrum-one | https://arb1.arbitrum.io/rpc | 42161 |

```bash
# Switch default network
stylus-toolkit config --set defaultNetwork=arbitrum-sepolia

# Or pass per-command
stylus-toolkit profile --network arbitrum-one
```

---

## Documentation

| File | Contents |
|---|---|
| [QUICKSTART.md](./QUICKSTART.md) | Full walkthrough from install to deployment |
| [CHEATSHEET.md](./CHEATSHEET.md) | All commands on one page |
| [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) | Deployment options and troubleshooting |

---

## Video tutorials

1. **[Install & first gas profile](https://youtu.be/haz-cPzYbvw?si=AP4748eUh3gISZai)** — From `npm install` to profiling results (5 min)
2. **[Local testnet + deployment](https://youtu.be/PmF2ysuj0-w?si=HMbdXs2YpMFLKykc)** — Start a node, use pre-funded accounts, deploy (7 min)
3. **[Analytics dashboard](https://youtu.be/2PYyX0dmtZM?si=JHXjXma8CHruhg22)** — Track gas savings across runs, export reports (5 min)

---

## Community

- **Discord** — [Join the community](https://discord.gg/rMAZ8ngSsb)
- **YouTube** — [@StylusToolkit](https://www.youtube.com/@StylusToolkit)
- **GitHub Issues** — [Bug reports and feature requests](https://github.com/soloking1412/stylus-toolkit/issues)
- **GitHub Discussions** — [Q&A, showcases, help](https://github.com/soloking1412/stylus-toolkit/discussions)
- **Twitter** — [@lord_soloking](https://twitter.com/lord_soloking)
- **Telegram** — [@maheswar1412](https://t.me/maheswar1412)

---

## Contributing

```bash
git clone https://github.com/soloking1412/stylus-toolkit.git
cd stylus-toolkit
npm install
npm run build
npm link
```

Submit PRs against `main`. Run `npm run build` before pushing — CI checks for TypeScript errors.

---

## License

MIT — see [LICENSE](LICENSE)

---

[NPM](https://www.npmjs.com/package/stylus-toolkit) · [GitHub](https://github.com/soloking1412/stylus-toolkit) · [Arbitrum Stylus Docs](https://docs.arbitrum.io/stylus/stylus-gentle-introduction) · [Stylus SDK](https://github.com/OffchainLabs/stylus-sdk-rs)
