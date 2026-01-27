import {
  GasProfile,
  ComparisonResult,
  GasSavings,
  FunctionSavings,
  TCOAnalysis,
} from '../types';

export class GasComparator {
  compare(rustProfile: GasProfile, solidityProfile: GasProfile): ComparisonResult {
    const savings = this.calculateSavings(rustProfile, solidityProfile);
    const tco = this.calculateTCO(rustProfile, solidityProfile);

    return {
      contractName: rustProfile.contractName,
      rustProfile,
      solidityProfile,
      savings,
      tco,
      timestamp: new Date().toISOString(),
    };
  }

  private calculateSavings(rustProfile: GasProfile, solidityProfile: GasProfile): GasSavings {
    const deploymentSavings = this.calculateDeploymentSavings(
      rustProfile.deploymentGas,
      solidityProfile.deploymentGas
    );

    const functionSavings = this.calculateFunctionSavings(
      rustProfile.functionGas,
      solidityProfile.functionGas
    );

    const totalAvgSavings = this.calculateTotalAvgSavings(functionSavings);

    return {
      deploymentSavings,
      functionSavings,
      totalAvgSavings,
    };
  }

  private calculateDeploymentSavings(rustGas: number, solidityGas: number) {
    const absolute = solidityGas - rustGas;
    const percentage = solidityGas > 0 ? (absolute / solidityGas) * 100 : 0;

    return {
      absolute,
      percentage,
    };
  }

  private calculateFunctionSavings(
    rustFunctions: Map<string, any>,
    solidityFunctions: Map<string, any>
  ): Map<string, FunctionSavings> {
    const savingsMap = new Map<string, FunctionSavings>();

    for (const [functionName, rustData] of rustFunctions) {
      const solidityData = solidityFunctions.get(functionName);

      if (solidityData) {
        const absolute = solidityData.avgGas - rustData.avgGas;
        const percentage =
          solidityData.avgGas > 0 ? (absolute / solidityData.avgGas) * 100 : 0;

        savingsMap.set(functionName, {
          functionName,
          absolute,
          percentage,
          rustGas: rustData.avgGas,
          solidityGas: solidityData.avgGas,
        });
      }
    }

    return savingsMap;
  }

  private calculateTotalAvgSavings(functionSavings: Map<string, FunctionSavings>) {
    if (functionSavings.size === 0) {
      return { absolute: 0, percentage: 0 };
    }

    let totalAbsolute = 0;
    let totalPercentage = 0;

    for (const savings of functionSavings.values()) {
      totalAbsolute += savings.absolute;
      totalPercentage += savings.percentage;
    }

    return {
      absolute: totalAbsolute / functionSavings.size,
      percentage: totalPercentage / functionSavings.size,
    };
  }

  private calculateTCO(rustProfile: GasProfile, solidityProfile: GasProfile): TCOAnalysis {
    // Total Cost of Ownership = Deployment + (Execution × Call Frequency)
    const callFrequency = 100; // Use function call frequency from estimates

    let rustTotalExecution = 0;
    let solidityTotalExecution = 0;
    let functionCount = 0;

    for (const [functionName, rustData] of rustProfile.functionGas) {
      const solidityData = solidityProfile.functionGas.get(functionName);
      if (solidityData) {
        // Type assertion for estimation data which has avgGas and calls properties
        const rustDataAny = rustData as any;
        const solidityDataAny = solidityData as any;

        const rustCalls = rustDataAny.calls || rustData.executions || callFrequency;
        const solidityCalls = solidityDataAny.calls || solidityData.executions || callFrequency;

        rustTotalExecution += rustData.avgGas * rustCalls;
        solidityTotalExecution += solidityData.avgGas * solidityCalls;
        functionCount++;
      }
    }

    const rustTCO = rustProfile.deploymentGas + rustTotalExecution;
    const solidityTCO = solidityProfile.deploymentGas + solidityTotalExecution;

    const tcoAbsolute = solidityTCO - rustTCO;
    const tcoPercentage = solidityTCO > 0 ? (tcoAbsolute / solidityTCO) * 100 : 0;

    return {
      rustTCO,
      solidityTCO,
      tcoAbsolute,
      tcoPercentage,
      callFrequency,
      functionCount,
    };
  }

  generateSummary(comparison: ComparisonResult): string {
    const lines: string[] = [];

    lines.push('Gas Comparison Summary');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`Contract: ${comparison.contractName}`);
    lines.push(`Timestamp: ${comparison.timestamp}`);
    lines.push('');

    lines.push('Deployment Gas:');
    lines.push(`  Rust:     ${comparison.rustProfile.deploymentGas.toLocaleString()} gas`);
    lines.push(`  Solidity: ${comparison.solidityProfile.deploymentGas.toLocaleString()} gas`);
    lines.push(
      `  Savings:  ${comparison.savings.deploymentSavings.absolute.toLocaleString()} gas (${comparison.savings.deploymentSavings.percentage.toFixed(2)}%)`
    );
    lines.push('');

    if (comparison.savings.functionSavings.size > 0) {
      lines.push('Function Gas Comparison:');
      lines.push('');

      for (const [functionName, savings] of comparison.savings.functionSavings) {
        lines.push(`  ${functionName}:`);
        lines.push(`    Rust:     ${savings.rustGas.toLocaleString()} gas`);
        lines.push(`    Solidity: ${savings.solidityGas.toLocaleString()} gas`);
        lines.push(
          `    Savings:  ${savings.absolute.toLocaleString()} gas (${savings.percentage.toFixed(2)}%)`
        );
        lines.push('');
      }

      lines.push('Average Total Savings:');
      lines.push(
        `  ${comparison.savings.totalAvgSavings.absolute.toLocaleString()} gas (${comparison.savings.totalAvgSavings.percentage.toFixed(2)}%)`
      );
    }

    return lines.join('\n');
  }
}
