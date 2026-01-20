import inquirer from 'inquirer';
import Table from 'cli-table3';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { FileSystem } from '../utils/file-system';
import { RustCompiler } from '../compiler/rust-compiler';
import { SolidityCompiler } from '../compiler/solidity-compiler';
import { GasProfiler } from '../profiler/gas-profiler';
import { GasComparator } from '../profiler/comparator';
import { ResultsStore } from '../storage/results-store';
import { ResultExporter } from '../exporter/exporter';
import { ProfileOptions } from '../types';

export async function profileCommand(options: ProfileOptions): Promise<void> {
  logger.header('Stylus Toolkit - Gas Profiling');

  try {
    const rpcUrl = options.rpcUrl || config.getNetwork(options.network)?.rpcUrl;

    if (!rpcUrl) {
      logger.error(`Network "${options.network}" not found in configuration`);
      process.exit(1);
    }

    logger.info(`Network: ${options.network}`);
    logger.info(`RPC URL: ${rpcUrl}`);
    logger.newLine();

    let contractName = options.contract;

    if (!contractName) {
      const rustContracts = await FileSystem.listContracts('rust');
      const solidityContracts = await FileSystem.listContracts('solidity');

      const allContracts = [...new Set([...rustContracts, ...solidityContracts])];

      if (allContracts.length === 0) {
        logger.error('No contracts found. Run "stylus-toolkit init" first.');
        process.exit(1);
      }

      if (allContracts.length === 1) {
        contractName = allContracts[0];
        logger.info(`Auto-detected contract: ${contractName}`);
      } else {
        const answer = await inquirer.prompt([
          {
            type: 'list',
            name: 'contract',
            message: 'Select contract to profile:',
            choices: allContracts,
          },
        ]);
        contractName = answer.contract;
      }
    }

    logger.newLine();
    logger.section('Compilation Phase');

    const rustCompiler = new RustCompiler();
    const solidityCompiler = new SolidityCompiler();

    let rustResult;
    let solidityResult;

    if (options.compile) {
      logger.info('Compiling contracts...');
      logger.newLine();

      rustResult = await rustCompiler.compile(options.rustPath);

      solidityResult = await solidityCompiler.compile(options.solidityPath);
    } else {
      logger.info('Skipping compilation (--no-compile flag set)');
      logger.error('Compilation results required for profiling');
      process.exit(1);
    }

    if (!rustResult.success || !solidityResult.success) {
      logger.error('Compilation failed for one or more contracts');
      if (rustResult.errors) {
        logger.error(`Rust errors: ${rustResult.errors.join(', ')}`);
      }
      if (solidityResult.errors) {
        logger.error(`Solidity errors: ${solidityResult.errors.join(', ')}`);
      }
      process.exit(1);
    }

    logger.newLine();
    logger.section('Gas Profiling Phase');

    const profiler = new GasProfiler(rpcUrl);

    const rustProfile = await profiler.profileContract(rustResult);
    const solidityProfile = await profiler.profileContract(solidityResult);

    logger.newLine();
    logger.section('Comparison Analysis');

    const comparator = new GasComparator();
    const comparison = comparator.compare(rustProfile, solidityProfile);

    displayResults(comparison, options.detailed);

    logger.newLine();
    logger.section('Saving Results');

    const store = new ResultsStore();
    await store.save(comparison);

    if (options.export) {
      const exporter = new ResultExporter();
      await exporter.export(comparison, {
        format: options.export as 'json' | 'csv' | 'html',
        outputPath: FileSystem.getProjectRoot(),
        includeRawData: options.detailed,
      });
    }

    logger.newLine();
    logger.success('Gas profiling complete!');
  } catch (error) {
    logger.error(`Profiling failed: ${(error as Error).message}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

function displayResults(comparison: any, detailed: boolean): void {
  const table = new Table({
    head: ['Metric', 'Rust (Stylus)', 'Solidity', 'Savings', '%'],
    colWidths: [20, 18, 18, 18, 12],
    style: {
      head: ['cyan', 'bold'],
    },
  });

  table.push([
    chalk.bold('Deployment'),
    comparison.rustProfile.deploymentGas.toLocaleString(),
    comparison.solidityProfile.deploymentGas.toLocaleString(),
    chalk.green(comparison.savings.deploymentSavings.absolute.toLocaleString()),
    chalk.green(comparison.savings.deploymentSavings.percentage.toFixed(2) + '%'),
  ]);

  if (comparison.savings.functionSavings.size > 0) {
    table.push([{ colSpan: 5, content: chalk.bold('Function Gas') }]);

    for (const [functionName, savings] of comparison.savings.functionSavings) {
      const savingsColor = savings.absolute > 0 ? chalk.green : chalk.red;

      table.push([
        `  ${functionName}`,
        savings.rustGas.toLocaleString(),
        savings.solidityGas.toLocaleString(),
        savingsColor(savings.absolute.toLocaleString()),
        savingsColor(savings.percentage.toFixed(2) + '%'),
      ]);
    }

    table.push([
      chalk.bold('Avg Total'),
      '-',
      '-',
      chalk.green(comparison.savings.totalAvgSavings.absolute.toLocaleString()),
      chalk.green(comparison.savings.totalAvgSavings.percentage.toFixed(2) + '%'),
    ]);
  }

  console.log(table.toString());

  if (detailed) {
    logger.newLine();
    logger.section('Detailed Information');

    logger.info(`Contract: ${comparison.contractName}`);
    logger.info(`Timestamp: ${comparison.timestamp}`);
    logger.info(`Network: ${comparison.rustProfile.network}`);
    logger.info(`Block: ${comparison.rustProfile.blockNumber}`);
  }
}
