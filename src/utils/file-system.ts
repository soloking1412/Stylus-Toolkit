import fs from 'fs-extra';
import path from 'path';

export class FileSystem {
  static async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  static async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  static async fileExists(filePath: string): Promise<boolean> {
    return await fs.pathExists(filePath);
  }

  static async copyTemplate(templateDir: string, targetDir: string): Promise<void> {
    await fs.copy(templateDir, targetDir);
  }

  static async writeJson(filePath: string, data: any): Promise<void> {
    await fs.writeJson(filePath, data, { spaces: 2 });
  }

  static async readJson(filePath: string): Promise<any> {
    return await fs.readJson(filePath);
  }

  static getProjectRoot(): string {
    return process.cwd();
  }

  static async createProjectStructure(projectName: string, hasRust: boolean, hasSolidity: boolean): Promise<string> {
    const projectPath = path.join(this.getProjectRoot(), projectName);

    await this.ensureDir(projectPath);

    if (hasRust) {
      await this.ensureDir(path.join(projectPath, 'contracts-rust'));
      await this.ensureDir(path.join(projectPath, 'contracts-rust', 'src'));
    }

    if (hasSolidity) {
      await this.ensureDir(path.join(projectPath, 'contracts-solidity'));
    }

    await this.ensureDir(path.join(projectPath, 'test'));
    await this.ensureDir(path.join(projectPath, 'scripts'));
    await this.ensureDir(path.join(projectPath, '.stylus-toolkit'));

    return projectPath;
  }

  static async findContract(contractName: string, language: 'rust' | 'solidity'): Promise<string | null> {
    const root = this.getProjectRoot();
    const searchDirs = language === 'rust'
      ? ['contracts-rust/src', 'src', 'contracts']
      : ['contracts-solidity', 'contracts', 'solidity'];

    for (const dir of searchDirs) {
      const fullPath = path.join(root, dir);
      if (await this.fileExists(fullPath)) {
        const ext = language === 'rust' ? '.rs' : '.sol';
        const contractPath = path.join(fullPath, `${contractName}${ext}`);
        if (await this.fileExists(contractPath)) {
          return contractPath;
        }
      }
    }

    return null;
  }

  static async listContracts(language: 'rust' | 'solidity'): Promise<string[]> {
    const root = this.getProjectRoot();

    if (language === 'rust') {
      // For Rust, read contract name from Cargo.toml
      const cargoTomlPath = path.join(root, 'contracts-rust', 'Cargo.toml');
      if (await this.fileExists(cargoTomlPath)) {
        const cargoToml = await this.readFile(cargoTomlPath);
        const nameMatch = cargoToml.match(/name\s*=\s*"([^"]+)"/);
        if (nameMatch) {
          return [nameMatch[1]];
        }
      }
      return [];
    }

    // For Solidity, list .sol files
    const searchDirs = ['contracts-solidity', 'contracts', 'solidity'];
    const contracts: string[] = [];

    for (const dir of searchDirs) {
      const fullPath = path.join(root, dir);
      if (await this.fileExists(fullPath)) {
        const files = await fs.readdir(fullPath);
        contracts.push(...files.filter(f => f.endsWith('.sol')).map(f => f.replace('.sol', '').toLowerCase()));
      }
    }

    return [...new Set(contracts)];
  }
}
