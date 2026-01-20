import execa from 'execa';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger';
import { FileSystem } from '../utils/file-system';
import { CompilationResult } from '../types';

export class SolidityCompiler {
  private projectPath: string;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || FileSystem.getProjectRoot();
  }

  async compile(contractPath?: string): Promise<CompilationResult> {
    const startTime = Date.now();

    try {
      const solcInstalled = await this.checkSolcInstalled();

      if (!solcInstalled) {
        logger.warn('solc not found. Attempting to use solc-js...');
        return await this.compileWithSolcJs(contractPath);
      }

      return await this.compileWithSolc(contractPath);
    } catch (error) {
      const compilationTime = Date.now() - startTime;
      logger.failSpinner('Solidity compilation failed');

      return {
        success: false,
        language: 'solidity',
        contractName: 'unknown',
        bytecode: '',
        bytecodeSizeKb: 0,
        compilationTime,
        errors: [(error as Error).message],
      };
    }
  }

  private async compileWithSolc(contractPath?: string): Promise<CompilationResult> {
    const startTime = Date.now();

    const solidityPath = contractPath
      ? path.dirname(contractPath)
      : path.join(this.projectPath, 'contracts-solidity');

    if (!(await FileSystem.fileExists(solidityPath))) {
      throw new Error(`Solidity contracts not found at ${solidityPath}`);
    }

    logger.startSpinner('Compiling Solidity contract...');

    const files = await fs.readdir(solidityPath);
    const solFiles = files.filter((f) => f.endsWith('.sol'));

    if (solFiles.length === 0) {
      throw new Error('No Solidity files found');
    }

    const contractFile = contractPath
      ? path.basename(contractPath)
      : solFiles[0];

    const fullPath = path.join(solidityPath, contractFile);

    const { stdout } = await execa('solc', [
      '--combined-json',
      'abi,bin',
      '--optimize',
      '--optimize-runs',
      '200',
      fullPath,
    ]);

    const output = JSON.parse(stdout);
    const contracts = output.contracts;

    const contractKey = Object.keys(contracts)[0];
    const contract = contracts[contractKey];

    const bytecode = contract.bin;
    const abi = JSON.parse(contract.abi);

    const bytecodeSizeKb = Buffer.from(bytecode, 'hex').length / 1024;
    const compilationTime = Date.now() - startTime;

    const contractName = contractFile.replace('.sol', '');

    logger.succeedSpinner(
      `Solidity compilation successful (${(compilationTime / 1000).toFixed(2)}s)`
    );

    return {
      success: true,
      language: 'solidity',
      contractName,
      bytecode,
      abi,
      bytecodeSizeKb,
      compilationTime,
    };
  }

  private async compileWithSolcJs(contractPath?: string): Promise<CompilationResult> {
    const solc = require('solc');
    const startTime = Date.now();

    const solidityPath = contractPath
      ? path.dirname(contractPath)
      : path.join(this.projectPath, 'contracts-solidity');

    if (!(await FileSystem.fileExists(solidityPath))) {
      throw new Error(`Solidity contracts not found at ${solidityPath}`);
    }

    logger.startSpinner('Compiling Solidity contract with solc-js...');

    const files = await fs.readdir(solidityPath);
    const solFiles = files.filter((f) => f.endsWith('.sol'));

    if (solFiles.length === 0) {
      throw new Error('No Solidity files found');
    }

    const contractFile = contractPath
      ? path.basename(contractPath)
      : solFiles[0];

    const fullPath = path.join(solidityPath, contractFile);
    const source = await FileSystem.readFile(fullPath);

    const input = {
      language: 'Solidity',
      sources: {
        [contractFile]: {
          content: source,
        },
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode'],
          },
        },
      },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const errors = output.errors.filter((e: any) => e.severity === 'error');
      if (errors.length > 0) {
        throw new Error(errors.map((e: any) => e.message).join('\n'));
      }
    }

    const contractName = Object.keys(output.contracts[contractFile])[0];
    const contract = output.contracts[contractFile][contractName];

    const bytecode = contract.evm.bytecode.object;
    const abi = contract.abi;

    const bytecodeSizeKb = Buffer.from(bytecode, 'hex').length / 1024;
    const compilationTime = Date.now() - startTime;

    logger.succeedSpinner(
      `Solidity compilation successful (${(compilationTime / 1000).toFixed(2)}s)`
    );

    return {
      success: true,
      language: 'solidity',
      contractName,
      bytecode,
      abi,
      bytecodeSizeKb,
      compilationTime,
    };
  }

  private async checkSolcInstalled(): Promise<boolean> {
    try {
      await execa('solc', ['--version']);
      return true;
    } catch {
      return false;
    }
  }
}
