import config from './config';
import express from 'express';
import cors from 'cors';
import { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import * as fs from 'fs';
import * as path from 'path';
import database from './database';
import {
  authRoutes,
  verifyRoutes,
  goldRouter,
  cryptoRouter,
  mutualFundsRouter,
  mutualFundsInfoRouter,
  stocksRouter,
  userGoalsRouter,
  epfRouter,
  fixedDepositsRouter,
  recurringDepositsRouter,
  inflationRouter,
  expenseRouter,
  expenseTransactionsRouter,
  assetTargetRouter,
  ingestRouter,
  chatgptRouter,
  capitalGainsRouter,
  emailIntegrationsRouter,
  webhooksRouter,
} from './routes';
import { requestLogger, blockDemoMutations } from './middleware';
import logger from './utils/logger';

const app = express();
const port = config.PORT;
app.set('trust proxy', 1);
// CORS configuration

const corsOptions: CorsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    /^https:\/\/my-finances(-[a-z0-9]+)*\.vercel\.app$/,
    'https://www.my-finances.site',
    'https://my-finances.site',
    'https://mcp.my-finances.site',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);
app.use(blockDemoMutations); // Block mutations for demo users

// Load swagger.json
const swaggerDocument = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/targets', assetTargetRouter);
app.use('/api/gold', goldRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/mutual-funds', mutualFundsRouter);
app.use('/api/funds', mutualFundsInfoRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/goals', userGoalsRouter);
app.use('/api/epf', epfRouter);
app.use('/api/fixed-deposit', fixedDepositsRouter);
app.use('/api/recurring-deposit', recurringDepositsRouter);
app.use('/api/inflation', inflationRouter);
app.use('/api/expenses', expenseRouter);
app.use('/api/expense-transactions', expenseTransactionsRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/chatgpt', chatgptRouter);
app.use('/api/capital-gains', capitalGainsRouter);
app.use('/api/email-integration', emailIntegrationsRouter);
app.use('/api', verifyRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: database.isConnected() ? 'connected' : 'disconnected',
  });
});

// Initialize server
async function startServer() {
  try {
    // Connect to MongoDB
    await database.connect();

    // Create TTL index for password reset tokens (auto-delete after expiry)
    await database
      .getDb()
      .collection('passwordResetTokens')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // Start the server
    app.listen(port, '0.0.0.0', () => {
      logger.info(`Server running at http://localhost:${port}`);
      logger.info(`Swagger docs at http://localhost:${port}/api-docs`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server (SIGINT)');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server (SIGTERM)');
  await database.disconnect();
  process.exit(0);
});

// Start the server
startServer();
