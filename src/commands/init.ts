import inquirer from 'inquirer';
import path from 'path';
import { logger } from '../utils/logger';
import { FileSystem } from '../utils/file-system';
import { InitOptions, ProjectConfig } from '../types';
import { TemplateGenerator } from '../templates/generator';

const VALID_TEMPLATES = ['basic', 'erc20', 'erc721', 'defi'];

export async function initCommand(options: InitOptions): Promise<void> {
  logger.header('Stylus Toolkit - Initialize New Project');

  let projectName = options.name;
  let template = options.template;

  // Validate project name if provided via CLI
  if (projectName) {
    if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
      logger.error('Project name can only contain letters, numbers, hyphens, and underscores');
      process.exit(1);
    }
  }

  // Validate template if provided via CLI
  if (template && !VALID_TEMPLATES.includes(template)) {
    logger.error(`Invalid template "${template}". Available templates: ${VALID_TEMPLATES.join(', ')}`);
    process.exit(1);
  }

  if (!projectName) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: 'my-stylus-project',
        validate: (input: string) => {
          if (/^[a-z0-9-_]+$/i.test(input)) return true;
          return 'Project name can only contain letters, numbers, hyphens, and underscores';
        },
      },
    ]);
    projectName = answers.projectName;
  }

  // Prompt for missing options in interactive mode
  const prompts: any[] = [];

  if (!template) {
    prompts.push({
      type: 'list',
      name: 'template',
      message: 'Select a template:',
      choices: [
        { name: 'Basic (Simple counter)', value: 'basic' },
        { name: 'ERC-20 Token', value: 'erc20' },
        { name: 'ERC-721 NFT', value: 'erc721' },
        { name: 'DeFi Protocol', value: 'defi' },
      ],
      default: 'basic',
    });
  }

  if (!options.rustOnly && !options.solidityOnly) {
    prompts.push({
      type: 'checkbox',
      name: 'languages',
      message: 'Select languages to include:',
      choices: [
        { name: 'Rust (Stylus)', value: 'rust', checked: true },
        { name: 'Solidity (for comparison)', value: 'solidity', checked: true },
      ],
      validate: (input: string[]) => {
        if (input.length === 0) return 'Select at least one language';
        return true;
      },
    });
  }

  if (prompts.length > 0) {
    const answers = await inquirer.prompt(prompts);

    if (answers.template) {
      template = answers.template;
    }

    if (answers.languages) {
      options.rustOnly = answers.languages.includes('rust') && !answers.languages.includes('solidity');
      options.solidityOnly = answers.languages.includes('solidity') && !answers.languages.includes('rust');
    }
  }

  // Set default template if still not specified
  if (!template) {
    template = 'basic';
  }

  const hasRust = !options.solidityOnly;
  const hasSolidity = !options.rustOnly;

  logger.startSpinner('Creating project structure...');

  try {
    const projectPath = await FileSystem.createProjectStructure(
      projectName!,
      hasRust,
      hasSolidity
    );

    logger.updateSpinner('Generating template files...');

    const templateGenerator = new TemplateGenerator();
    await templateGenerator.generate(projectPath, template, hasRust, hasSolidity);

    const projectConfig: ProjectConfig = {
      name: projectName!,
      version: '1.0.0',
      template,
      hasRust,
      hasSolidity,
      createdAt: new Date().toISOString(),
    };

    await FileSystem.writeJson(
      path.join(projectPath, '.stylus-toolkit', 'config.json'),
      projectConfig
    );

    logger.succeedSpinner('Project created successfully!');

    logger.newLine();
    logger.section('Project Details');
    logger.table({
      'Project Name': projectName!,
      'Template': template,
      'Rust (Stylus)': hasRust ? 'Yes' : 'No',
      'Solidity': hasSolidity ? 'Yes' : 'No',
      'Location': projectPath,
    });

    logger.newLine();
    logger.section('Next Steps');
    logger.info(`1. cd ${projectName}`);
    logger.info('2. stylus-toolkit build');
    logger.info('3. stylus-toolkit profile');
    logger.info('4. Check the README.md for more information');
    logger.newLine();

  } catch (error) {
    logger.failSpinner('Failed to create project');
    logger.error((error as Error).message);
    process.exit(1);
  }
}
