import chalk from 'chalk';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

interface ConfigOptions {
  set?: string;
  get?: string;
  list?: boolean;
  reset?: boolean;
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  logger.header('Stylus Toolkit - Configuration');

  if (options.set) {
    const [key, ...valueParts] = options.set.split('=');
    const value = valueParts.join('=');

    if (!key || !value) {
      logger.error('Invalid format. Use: --set key=value');
      process.exit(1);
    }

    config.set(key as any, value);
    logger.success(`Set ${key} = ${value}`);
    return;
  }

  if (options.get) {
    const value = config.get(options.get as any);
    console.log(chalk.cyan(options.get + ':'), value);
    return;
  }

  if (options.reset) {
    config.reset();
    logger.success('Configuration reset to defaults');
    return;
  }

  if (options.list) {
    const allConfig = config.getAll();

    logger.section('Current Configuration');

    logger.table({
      'Default Network': allConfig.defaultNetwork,
      'Gas Price': allConfig.gasPrice,
      'Results Directory': allConfig.resultsDir,
    });

    logger.newLine();
    logger.section('Configured Networks');

    const networks = config.listNetworks();
    networks.forEach((networkName) => {
      const network = config.getNetwork(networkName);
      if (network) {
        console.log(chalk.bold(`\n${networkName}:`));
        logger.table({
          'Name': network.name,
          'RPC URL': network.rpcUrl,
          'Chain ID': network.chainId,
          'Explorer': network.explorer || 'N/A',
        });
      }
    });

    return;
  }

  logger.info('Use --list to view all configuration');
  logger.info('Use --set key=value to set a configuration value');
  logger.info('Use --get key to get a configuration value');
  logger.info('Use --reset to reset to default configuration');
}
