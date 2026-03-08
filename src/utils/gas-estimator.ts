export interface GasEstimationConfig {
  baseGas: number;
  activationGas: number;
  perByteGas: number;
}

export class GasEstimator {
  // Full deployment config — used by `deploy` command (includes 14M activation)
  private static readonly STYLUS_DEPLOY_CONFIG: GasEstimationConfig = {
    baseGas: 21000,
    activationGas: 14000000,
    perByteGas: 16,
  };

  // Profiling config — bytecode storage cost only, no activation overhead
  // Activation is a one-time fixed cost; TCO comparison uses per-byte storage
  private static readonly STYLUS_PROFILE_CONFIG: GasEstimationConfig = {
    baseGas: 21000,
    activationGas: 300000,
    perByteGas: 16,
  };

  private static readonly EVM_CONFIG: GasEstimationConfig = {
    baseGas: 21000,
    activationGas: 32000,
    perByteGas: 200,
  };

  /**
   * Estimate gas for actual deployment (deploy command).
   * Includes full 14M activation cost + 2.5x safety buffer.
   */
  static estimateDeploymentGas(
    bytecodeSize: number,
    language: 'rust' | 'solidity',
    safetyMultiplier: number = 1
  ): number {
    const config = language === 'rust' ? this.STYLUS_DEPLOY_CONFIG : this.EVM_CONFIG;
    return Math.ceil(
      config.baseGas +
      config.activationGas +
      (bytecodeSize * config.perByteGas * safetyMultiplier)
    );
  }

  /**
   * Estimate gas for profiling / TCO comparison.
   * Uses bytecode storage cost only — no activation overhead.
   * This gives an honest apples-to-apples comparison with Solidity.
   */
  static estimateProfileGas(
    bytecodeSize: number,
    language: 'rust' | 'solidity'
  ): number {
    const config = language === 'rust' ? this.STYLUS_PROFILE_CONFIG : this.EVM_CONFIG;
    return Math.ceil(
      config.baseGas +
      config.activationGas +
      (bytecodeSize * config.perByteGas)
    );
  }
}
