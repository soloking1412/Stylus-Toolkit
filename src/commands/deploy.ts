import { logger } from '../utils/logger';
import { FileSystem } from '../utils/file-system';
import { GasEstimator } from '../utils/gas-estimator';
import { NETWORK_CONFIGS } from '../config/constants';
import path from 'path';
import execa from 'execa';
import chalk from 'chalk';

interface DeployOptions {
  network?: string;
  privateKey?: string;
  privateKeyPath?: string;
  rpc?: string;
  gasLimit?: string;
  estimateOnly?: boolean;
  noActivate?: boolean;
}

export async function deployCommand(options: DeployOptions): Promise<void> {
  logger.header('Stylus Toolkit - Deploy Contract');

  try {
    const projectRoot = FileSystem.getProjectRoot();
    const rustProjectPath = path.join(projectRoot, 'contracts-rust');

    // Check if Rust project exists
    if (!(await FileSystem.fileExists(rustProjectPath))) {
      logger.error('Rust project not found. Run "stylus-toolkit init" first.');
      process.exit(1);
    }

    // Check if cargo-stylus is installed
    logger.startSpinner('Checking cargo-stylus installation...');
    try {
      await execa('cargo', ['stylus', '--version']);
      logger.succeedSpinner('cargo-stylus is installed');
    } catch {
      logger.failSpinner('cargo-stylus not installed');
      logger.error('cargo-stylus is required for deployment.');
      logger.info('Install with: cargo install cargo-stylus');
      process.exit(1);
    }

    const network = options.network || 'local';
    let rpcUrl = options.rpc;

    if (!rpcUrl) {
      const networkKey = network === 'arbitrum-mainnet' ? 'arbitrum-one' : network;
      const networkConfig = NETWORK_CONFIGS[networkKey as keyof typeof NETWORK_CONFIGS];
      rpcUrl = networkConfig?.rpc || 'http://localhost:8547';
    }

    logger.newLine();
    logger.section('Deployment Configuration');
    logger.table({
      'Network': network,
      'RPC URL': rpcUrl,
      'Private Key': options.privateKeyPath ? `From file: ${options.privateKeyPath}` :
                     options.privateKey ? 'Provided via --private-key' : 'Not provided',
    });
    logger.newLine();

    // Validate private key (not required for estimate-only mode)
    if (!options.estimateOnly && !options.privateKey && !options.privateKeyPath) {
      logger.error('Private key is required for deployment.');
      logger.info('Options:');
      logger.info('  1. Use --private-key-path=<path> (recommended)');
      logger.info('  2. Use --private-key=<key> (not recommended for production)');
      logger.info('');
      logger.warn('For testnet, create a key.txt file with your private key:');
      logger.info('  echo "0xyourprivatekey" > key.txt');
      logger.info('  stylus-toolkit deploy --private-key-path=./key.txt --network arbitrum-sepolia');
      logger.info('');
      logger.info('To only estimate gas (no key needed):');
      logger.info('  stylus-toolkit deploy --estimate-only');
      process.exit(1);
    }

    // Get contract name and WASM path
    const cargoTomlPath = path.join(rustProjectPath, 'Cargo.toml');
    const cargoToml = await FileSystem.readFile(cargoTomlPath);
    const nameMatch = cargoToml.match(/name\s*=\s*"([^"]+)"/);
    const contractName = nameMatch ? nameMatch[1] : 'contract';

    const wasmPath = path.join(
      rustProjectPath,
      'target',
      'wasm32-unknown-unknown',
      'release'
    );
    const wasmFileName = `${contractName.replace(/-/g, '_')}.wasm`;
    const wasmFilePath = path.join(wasmPath, wasmFileName);

    // Check if WASM file exists
    if (!(await FileSystem.fileExists(wasmFilePath))) {
      logger.error('WASM file not found. Build the contract first.');
      logger.info('Run: stylus-toolkit build');
      process.exit(1);
    }

    // Show WASM size
    const fs = await import('fs-extra');
    const wasmBinary = await fs.readFile(wasmFilePath);
    const wasmSizeKb = (wasmBinary.length / 1024).toFixed(2);

    logger.section('Contract Information');
    logger.table({
      'Contract Name': contractName,
      'WASM Size': `${wasmSizeKb} KB`,
      'WASM Path': wasmFilePath,
    });
    logger.newLine();

    // Estimate gas if not provided
    let gasLimit = options.gasLimit;

    if (!gasLimit) {
      logger.startSpinner('Calculating gas requirements...');

      // Calculate gas based on WASM size
      // Stylus deployment formula:
      // - Base transaction: 21,000 gas
      // - Activation overhead: ~14,000,000 gas (first deployment)
      // - Per-byte storage: ~16 gas per compressed byte
      // - For safety, we use a generous multiplier

      const wasmSizeBytes = wasmBinary.length;

      const estimatedGas = GasEstimator.estimateDeploymentGas(
        wasmSizeBytes,
        'rust',
        2.5
      );

      gasLimit = estimatedGas.toString();

      logger.succeedSpinner(
        `Gas calculated: ${estimatedGas.toLocaleString()} (WASM: ${wasmSizeKb} KB, informational)`
      );
    }

    if (options.estimateOnly) {
      logger.success('Gas estimation complete!');
      logger.info(`Estimated gas: ${parseInt(gasLimit!).toLocaleString()} (informational — cargo-stylus handles gas automatically)`);
      return;
    }

    // Deploy the contract
    logger.newLine();
    logger.section('Deploying Contract');
    logger.startSpinner('Sending deployment transaction...');

    try {
      const deployArgs = [
        'stylus',
        'deploy',
        '--endpoint',
        rpcUrl,
      ];

      if (options.privateKeyPath) {
        // Resolve to absolute so cargo-stylus can find it regardless of cwd
        const absoluteKeyPath = path.resolve(process.cwd(), options.privateKeyPath);
        deployArgs.push('--private-key-path', absoluteKeyPath);
      } else if (options.privateKey) {
        deployArgs.push('--private-key', options.privateKey);
      }

      // Add no-activate flag if specified
      if (options.noActivate) {
        deployArgs.push('--no-activate');
      }

      const startTime = Date.now();

      const { stdout, stderr } = await execa('cargo', deployArgs, {
        cwd: rustProjectPath,
      });

      const deployTime = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.succeedSpinner(`Contract deployed successfully (${deployTime}s)`);

      // Parse deployment output
      const output = stdout + stderr;
      const addressMatch = output.match(/deployed\s+(?:at|to)[:\s]+(0x[a-fA-F0-9]{40})/i) ||
                          output.match(/contract[:\s]+(0x[a-fA-F0-9]{40})/i) ||
                          output.match(/(0x[a-fA-F0-9]{40})/);

      const txHashMatch = output.match(/transaction[:\s]+(0x[a-fA-F0-9]{64})/i) ||
                         output.match(/tx[:\s]+(0x[a-fA-F0-9]{64})/i);

      const gasUsedMatch = output.match(/gas\s+used[:\s]+(\d+)/i);

      logger.newLine();
      logger.section('Deployment Results');

      const results: Record<string, string> = {
        'Status': chalk.green('✓ Deployed'),
        'Network': network,
      };

      if (addressMatch) {
        results['Contract Address'] = chalk.cyan(addressMatch[1]);
      }

      if (txHashMatch) {
        results['Transaction Hash'] = chalk.dim(txHashMatch[1]);
      }

      if (gasUsedMatch) {
        results['Gas Used'] = parseInt(gasUsedMatch[1]).toLocaleString();
      }

      if (gasLimit) {
        results['Gas Limit'] = parseInt(gasLimit).toLocaleString();
      }

      logger.table(results);

      // Show explorer links for public networks
      if (addressMatch) {
        logger.newLine();
        logger.section('Explorer Links');

        if (network === 'arbitrum-sepolia') {
          logger.info(`Contract: https://sepolia.arbiscan.io/address/${addressMatch[1]}`);
          if (txHashMatch) {
            logger.info(`Transaction: https://sepolia.arbiscan.io/tx/${txHashMatch[1]}`);
          }
        } else if (network === 'arbitrum-one' || network === 'arbitrum-mainnet') {
          logger.info(`Contract: https://arbiscan.io/address/${addressMatch[1]}`);
          if (txHashMatch) {
            logger.info(`Transaction: https://arbiscan.io/tx/${txHashMatch[1]}`);
          }
        }
      }

      logger.newLine();
      logger.success('Deployment complete!');

      // Show next steps
      logger.newLine();
      logger.section('Next Steps');
      if (addressMatch) {
        logger.info('1. Interact with your contract using the address above');
        logger.info('2. Verify on explorer (if on public network)');
        logger.info(`3. Test with: cast call ${addressMatch[1]} "<function>" --rpc-url ${rpcUrl}`);
      } else {
        logger.info('1. Check deployment output above for contract address');
        logger.info('2. Verify the deployment on block explorer');
      }

    } catch (error) {
      logger.failSpinner('Deployment failed');

      const errorMessage = (error as Error).message;

      // Provide helpful error messages
      if (errorMessage.includes('insufficient funds')) {
        logger.error('Insufficient funds for deployment');
        logger.newLine();
        logger.section('Solutions');
        logger.info('1. Get testnet ETH from faucet:');
        logger.info('   • Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia');
        logger.info('   • Check your balance first');
        logger.info('');
        logger.info('2. Use a different account with sufficient balance');
      } else if (errorMessage.includes('out of gas') || errorMessage.includes('gas')) {
        logger.error('Transaction ran out of gas');
        logger.newLine();
        logger.section('Solutions');
        logger.info('1. The automatic gas estimation should prevent this.');
        logger.info('2. Try manually increasing gas limit:');
        logger.info(`   stylus-toolkit deploy --gas-limit=150000000 --private-key-path=${options.privateKeyPath || './key.txt'}`);
        logger.info('');
        logger.info('3. If error persists, there may be an issue with the contract code.');
      } else if (errorMessage.includes('nonce')) {
        logger.error('Nonce error (transaction ordering issue)');
        logger.info('Wait a few seconds and try again.');
      } else if (errorMessage.includes('connection')) {
        logger.error('Connection to RPC endpoint failed');
        logger.info(`Check if ${rpcUrl} is accessible`);
      } else {
        logger.error('Deployment error:');
        logger.info(errorMessage);
      }

      process.exit(1);
    }

  } catch (error) {
    logger.error(`Deployment failed: ${(error as Error).message}`);
    process.exit(1);
  }
}
