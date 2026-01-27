export interface ProjectConfig {
  name: string;
  version: string;
  template: string;
  hasRust: boolean;
  hasSolidity: boolean;
  createdAt: string;
}

export interface CompilationResult {
  success: boolean;
  language: 'rust' | 'solidity';
  contractName: string;
  bytecode: string;
  abi?: any[];
  wasmSize?: number;
  bytecodeSizeKb: number;
  compilationTime: number;
  errors?: string[];
  warnings?: string[];
}

export interface GasProfile {
  contractName: string;
  language: 'rust' | 'solidity';
  deploymentGas: number;
  functionGas: Map<string, FunctionGasData>;
  timestamp: string;
  network: string;
  blockNumber?: number;
}

export interface FunctionGasData {
  functionName: string;
  gasUsed: number;
  executions: number;
  avgGas: number;
  minGas: number;
  maxGas: number;
  testCases: TestCase[];
}

export interface TestCase {
  name: string;
  inputs: any[];
  gasUsed: number;
  success: boolean;
  error?: string;
}

export interface ComparisonResult {
  contractName: string;
  rustProfile: GasProfile;
  solidityProfile: GasProfile;
  savings: GasSavings;
  tco: TCOAnalysis;
  timestamp: string;
}

export interface GasSavings {
  deploymentSavings: {
    absolute: number;
    percentage: number;
  };
  functionSavings: Map<string, FunctionSavings>;
  totalAvgSavings: {
    absolute: number;
    percentage: number;
  };
}

export interface FunctionSavings {
  functionName: string;
  absolute: number;
  percentage: number;
  rustGas: number;
  solidityGas: number;
}

export interface TCOAnalysis {
  rustTCO: number;
  solidityTCO: number;
  tcoAbsolute: number;
  tcoPercentage: number;
  callFrequency: number;
  functionCount: number;
}

export interface BenchmarkConfig {
  iterations: number;
  warmup: number;
  timeout: number;
}

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  explorer?: string;
}

export interface ToolkitConfig {
  defaultNetwork: string;
  networks: Record<string, NetworkConfig>;
  gasPrice: string;
  privateKey?: string;
  resultsDir: string;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'html';
  outputPath?: string;
  includeRawData?: boolean;
}

export interface ProfileOptions {
  contract?: string;
  rpcUrl?: string;
  network: string;
  rustPath?: string;
  solidityPath?: string;
  export: string;
  compile: boolean;
  detailed: boolean;
}

export interface InitOptions {
  name?: string;
  template: string;
  rustOnly: boolean;
  solidityOnly: boolean;
}

export interface BenchmarkOptions {
  contract?: string;
  iterations: string;
  export: string;
}
