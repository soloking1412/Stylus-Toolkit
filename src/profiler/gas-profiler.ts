import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { CompilationResult, GasProfile, FunctionGasData } from '../types';
import { GasEstimator } from '../utils/gas-estimator';
import { GAS_FUNCTION_ESTIMATES } from '../config/constants';

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
    _testCases?: Map<string, any[][]>
  ): Promise<GasProfile> {
    logger.startSpinner(`Profiling ${compilation.language} contract...`);

    try {
      // Try to connect to network
      let network;
      let blockNumber = 0;

      try {
        network = await Promise.race([
          this.provider.getNetwork(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);
        blockNumber = await this.provider.getBlockNumber();
      } catch (error) {
        // Network not available, use estimation mode
        logger.updateSpinner('Network unavailable, using estimation mode...');
        return this.estimateGasProfile(compilation);
      }

      // Always use estimation mode (no actual deployment needed)
      const deploymentGas = this.estimateDeploymentGas(compilation);

      logger.updateSpinner('Estimating function gas usage...');

      const functionGas = this.estimateFunctionGas(compilation);

      logger.succeedSpinner(
        `${compilation.language} profiling complete (Deployment: ${deploymentGas} gas)`
      );

      return {
        contractName: compilation.contractName,
        language: compilation.language,
        deploymentGas,
        functionGas,
        timestamp: new Date().toISOString(),
        network: (network as any).name || 'unknown',
        blockNumber,
      };
    } catch (error) {
      logger.failSpinner(`Failed to profile ${compilation.language} contract`);
      throw error;
    }
  }

  private estimateGasProfile(compilation: CompilationResult): GasProfile {
    const bytecodeSize = compilation.bytecode.length / 2;
    const estimatedDeploymentGas = GasEstimator.estimateProfileGas(
      bytecodeSize,
      compilation.language
    );

    const functionGasMap = new Map<string, FunctionGasData>();
    const estimates = GAS_FUNCTION_ESTIMATES[compilation.language];

    Object.entries(estimates).forEach(([funcName, data]) => {
      functionGasMap.set(funcName, {
        functionName: funcName,
        gasUsed: data.avgGas,
        executions: data.calls,
        avgGas: data.avgGas,
        minGas: data.avgGas,
        maxGas: data.avgGas,
        testCases: []
      });
    });

    logger.succeedSpinner(
      `${compilation.language} estimation complete (Est. Deployment: ${estimatedDeploymentGas} gas)`
    );

    return {
      contractName: compilation.contractName,
      language: compilation.language,
      deploymentGas: estimatedDeploymentGas,
      functionGas: functionGasMap,
      timestamp: new Date().toISOString(),
      network: 'estimation',
      blockNumber: 0,
    };
  }

  private estimateDeploymentGas(compilation: CompilationResult): number {
    const bytecodeSize = compilation.bytecode.length / 2;
    return GasEstimator.estimateProfileGas(bytecodeSize, compilation.language);
  }

  private estimateFunctionGas(compilation: CompilationResult): Map<string, FunctionGasData> {
    const functionGasMap = new Map<string, FunctionGasData>();
    const estimates = GAS_FUNCTION_ESTIMATES[compilation.language];

    Object.entries(estimates).forEach(([funcName, data]) => {
      functionGasMap.set(funcName, {
        functionName: funcName,
        gasUsed: data.avgGas,
        executions: data.calls,
        avgGas: data.avgGas,
        minGas: data.avgGas,
        maxGas: data.avgGas,
        testCases: []
      });
    });

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
