import path from 'path';
import fs from 'fs-extra';
import { FileSystem } from '../utils/file-system';
import { ComparisonResult } from '../types';
import { logger } from '../utils/logger';

export class ResultsStore {
  private resultsDir: string;

  constructor(customDir?: string) {
    this.resultsDir =
      customDir || path.join(FileSystem.getProjectRoot(), '.stylus-toolkit', 'results');
  }

  async initialize(): Promise<void> {
    await FileSystem.ensureDir(this.resultsDir);
  }

  async save(comparison: ComparisonResult): Promise<string> {
    await this.initialize();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${comparison.contractName}_${timestamp}.json`;
    const filepath = path.join(this.resultsDir, filename);

    await FileSystem.writeJson(filepath, this.serializeComparison(comparison));

    logger.success(`Results saved to ${filepath}`);

    return filepath;
  }

  async load(filename: string): Promise<ComparisonResult> {
    const filepath = path.join(this.resultsDir, filename);

    if (!(await FileSystem.fileExists(filepath))) {
      throw new Error(`Result file not found: ${filename}`);
    }

    const data = await FileSystem.readJson(filepath);
    return this.deserializeComparison(data);
  }

  async list(): Promise<string[]> {
    await this.initialize();

    try {
      const files = await fs.readdir(this.resultsDir);
      return files.filter((f) => f.endsWith('.json')).sort().reverse();
    } catch {
      return [];
    }
  }

  async getLatest(contractName?: string): Promise<ComparisonResult | null> {
    const files = await this.list();

    const filteredFiles = contractName
      ? files.filter((f) => f.startsWith(contractName))
      : files;

    if (filteredFiles.length === 0) {
      return null;
    }

    return await this.load(filteredFiles[0]);
  }

  async delete(filename: string): Promise<void> {
    const filepath = path.join(this.resultsDir, filename);

    if (await FileSystem.fileExists(filepath)) {
      await fs.remove(filepath);
      logger.success(`Deleted result: ${filename}`);
    }
  }

  async clear(): Promise<void> {
    await fs.remove(this.resultsDir);
    await this.initialize();
    logger.success('All results cleared');
  }

  private serializeComparison(comparison: ComparisonResult): any {
    return {
      ...comparison,
      rustProfile: {
        ...comparison.rustProfile,
        functionGas: Array.from(comparison.rustProfile.functionGas.entries()),
      },
      solidityProfile: {
        ...comparison.solidityProfile,
        functionGas: Array.from(comparison.solidityProfile.functionGas.entries()),
      },
      savings: {
        ...comparison.savings,
        functionSavings: Array.from(comparison.savings.functionSavings.entries()),
      },
    };
  }

  private deserializeComparison(data: any): ComparisonResult {
    return {
      ...data,
      rustProfile: {
        ...data.rustProfile,
        functionGas: new Map(data.rustProfile.functionGas),
      },
      solidityProfile: {
        ...data.solidityProfile,
        functionGas: new Map(data.solidityProfile.functionGas),
      },
      savings: {
        ...data.savings,
        functionSavings: new Map(data.savings.functionSavings),
      },
    };
  }

  getResultsDirectory(): string {
    return this.resultsDir;
  }
}
