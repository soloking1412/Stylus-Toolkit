import express from 'express';
import path from 'path';
import open from 'open';
import { ResultsStore } from '../storage/results-store';
import { logger } from '../utils/logger';

interface DashboardOptions {
  port?: string;
}

export async function dashboardCommand(options: DashboardOptions): Promise<void> {
  logger.header('Stylus Toolkit - Analytics Dashboard');

  const port = parseInt(options.port || '3000');
  const app = express();

  const dashboardDir = path.join(__dirname, '../../src/dashboard');

  app.use(express.static(dashboardDir));

  app.get('/data.json', async (_req, res) => {
    try {
      const store = new ResultsStore();
      const results = await store.getAllResults();
      res.json(results);
    } catch (error) {
      logger.error(`Failed to load results: ${error}`);
      res.status(500).json({ error: 'Failed to load profiling results' });
    }
  });

  app.listen(port, async () => {
    logger.success(`Dashboard running at http://localhost:${port}`);
    logger.info('Press Ctrl+C to stop');
    logger.newLine();

    try {
      await open(`http://localhost:${port}`);
      logger.info('Opening dashboard in browser...');
    } catch (error) {
      logger.warn('Could not auto-open browser');
      logger.info(`Please visit: http://localhost:${port}`);
    }
  });

  process.on('SIGINT', () => {
    logger.newLine();
    logger.info('Stopping dashboard server...');
    process.exit(0);
  });
}
