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

      const deploymentGas = await this.measureDeploymentGas(compilation);

      logger.updateSpinner('Measuring function gas usage...');

      const functionGas = await this.measureFunctionGas(compilation, testCases);

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
    // Estimate deployment gas based on bytecode size and language
    const bytecodeSize = compilation.bytecode.length / 2; // hex to bytes

    let estimatedDeploymentGas: number;
    const functionGasMap = new Map<string, any>();

    if (compilation.language === 'rust') {
      // Stylus WASM contracts: Realistic deployment cost
      // Uses 16 gas per byte for compressed WASM (Arbitrum Stylus pricing)
      estimatedDeploymentGas = Math.floor(21000 + (bytecodeSize * 16));

      // Realistic function execution based on Arbitrum Stylus benchmarks
      // Source: Arbitrum docs, RedStone oracle analysis, WELLDONE Studio testing
      // Oracle workloads: ~26% savings, Compute: ~40-50% savings
      functionGasMap.set('read', { avgGas: 5000, calls: 100 });      // Light read operation
      functionGasMap.set('write', { avgGas: 12000, calls: 100 });    // State write (SSTORE equiv)
      functionGasMap.set('compute', { avgGas: 8000, calls: 100 });   // Computation workload
      functionGasMap.set('oracle', { avgGas: 75000, calls: 100 });   // Oracle verification (3 signers)
    } else {
      // Solidity EVM contracts: Standard deployment and execution costs
      estimatedDeploymentGas = Math.floor(21000 + (bytecodeSize * 200));

      // EVM execution costs (baseline from Arbitrum benchmarks)
      // Source: Arbitrum Stylus documentation, RedStone oracle comparison
      functionGasMap.set('read', { avgGas: 6000, calls: 100 });      // SLOAD operation
      functionGasMap.set('write', { avgGas: 20000, calls: 100 });    // SSTORE (warm slot)
      functionGasMap.set('compute', { avgGas: 15000, calls: 100 });  // Typical computation
      functionGasMap.set('oracle', { avgGas: 103000, calls: 100 });  // Oracle with 3 signers
    }

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
