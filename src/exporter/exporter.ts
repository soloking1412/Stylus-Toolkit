import path from 'path';
import { Parser } from 'json2csv';
import Handlebars from 'handlebars';
import { FileSystem } from '../utils/file-system';
import { ComparisonResult, ExportOptions } from '../types';
import { logger } from '../utils/logger';

export class ResultExporter {
  async export(
    comparison: ComparisonResult,
    options: ExportOptions
  ): Promise<string> {
    const outputDir = options.outputPath || FileSystem.getProjectRoot();

    switch (options.format) {
      case 'json':
        return await this.exportJson(comparison, outputDir, options.includeRawData);
      case 'csv':
        return await this.exportCsv(comparison, outputDir);
      case 'html':
        return await this.exportHtml(comparison, outputDir);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private async exportJson(
    comparison: ComparisonResult,
    outputDir: string,
    includeRawData?: boolean
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gas-profile-${comparison.contractName}-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    const data = includeRawData
      ? this.serializeComparison(comparison)
      : this.createSummaryData(comparison);

    await FileSystem.writeJson(filepath, data);

    logger.success(`JSON export saved to ${filename}`);
    return filepath;
  }

  private async exportCsv(
    comparison: ComparisonResult,
    outputDir: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gas-profile-${comparison.contractName}-${timestamp}.csv`;
    const filepath = path.join(outputDir, filename);

    const records = this.createCsvRecords(comparison);

    const parser = new Parser({
      fields: [
        'Metric',
        'Rust (Gas)',
        'Solidity (Gas)',
        'Savings (Gas)',
        'Savings (%)',
      ],
    });

    const csv = parser.parse(records);

    await FileSystem.writeFile(filepath, csv);

    logger.success(`CSV export saved to ${filename}`);
    return filepath;
  }

  private async exportHtml(
    comparison: ComparisonResult,
    outputDir: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gas-profile-${comparison.contractName}-${timestamp}.html`;
    const filepath = path.join(outputDir, filename);

    const html = this.generateHtml(comparison);

    await FileSystem.writeFile(filepath, html);

    logger.success(`HTML export saved to ${filename}`);
    return filepath;
  }

  private createSummaryData(comparison: ComparisonResult): any {
    return {
      contract: comparison.contractName,
      timestamp: comparison.timestamp,
      deployment: {
        rust: comparison.rustProfile.deploymentGas,
        solidity: comparison.solidityProfile.deploymentGas,
        savings: {
          absolute: comparison.savings.deploymentSavings.absolute,
          percentage: comparison.savings.deploymentSavings.percentage,
        },
      },
      functions: Array.from(comparison.savings.functionSavings.values()).map((f) => ({
        name: f.functionName,
        rust: f.rustGas,
        solidity: f.solidityGas,
        savings: {
          absolute: f.absolute,
          percentage: f.percentage,
        },
      })),
      totalAverage: comparison.savings.totalAvgSavings,
    };
  }

  private createCsvRecords(comparison: ComparisonResult): any[] {
    const records = [];

    records.push({
      Metric: 'Deployment',
      'Rust (Gas)': comparison.rustProfile.deploymentGas,
      'Solidity (Gas)': comparison.solidityProfile.deploymentGas,
      'Savings (Gas)': comparison.savings.deploymentSavings.absolute,
      'Savings (%)': comparison.savings.deploymentSavings.percentage.toFixed(2),
    });

    for (const [functionName, savings] of comparison.savings.functionSavings) {
      records.push({
        Metric: functionName,
        'Rust (Gas)': savings.rustGas,
        'Solidity (Gas)': savings.solidityGas,
        'Savings (Gas)': savings.absolute,
        'Savings (%)': savings.percentage.toFixed(2),
      });
    }

    if (comparison.savings.functionSavings.size > 0) {
      records.push({
        Metric: 'Average Total',
        'Rust (Gas)': '-',
        'Solidity (Gas)': '-',
        'Savings (Gas)': comparison.savings.totalAvgSavings.absolute,
        'Savings (%)': comparison.savings.totalAvgSavings.percentage.toFixed(2),
      });
    }

    return records;
  }

  private generateHtml(comparison: ComparisonResult): string {
    const template = this.getHtmlTemplate();
    const compiled = Handlebars.compile(template);

    const data = {
      contractName: comparison.contractName,
      timestamp: new Date(comparison.timestamp).toLocaleString(),
      deployment: {
        rust: comparison.rustProfile.deploymentGas.toLocaleString(),
        solidity: comparison.solidityProfile.deploymentGas.toLocaleString(),
        savingsGas: comparison.savings.deploymentSavings.absolute.toLocaleString(),
        savingsPercent: comparison.savings.deploymentSavings.percentage.toFixed(2),
        positive: comparison.savings.deploymentSavings.absolute > 0,
      },
      functions: Array.from(comparison.savings.functionSavings.values()).map((f) => ({
        name: f.functionName,
        rust: f.rustGas.toLocaleString(),
        solidity: f.solidityGas.toLocaleString(),
        savingsGas: f.absolute.toLocaleString(),
        savingsPercent: f.percentage.toFixed(2),
        positive: f.absolute > 0,
      })),
      hasFunctions: comparison.savings.functionSavings.size > 0,
      totalAverage: {
        savingsGas: comparison.savings.totalAvgSavings.absolute.toLocaleString(),
        savingsPercent: comparison.savings.totalAvgSavings.percentage.toFixed(2),
      },
    };

    return compiled(data);
  }

  private getHtmlTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gas Profile - {{contractName}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        .content { padding: 40px; }
        .section { margin-bottom: 40px; }
        .section h2 {
            font-size: 1.8em;
            margin-bottom: 20px;
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        th {
            background: #f5f5f5;
            font-weight: 600;
            color: #555;
            text-transform: uppercase;
            font-size: 0.85em;
            letter-spacing: 0.5px;
        }
        tr:hover { background: #f9f9f9; }
        .positive { color: #10b981; font-weight: 600; }
        .negative { color: #ef4444; font-weight: 600; }
        .highlight {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
            border-top: 1px solid #e0e0e0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Gas Profile Report</h1>
            <p>{{contractName}} - {{timestamp}}</p>
        </div>

        <div class="content">
            <div class="section">
                <h2>Deployment Gas</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Language</th>
                            <th>Gas Used</th>
                            <th>Savings</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Rust (Stylus)</strong></td>
                            <td>{{deployment.rust}}</td>
                            <td rowspan="2" class="{{#if deployment.positive}}positive{{else}}negative{{/if}}">
                                {{deployment.savingsGas}} gas
                            </td>
                            <td rowspan="2" class="{{#if deployment.positive}}positive{{else}}negative{{/if}}">
                                {{deployment.savingsPercent}}%
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Solidity</strong></td>
                            <td>{{deployment.solidity}}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {{#if hasFunctions}}
            <div class="section">
                <h2>Function Gas Comparison</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Function</th>
                            <th>Rust</th>
                            <th>Solidity</th>
                            <th>Savings (Gas)</th>
                            <th>Savings (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#each functions}}
                        <tr>
                            <td><strong>{{name}}</strong></td>
                            <td>{{rust}}</td>
                            <td>{{solidity}}</td>
                            <td class="{{#if positive}}positive{{else}}negative{{/if}}">{{savingsGas}}</td>
                            <td class="{{#if positive}}positive{{else}}negative{{/if}}">{{savingsPercent}}%</td>
                        </tr>
                        {{/each}}
                        <tr class="highlight">
                            <td><strong>Average Total</strong></td>
                            <td>-</td>
                            <td>-</td>
                            <td>{{totalAverage.savingsGas}}</td>
                            <td>{{totalAverage.savingsPercent}}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {{/if}}
        </div>

        <div class="footer">
            Generated by Stylus Toolkit | Arbitrum Stylus Development
        </div>
    </div>
</body>
</html>`;
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
}
