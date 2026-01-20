import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { CompilationResult, GasProfile, FunctionGasData, TestCase } from '../types';

export class GasProfiler {
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(rpcUrl: string, privateKey?: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (privateKey) {
      this.signer = new ethers.Wallet(privateKey, this.provider);
    } else {
      this.signer = ethers.Wallet.createRandom().connect(this.provider);
    }
  }

  async profileContract(
    compilation: CompilationResult,
    testCases?: Map<string, any[][]>
  ): Promise<GasProfile> {
    logger.startSpinner(`Profiling ${compilation.language} contract...`);

    try {
      const deploymentGas = await this.measureDeploymentGas(compilation);

      logger.updateSpinner('Measuring function gas usage...');

      const functionGas = await this.measureFunctionGas(compilation, testCases);

      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();

      logger.succeedSpinner(
        `${compilation.language} profiling complete (Deployment: ${deploymentGas} gas)`
      );

      return {
        contractName: compilation.contractName,
        language: compilation.language,
        deploymentGas,
        functionGas,
        timestamp: new Date().toISOString(),
        network: network.name || 'unknown',
        blockNumber,
      };
    } catch (error) {
      logger.failSpinner(`Failed to profile ${compilation.language} contract`);
      throw error;
    }
  }

  private async measureDeploymentGas(compilation: CompilationResult): Promise<number> {
    try {
      let factory: ethers.ContractFactory;

      if (compilation.language === 'solidity') {
        factory = new ethers.ContractFactory(
          compilation.abi || [],
          compilation.bytecode,
          this.signer
        );
      } else {
        const bytecode = '0x' + compilation.bytecode;

        const tx = await this.signer.sendTransaction({
          data: bytecode,
        });

        const receipt = await tx.wait();

        if (!receipt) {
          throw new Error('Transaction receipt not available');
        }

        return Number(receipt.gasUsed);
      }

      const contract = await factory.deploy();
      await contract.waitForDeployment();

      const deployTx = contract.deploymentTransaction();

      if (!deployTx) {
        throw new Error('Deployment transaction not found');
      }

      const receipt = await deployTx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      return Number(receipt.gasUsed);
    } catch (error) {
      logger.warn(`Deployment gas measurement failed: ${(error as Error).message}`);
      return 0;
    }
  }

  private async measureFunctionGas(
    compilation: CompilationResult,
    testCases?: Map<string, any[][]>
  ): Promise<Map<string, FunctionGasData>> {
    const functionGasMap = new Map<string, FunctionGasData>();

    if (!compilation.abi || !testCases) {
      return functionGasMap;
    }

    try {
      let contract: any;

      if (compilation.language === 'solidity') {
        const factory = new ethers.ContractFactory(
          compilation.abi,
          compilation.bytecode,
          this.signer
        );

        contract = await factory.deploy();
        await contract.waitForDeployment();
      } else {
        return functionGasMap;
      }

      for (const [functionName, inputs] of testCases) {
        const testResults: TestCase[] = [];
        const gasUsages: number[] = [];

        for (let i = 0; i < inputs.length; i++) {
          try {
            const tx = await contract[functionName](...inputs[i]);
            const receipt = await tx.wait();

            const gasUsed = Number(receipt.gasUsed);
            gasUsages.push(gasUsed);

            testResults.push({
              name: `Test ${i + 1}`,
              inputs: inputs[i],
              gasUsed,
              success: true,
            });
          } catch (error) {
            testResults.push({
              name: `Test ${i + 1}`,
              inputs: inputs[i],
              gasUsed: 0,
              success: false,
              error: (error as Error).message,
            });
          }
        }

        if (gasUsages.length > 0) {
          const avgGas = gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length;
          const minGas = Math.min(...gasUsages);
          const maxGas = Math.max(...gasUsages);

          functionGasMap.set(functionName, {
            functionName,
            gasUsed: avgGas,
            executions: gasUsages.length,
            avgGas,
            minGas,
            maxGas,
            testCases: testResults,
          });
        }
      }
    } catch (error) {
      logger.warn(`Function gas measurement failed: ${(error as Error).message}`);
    }

    return functionGasMap;
  }

  async estimateGas(
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: any[]
  ): Promise<number> {
    const contract = new ethers.Contract(contractAddress, abi, this.signer);

    const gasEstimate = await contract[functionName].estimateGas(...args);

    return Number(gasEstimate);
  }
}
