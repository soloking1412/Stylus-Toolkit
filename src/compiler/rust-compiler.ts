import execa from 'execa';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger';
import { FileSystem } from '../utils/file-system';
import { CompilationResult } from '../types';

export class RustCompiler {
  private projectPath: string;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || FileSystem.getProjectRoot();
  }

  async compile(contractPath?: string): Promise<CompilationResult> {
    const startTime = Date.now();

    try {
      const rustProjectPath = contractPath
        ? path.dirname(contractPath)
        : path.join(this.projectPath, 'contracts-rust');

      if (!(await FileSystem.fileExists(rustProjectPath))) {
        throw new Error(`Rust project not found at ${rustProjectPath}`);
      }

      logger.startSpinner('Compiling Rust contract...');

      const cargoCheck = await this.checkCargoInstalled();
      if (!cargoCheck) {
        throw new Error('Cargo is not installed. Please install Rust and Cargo.');
      }

      const wasmTargetInstalled = await this.checkWasmTarget();
      if (!wasmTargetInstalled) {
        logger.updateSpinner('Installing wasm32-unknown-unknown target...');
        await execa('rustup', ['target', 'add', 'wasm32-unknown-unknown']);
      }

      logger.updateSpinner('Building WASM binary...');

      const { stderr } = await execa(
        'cargo',
        [
          'build',
          '--release',
          '--target',
          'wasm32-unknown-unknown',
          '--lib',
        ],
        {
          cwd: rustProjectPath,
          env: {
            ...process.env,
            RUSTFLAGS: '-C opt-level=z -C link-arg=-s',
          },
        }
      );

      const wasmPath = path.join(
        rustProjectPath,
        'target',
        'wasm32-unknown-unknown',
        'release'
      );

      const contractName = await this.getContractName(rustProjectPath);
      const wasmFileName = `${contractName.replace(/-/g, '_')}.wasm`;
      const wasmFilePath = path.join(wasmPath, wasmFileName);

      if (!(await FileSystem.fileExists(wasmFilePath))) {
        throw new Error(`WASM file not found at ${wasmFilePath}`);
      }

      const wasmBinary = await fs.readFile(wasmFilePath);
      const wasmSizeKb = wasmBinary.length / 1024;

      logger.updateSpinner('Running cargo-stylus check...');

      try {
        await execa('cargo', ['stylus', 'check'], {
          cwd: rustProjectPath,
        });
      } catch (error) {
        logger.warn('cargo-stylus not installed. Skipping Stylus-specific checks.');
      }

      const compilationTime = Date.now() - startTime;

      logger.succeedSpinner(
        `Rust compilation successful (${(compilationTime / 1000).toFixed(2)}s)`
      );

      const warnings = this.extractWarnings(stderr);

      return {
        success: true,
        language: 'rust',
        contractName,
        bytecode: wasmBinary.toString('hex'),
        wasmSize: wasmBinary.length,
        bytecodeSizeKb: wasmSizeKb,
        compilationTime,
        warnings,
      };
    } catch (error) {
      const compilationTime = Date.now() - startTime;
      logger.failSpinner('Rust compilation failed');

      return {
        success: false,
        language: 'rust',
        contractName: 'unknown',
        bytecode: '',
        bytecodeSizeKb: 0,
        compilationTime,
        errors: [(error as Error).message],
      };
    }
  }

  private async checkCargoInstalled(): Promise<boolean> {
    try {
      await execa('cargo', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  private async checkWasmTarget(): Promise<boolean> {
    try {
      const { stdout } = await execa('rustup', ['target', 'list', '--installed']);
      return stdout.includes('wasm32-unknown-unknown');
    } catch {
      return false;
    }
  }

  private async getContractName(projectPath: string): Promise<string> {
    const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
    const cargoToml = await FileSystem.readFile(cargoTomlPath);

    const nameMatch = cargoToml.match(/name\s*=\s*"([^"]+)"/);
    return nameMatch ? nameMatch[1] : 'contract';
  }

  private extractWarnings(stderr: string): string[] {
    const warnings: string[] = [];
    const warningRegex = /warning: (.+)/g;
    let match;

    while ((match = warningRegex.exec(stderr)) !== null) {
      warnings.push(match[1]);
    }

    return warnings;
  }

  async optimize(wasmPath: string): Promise<void> {
    try {
      const { stdout } = await execa('wasm-opt', ['--version']);
      logger.info(`Using wasm-opt: ${stdout.split('\n')[0]}`);

      await execa('wasm-opt', ['-Oz', wasmPath, '-o', wasmPath]);

      logger.success('WASM optimization complete');
    } catch {
      logger.warn('wasm-opt not found. Install binaryen for optimization.');
    }
  }
}
