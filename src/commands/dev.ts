import { logger } from '../utils/logger';
import { DEFAULT_DOCKER_IMAGE, DEFAULT_RPC_PORT, DEFAULT_CHAIN_ID } from '../config/constants';
import execa from 'execa';
import chalk from 'chalk';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

interface DevOptions {
  port?: string;
  detach?: boolean;
}

const PROXY_PID_FILE = path.join(os.tmpdir(), 'stylus-rpc-proxy.pid');
const PROXY_SCRIPT_FILE = path.join(os.tmpdir(), 'stylus-rpc-proxy.js');

function buildProxyScript(containerName: string, containerPort: number, listenPort: number): string {
  return `
const http = require('http');
const { spawn } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const curl = spawn('docker', [
      'exec', '-i', '${containerName}',
      'curl', '-s', '-X', 'POST',
      'http://127.0.0.1:${containerPort}',
      '-H', 'Content-Type: application/json',
      '--data-binary', '@-'
    ]);
    curl.stdin.write(body);
    curl.stdin.end();
    const out = [];
    curl.stdout.on('data', d => out.push(d));
    curl.stderr.on('data', () => {});
    curl.on('close', (code) => {
      if (code !== 0 || out.length === 0) {
        res.statusCode = 503;
        res.end('{"jsonrpc":"2.0","error":{"code":-32603,"message":"Node unavailable"},"id":null}');
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(Buffer.concat(out));
    });
  });
});

server.listen(${listenPort}, '0.0.0.0', () => {
  process.send && process.send('ready');
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
`;
}

async function killExistingProxy(): Promise<void> {
  try {
    if (await fs.pathExists(PROXY_PID_FILE)) {
      const pid = parseInt(await fs.readFile(PROXY_PID_FILE, 'utf8'));
      try { process.kill(pid, 'SIGTERM'); } catch { /* already dead */ }
      await fs.remove(PROXY_PID_FILE);
    }
  } catch { /* ignore */ }
}

async function startRpcProxy(containerName: string, containerPort: number, listenPort: number): Promise<void> {
  await killExistingProxy();

  const proxyCode = buildProxyScript(containerName, containerPort, listenPort);
  await fs.writeFile(PROXY_SCRIPT_FILE, proxyCode);

  const proxyProcess = spawn('node', [PROXY_SCRIPT_FILE], {
    detached: true,
    stdio: 'ignore',
  });
  proxyProcess.unref();

  await fs.writeFile(PROXY_PID_FILE, proxyProcess.pid!.toString());

  // Wait for proxy to be ready
  await new Promise(r => setTimeout(r, 800));
}

async function waitForNodeReady(port: string): Promise<boolean> {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      });
      if (response.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  return false;
}

export async function devCommand(options: DevOptions): Promise<void> {
  logger.header('Stylus Toolkit - Local Development Node');

  const port = options.port || DEFAULT_RPC_PORT.toString();
  const containerPort = 8547;

  try {
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
      logger.info(chalk.bold('Option 2: Use Arbitrum Sepolia Testnet (No Docker needed)'));
      logger.info('  • Get testnet ETH: https://faucet.quicknode.com/arbitrum/sepolia');
      logger.info(chalk.cyan('    stylus-toolkit config --set defaultNetwork=arbitrum-sepolia'));
      logger.info(chalk.cyan('    stylus-toolkit deploy --network arbitrum-sepolia --private-key-path ./key.txt'));
      logger.newLine();
      logger.success('You can develop and test without Docker using testnets!');
      process.exit(0);
    }

    logger.newLine();
    logger.section('Starting Local Stylus Node');
    logger.info(`Port: ${port}`);
    logger.info('Network: Local Arbitrum Stylus');
    logger.newLine();

    // Stop any existing node + proxy
    logger.startSpinner('Checking for existing node...');
    try {
      const { stdout } = await execa('docker', ['ps', '--filter', 'name=nitro-testnode', '--format', '{{.Names}}']);
      if (stdout.includes('nitro-testnode')) {
        logger.updateSpinner('Stopping existing node...');
        await execa('docker', ['stop', 'nitro-testnode']);
      }
      logger.succeedSpinner('Ready to start new node');
    } catch {
      logger.succeedSpinner('Ready to start new node');
    }
    await killExistingProxy();

    logger.newLine();
    logger.startSpinner('Pulling Arbitrum Nitro testnode image...');
    try {
      await execa('docker', ['pull', DEFAULT_DOCKER_IMAGE], { stdio: 'pipe' });
      logger.succeedSpinner('Image pulled successfully');
    } catch {
      logger.failSpinner('Failed to pull image');
      logger.warn('Continuing with existing image...');
    }

    logger.newLine();
    logger.info('Starting local Arbitrum Stylus node...');
    logger.info(chalk.dim('This may take a few minutes on first run...'));
    logger.newLine();

    // No -p port mapping — proxy handles host:port → container:8547
    const dockerArgs = [
      'run',
      '--rm',
      '--name', 'nitro-testnode',
      DEFAULT_DOCKER_IMAGE,
      '--dev',
      '--http.addr', '0.0.0.0',
      '--http.port', containerPort.toString(),
      '--http.corsdomain', '*',
      '--http.api', 'eth,net,web3,arb,debug',
    ];

    if (options.detach) {
      dockerArgs.splice(1, 0, '-d');

      logger.startSpinner('Starting node in background...');
      await execa('docker', dockerArgs);
      logger.succeedSpinner('Node started in background');
      logger.newLine();

      logger.startSpinner('Starting RPC proxy...');
      await startRpcProxy('nitro-testnode', containerPort, parseInt(port));
      logger.succeedSpinner(`RPC proxy running on http://localhost:${port}`);
      logger.newLine();

      logger.startSpinner('Waiting for node to be ready...');
      const ready = await waitForNodeReady(port);

      if (ready) {
        logger.succeedSpinner('Node is ready!');
      } else {
        logger.failSpinner('Node may not be fully ready yet');
        logger.warn('You may need to wait a few more seconds before connecting');
      }

      logger.newLine();
      logger.section('Connection Details');
      logger.table({
        'RPC URL': `http://localhost:${port}`,
        'Chain ID': DEFAULT_CHAIN_ID.toString(),
        'Container': 'nitro-testnode',
      });

      logger.newLine();
      logger.section('Useful Commands');
      logger.info(`• View logs:    docker logs -f nitro-testnode`);
      logger.info(`• Stop node:    docker stop nitro-testnode`);
      logger.info(`• Node status:  docker ps | grep nitro-testnode`);
      logger.newLine();

      logger.section('Pre-Funded Test Accounts');
      logger.info(chalk.bold('Account 1 (Developer):'));
      logger.info('  Address:     0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E');
      logger.info('  Private Key: 0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659');
      logger.info('  Balance:     10,000 ETH (pre-funded)');
      logger.newLine();
      logger.info(chalk.bold('Account 2 (Tester):'));
      logger.info('  Address:     0x1111111111111111111111111111111111111111');
      logger.info('  Private Key: 0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61');
      logger.info('  Balance:     10,000 ETH (pre-funded)');
      logger.newLine();

      logger.section('Quick Deploy');
      logger.info(`• Save key:   ${chalk.cyan('echo "0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659" > key.txt')}`);
      logger.info(`• Deploy:     ${chalk.cyan('stylus-toolkit deploy --network local --private-key-path ./key.txt')}`);
      logger.info(`• Profile:    ${chalk.cyan('stylus-toolkit profile --network local')}`);
      logger.newLine();

      logger.success('Local Stylus node is ready for development!');

    } else {
      logger.info(chalk.yellow('Starting node in foreground mode...'));
      logger.info(chalk.dim('Press Ctrl+C to stop the node'));
      logger.newLine();

      logger.section('Connection Details');
      logger.table({
        'RPC URL': `http://localhost:${port}`,
        'Chain ID': DEFAULT_CHAIN_ID.toString(),
      });
      logger.newLine();

      // Start proxy before blocking on Docker
      await startRpcProxy('nitro-testnode', containerPort, parseInt(port));

      const nodeProcess = execa('docker', dockerArgs);
      if (nodeProcess.stdout) nodeProcess.stdout.pipe(process.stdout);
      if (nodeProcess.stderr) nodeProcess.stderr.pipe(process.stderr);

      process.on('SIGINT', async () => {
        logger.newLine();
        logger.info('Stopping node...');
        await killExistingProxy();
        try { await execa('docker', ['stop', 'nitro-testnode']); } catch { /* already stopped */ }
        logger.success('Node stopped successfully');
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
    logger.info('3. Try a different port: stylus-toolkit dev --port 9000');
    logger.info('4. Check Docker logs: docker logs nitro-testnode');
    process.exit(1);
  }
}
