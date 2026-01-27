# Stylus Project - basic

## Overview

This project was generated using the Stylus Toolkit CLI.

### Rust (Stylus)

Location: `contracts-rust/src/lib.rs`

### Solidity

Location: `contracts-solidity/`


## Quick Start

### Profile Gas Usage

Compare gas usage between Rust and Solidity implementations:

```bash
stylus-toolkit profile
```

### Compile Contracts

#### Rust (Stylus)
```bash
cd contracts-rust
cargo build --release --target wasm32-unknown-unknown
```

#### Solidity
```bash
cd contracts-solidity
forge build
```


## Documentation

- [Stylus Documentation](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- [Stylus SDK](https://github.com/OffchainLabs/stylus-sdk-rs)

## License

MIT
