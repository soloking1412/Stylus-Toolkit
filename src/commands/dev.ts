import { logger } from '../utils/logger';
import execa from 'execa';
import chalk from 'chalk';

interface DevOptions {
  port?: string;
  detach?: boolean;
}

export async function devCommand(options: DevOptions): Promise<void> {
  logger.header('Stylus Toolkit - Local Development Node');

  const port = options.port || '8547';

  try {
    // Check if Docker is installed
    logger.startSpinner('Checking Docker installation...');

    try {
      await execa('docker', ['--version']);
      logger.succeedSpinner('Docker is installed');
    } catch {
      logger.failSpinner('Docker not found');
      logger.newLine();
      logger.warn('Docker is not installed on your system');
      logger.newLine();
      logger.section('Alternative Options');
      logger.newLine();

      logger.info(chalk.bold('Option 1: Install Docker (Recommended)'));
      logger.info('  • macOS: brew install --cask docker');
      logger.info('  • Windows: Download from https://www.docker.com/get-started');
      logger.info('  • Linux: https://docs.docker.com/engine/install/');
      logger.newLine();

      logger.info(chalk.bold('Option 2: Use Arbitrum Sepolia Testnet (No Docker needed!)'));
      logger.info('  • Get testnet ETH: https://faucet.quicknode.com/arbitrum/sepolia');
      logger.info('  • Configure toolkit:');
      logger.info(chalk.cyan('    stylus-toolkit config --set defaultNetwork=arbitrum-sepolia'));
      logger.info('  • Deploy and test:');
      logger.info(chalk.cyan('    cd contracts-rust'));
      logger.info(chalk.cyan('    cargo stylus deploy --private-key-path=./key.txt'));
      logger.newLine();

      logger.info(chalk.bold('Option 3: Use Custom RPC'));
      logger.info('  • Alchemy: https://www.alchemy.com/');
      logger.info('  • Infura: https://infura.io/');
      logger.info('  • QuickNode: https://www.quicknode.com/');
      logger.info('  • Configure: stylus-toolkit config --set networks.custom.rpcUrl=<url>');
      logger.newLine();

      logger.success('You can develop and test without Docker using testnets!');
      process.exit(0);
    }

    logger.newLine();
    logger.section('Starting Local Stylus Node');
    logger.info(`Port: ${port}`);
    logger.info('Network: Local Arbitrum Stylus');
    logger.newLine();

    // Check if nitro-testnode is already running
    logger.startSpinner('Checking for existing node...');

    try {
      const { stdout } = await execa('docker', ['ps', '--filter', 'name=nitro-testnode', '--format', '{{.Names}}']);

      if (stdout.includes('nitro-testnode')) {
        logger.updateSpinner('Stopping existing node...');
        await execa('docker', ['stop', 'nitro-testnode']);
        await execa('docker', ['rm', 'nitro-testnode']);
      }

      logger.succeedSpinner('Ready to start new node');
    } catch (error) {
      logger.updateSpinner('No existing node found');
    }

    logger.newLine();
    logger.startSpinner('Pulling Arbitrum Nitro testnode image...');

    try {
      await execa('docker', ['pull', 'offchainlabs/nitro-node:v3.7.1-926f1ab'], {
        stdio: 'pipe',
      });
      logger.succeedSpinner('Image pulled successfully');
    } catch (error) {
      logger.failSpinner('Failed to pull image');
      logger.warn('Continuing with existing image...');
    }

    logger.newLine();
    logger.info('Starting local Arbitrum Stylus node...');
    logger.info(chalk.dim('This may take a few minutes on first run...'));
    logger.newLine();

    const dockerArgs = [
      'run',
      '--rm',
      '--name', 'nitro-testnode',
      '-p', `${port}:8547`,
      '-p', '8548:8548',
      'offchainlabs/nitro-node:v3.7.1-926f1ab',
      '--init.dev-init',
      '--init.dev-init-address', '0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E',
      '--node.dangerous.no-l1-listener',
      '--parent-chain.id=1337',
      '--chain.id=412346',
      '--http.api=net,web3,eth,debug',
      '--http.corsdomain=*',
      '--http.addr=0.0.0.0',
      '--http.vhosts=*',
    ];

    if (options.detach) {
      dockerArgs.splice(1, 0, '-d');

      logger.startSpinner('Starting node in background...');

      await execa('docker', dockerArgs);

      logger.succeedSpinner('Node started in background');
      logger.newLine();
      logger.success('Local Stylus node is running!');
      logger.newLine();

      logger.section('Connection Details');
      logger.table({
        'RPC URL': `http://localhost:${port}`,
        'Chain ID': '412346',
        'WebSocket': `ws://localhost:8548`,
        'Container': 'nitro-testnode',
      });

      logger.newLine();
      logger.section('Useful Commands');
      logger.info(`• View logs:    docker logs -f nitro-testnode`);
      logger.info(`• Stop node:    docker stop nitro-testnode`);
      logger.info(`• Node status:  docker ps | grep nitro-testnode`);
      logger.newLine();

      logger.section('Development Account');
      logger.info('Address: 0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E');
      logger.info('Private Key: Available in node logs');
      logger.newLine();

      logger.info(chalk.green('You can now deploy and test your Stylus contracts!'));
      logger.info(`Try: ${chalk.cyan('stylus-toolkit profile --contract <name>')}`);

    } else {
      logger.info(chalk.yellow('Starting node in foreground mode...'));
      logger.info(chalk.dim('Press Ctrl+C to stop the node'));
      logger.newLine();

      logger.section('Connection Details');
      logger.table({
        'RPC URL': `http://localhost:${port}`,
        'Chain ID': '412346',
        'WebSocket': `ws://localhost:8548`,
      });
      logger.newLine();

      // Run in foreground - this will block
      const nodeProcess = execa('docker', dockerArgs);

      // Stream output to console
      if (nodeProcess.stdout) {
        nodeProcess.stdout.pipe(process.stdout);
      }
      if (nodeProcess.stderr) {
        nodeProcess.stderr.pipe(process.stderr);
      }

      // Handle Ctrl+C
      process.on('SIGINT', async () => {
        logger.newLine();
        logger.info('Stopping node...');

        try {
          await execa('docker', ['stop', 'nitro-testnode']);
          logger.success('Node stopped successfully');
        } catch {
          // Node already stopped
        }

        process.exit(0);
      });

      await nodeProcess;
    }

  } catch (error) {
    logger.newLine();
    logger.error(`Failed to start development node: ${(error as Error).message}`);

    logger.newLine();
    logger.section('Troubleshooting');
    logger.info('1. Ensure Docker is running');
    logger.info('2. Check port availability: lsof -i :' + port);
    logger.info('3. Try a different port: stylus-toolkit dev --port 8548');
    logger.info('4. Check Docker logs: docker logs nitro-testnode');

    process.exit(1);
  }
}
