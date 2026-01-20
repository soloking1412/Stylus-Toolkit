#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { profileCommand } from './commands/profile';
import { benchmarkCommand } from './commands/benchmark';
import { configCommand } from './commands/config';

const program = new Command();

program
  .name('stylus-toolkit')
  .description('A comprehensive CLI development environment for Arbitrum Stylus smart contracts')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new Stylus project')
  .option('-n, --name <name>', 'Project name')
  .option('-t, --template <template>', 'Project template (erc20, erc721, defi, basic)', 'basic')
  .option('--rust-only', 'Initialize Rust-only project')
  .option('--solidity-only', 'Initialize Solidity-only project')
  .action(initCommand);

program
  .command('profile')
  .description('Profile and compare gas usage between Rust (Stylus) and Solidity implementations')
  .option('-c, --contract <name>', 'Contract name to profile')
  .option('-r, --rpc <url>', 'RPC endpoint URL')
  .option('-n, --network <network>', 'Network name (arbitrum-sepolia, arbitrum-one, local)', 'local')
  .option('--rust-path <path>', 'Path to Rust contract')
  .option('--solidity-path <path>', 'Path to Solidity contract')
  .option('--export <format>', 'Export format (json, csv, html)', 'json')
  .option('--no-compile', 'Skip compilation step')
  .option('--detailed', 'Show detailed gas breakdown')
  .action(profileCommand);

program
  .command('benchmark')
  .description('Run comprehensive benchmarks on contracts')
  .option('-c, --contract <name>', 'Contract name to benchmark')
  .option('-i, --iterations <number>', 'Number of iterations', '10')
  .option('--export <format>', 'Export format (json, csv, html)', 'json')
  .action(benchmarkCommand);

program
  .command('config')
  .description('Manage toolkit configuration')
  .option('--set <key=value>', 'Set configuration value')
  .option('--get <key>', 'Get configuration value')
  .option('--list', 'List all configuration')
  .option('--reset', 'Reset to default configuration')
  .action(configCommand);

program.on('command:*', function () {
  console.error(chalk.red('Invalid command: %s\n'), program.args.join(' '));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
