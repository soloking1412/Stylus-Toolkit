import { logger } from '../utils/logger';
import { FileSystem } from '../utils/file-system';
import path from 'path';
import execa from 'execa';

interface BuildOptions {
  rustOnly?: boolean;
  release?: boolean;
  check?: boolean;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  logger.header('Stylus Toolkit - Build Contracts');

  try {
    const projectRoot = FileSystem.getProjectRoot();
    const rustProjectPath = path.join(projectRoot, 'contracts-rust');

    // Check if Rust project exists
    if (!(await FileSystem.fileExists(rustProjectPath))) {
      logger.error('Rust project not found. Run "stylus-toolkit init" first.');
      process.exit(1);
    }

    logger.section('Building Stylus Contract');
    logger.info(`Project: ${path.basename(projectRoot)}`);
    logger.newLine();

    // Build Rust contract
    logger.startSpinner('Compiling Rust to WASM...');

    const startTime = Date.now();

    try {
      // Check if cargo is installed
      try {
        await execa('cargo', ['--version']);
      } catch {
        logger.failSpinner('Cargo not found');
        logger.error('Rust and Cargo must be installed.');
        logger.info('Install from: https://rustup.rs/');
        process.exit(1);
      }

      // Check if wasm32 target is installed
      try {
        const { stdout } = await execa('rustup', ['target', 'list', '--installed'], {
          cwd: rustProjectPath,
        });

        if (!stdout.includes('wasm32-unknown-unknown')) {
          logger.updateSpinner('Installing wasm32-unknown-unknown target...');
          await execa('rustup', ['target', 'add', 'wasm32-unknown-unknown'], {
            cwd: rustProjectPath,
          });
        }
      } catch (error) {
        logger.failSpinner('Failed to check/install wasm32 target');
        logger.error((error as Error).message);
        process.exit(1);
      }

      // Build the contract
      logger.updateSpinner('Building WASM binary...');

      const buildArgs = [
        'build',
        '--target',
        'wasm32-unknown-unknown',
        '--lib',
      ];

      if (options.release !== false) {
        buildArgs.push('--release');
      }

      await execa('cargo', buildArgs, {
        cwd: rustProjectPath,
        env: {
          ...process.env,
          RUSTFLAGS: '-C opt-level=z -C link-arg=-s',
        },
      });

      const buildTime = Date.now() - startTime;

      logger.succeedSpinner(`Build successful (${(buildTime / 1000).toFixed(2)}s)`);

      // Get contract name and WASM path
      const cargoTomlPath = path.join(rustProjectPath, 'Cargo.toml');
      const cargoToml = await FileSystem.readFile(cargoTomlPath);
      const nameMatch = cargoToml.match(/name\s*=\s*"([^"]+)"/);
      const contractName = nameMatch ? nameMatch[1] : 'contract';

      const wasmDir = options.release !== false ? 'release' : 'debug';
      const wasmPath = path.join(
        rustProjectPath,
        'target',
        'wasm32-unknown-unknown',
        wasmDir
      );
      const wasmFileName = `${contractName.replace(/-/g, '_')}.wasm`;
      const wasmFilePath = path.join(wasmPath, wasmFileName);

      // Check if WASM file exists
      if (await FileSystem.fileExists(wasmFilePath)) {
        const fs = await import('fs-extra');
        const wasmBinary = await fs.readFile(wasmFilePath);
        const wasmSizeKb = (wasmBinary.length / 1024).toFixed(2);

        logger.newLine();
        logger.section('Build Output');
        logger.table({
          'Contract Name': contractName,
          'WASM Size': `${wasmSizeKb} KB`,
          'Build Mode': options.release !== false ? 'Release' : 'Debug',
          'Output Path': wasmFilePath,
        });
      }

      // Run cargo stylus check if available
      if (options.check !== false && await FileSystem.fileExists(wasmFilePath)) {
        logger.newLine();
        logger.section('Stylus Verification');

        try {
          logger.startSpinner('Running cargo stylus check...');

          // Use --wasm-file to avoid Stylus.toml requirement
          await execa('cargo', [
            'stylus',
            'check',
            '--wasm-file',
            wasmFilePath,
            '--endpoint',
            'http://localhost:8547'
          ], {
            cwd: rustProjectPath,
            timeout: 10000, // 10 second timeout
          });

          logger.succeedSpinner('Stylus check passed');
        } catch (error) {
          const errorMessage = (error as Error).message;
          if (errorMessage.includes('no such command')) {
            logger.failSpinner('cargo-stylus not installed');
            logger.warn('cargo-stylus not found. Skipping Stylus-specific checks.');
            logger.info('Install with: cargo install cargo-stylus');
          } else if (errorMessage.includes('Connection refused') || errorMessage.includes('timed out')) {
            logger.succeedSpinner('WASM built successfully (local node unavailable)');
            logger.info('To verify contract: cargo stylus check --wasm-file ' + wasmFilePath);
          } else {
            logger.failSpinner('Stylus check failed');
            logger.warn('Contract may not be compatible with Stylus.');
            logger.info('Run "cargo stylus check --wasm-file ' + wasmFilePath + '" for details.');
          }
        }
      }

      logger.newLine();
      logger.success('Build complete!');

      // Show next steps
      logger.newLine();
      logger.section('Next Steps');
      logger.info('1. Test your contract: cargo test (inside contracts-rust/)');
      logger.info('2. Deploy to testnet: cargo stylus deploy --private-key-path=<path>');
      logger.info('3. Profile gas usage: stylus-toolkit profile');
    } catch (error) {
      logger.failSpinner('Build failed');
      logger.error((error as Error).message);

      // Show helpful error messages
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('wasm32-unknown-unknown')) {
        logger.newLine();
        logger.info('Fix: Install wasm32 target');
        logger.info('  cd contracts-rust');
        logger.info('  rustup target add wasm32-unknown-unknown');
      }

      process.exit(1);
    }
  } catch (error) {
    logger.error(`Build failed: ${(error as Error).message}`);
    process.exit(1);
  }
}
