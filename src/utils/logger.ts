import chalk from 'chalk';
import ora, { Ora } from 'ora';

class Logger {
  private spinner: Ora | null = null;

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  error(message: string): void {
    console.log(chalk.red('✗'), message);
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message);
    }
  }

  startSpinner(message: string): void {
    this.spinner = ora(message).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  succeedSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  failSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  header(message: string): void {
    console.log('\n' + chalk.bold.cyan('═'.repeat(60)));
    console.log(chalk.bold.cyan(`  ${message}`));
    console.log(chalk.bold.cyan('═'.repeat(60)) + '\n');
  }

  section(message: string): void {
    console.log('\n' + chalk.bold.white(`▶ ${message}`) + '\n');
  }

  table(data: Record<string, any>): void {
    const maxKeyLength = Math.max(...Object.keys(data).map((k) => k.length));
    Object.entries(data).forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(chalk.gray(`  ${paddedKey} : `) + chalk.white(value));
    });
  }

  newLine(): void {
    console.log();
  }
}

export const logger = new Logger();
