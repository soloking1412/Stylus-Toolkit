import path from 'path';
import { FileSystem } from '../utils/file-system';
import { TEMPLATES } from './templates';

export class TemplateGenerator {
  async generate(
    projectPath: string,
    templateName: string,
    hasRust: boolean,
    hasSolidity: boolean
  ): Promise<void> {
    const template = TEMPLATES[templateName] || TEMPLATES.basic;

    if (hasRust) {
      await this.generateRustFiles(projectPath, template);
    }

    if (hasSolidity) {
      await this.generateSolidityFiles(projectPath, template);
    }

    await this.generateCommonFiles(projectPath, templateName, hasRust, hasSolidity);
  }

  private async generateRustFiles(projectPath: string, template: any): Promise<void> {
    const rustContractPath = path.join(projectPath, 'contracts-rust', 'src', 'lib.rs');
    await FileSystem.writeFile(rustContractPath, template.rust);

    const cargoToml = path.join(projectPath, 'contracts-rust', 'Cargo.toml');
    await FileSystem.writeFile(cargoToml, this.generateCargoToml(template.name));
  }

  private async generateSolidityFiles(projectPath: string, template: any): Promise<void> {
    const solidityContractPath = path.join(
      projectPath,
      'contracts-solidity',
      `${template.name}.sol`
    );
    await FileSystem.writeFile(solidityContractPath, template.solidity);
  }

  private async generateCommonFiles(
    projectPath: string,
    templateName: string,
    hasRust: boolean,
    hasSolidity: boolean
  ): Promise<void> {
    const readme = this.generateReadme(templateName, hasRust, hasSolidity);
    await FileSystem.writeFile(path.join(projectPath, 'README.md'), readme);

    const gitignore = this.generateGitignore();
    await FileSystem.writeFile(path.join(projectPath, '.gitignore'), gitignore);

    const envExample = this.generateEnvExample();
    await FileSystem.writeFile(path.join(projectPath, '.env.example'), envExample);
  }

  private generateCargoToml(contractName: string): string {
    return `[package]
name = "${contractName.toLowerCase()}"
version = "0.1.0"
edition = "2021"

[dependencies]
stylus-sdk = "0.10.0"
alloy-primitives = "0.8.19"
alloy-sol-types = "0.8.19"

[dev-dependencies]
tokio = { version = "1.12.0", features = ["full"] }

[lib]
crate-type = ["lib", "cdylib"]

[profile.release]
codegen-units = 1
strip = true
lto = true
panic = "abort"
opt-level = "z"
`;
  }

  private generateReadme(
    templateName: string,
    hasRust: boolean,
    hasSolidity: boolean
  ): string {
    return `# Stylus Project - ${templateName}

## Overview

This project was generated using the Stylus Toolkit CLI.

${hasRust ? '### Rust (Stylus)\n\nLocation: \`contracts-rust/src/lib.rs\`\n' : ''}
${hasSolidity ? '### Solidity\n\nLocation: \`contracts-solidity/\`\n' : ''}

## Quick Start

### Profile Gas Usage

Compare gas usage between Rust and Solidity implementations:

\`\`\`bash
stylus-toolkit profile
\`\`\`

### Compile Contracts

${hasRust ? '#### Rust (Stylus)\n\`\`\`bash\ncd contracts-rust\ncargo build --release --target wasm32-unknown-unknown\n\`\`\`\n' : ''}
${hasSolidity ? '#### Solidity\n\`\`\`bash\ncd contracts-solidity\nforge build\n\`\`\`\n' : ''}

## Documentation

- [Stylus Documentation](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- [Stylus SDK](https://github.com/OffchainLabs/stylus-sdk-rs)

## License

MIT
`;
  }

  private generateGitignore(): string {
    return `# Rust
target/
Cargo.lock

# Solidity
out/
cache/

# Environment
.env

# Results
.stylus-toolkit/results/

# Node
node_modules/

# IDE
.vscode/
.idea/
`;
  }

  private generateEnvExample(): string {
    return `# RPC Configuration
RPC_URL=http://localhost:8547

# Private key for deployment (DO NOT commit actual private key)
PRIVATE_KEY=

# Network
NETWORK=local
`;
  }
}
