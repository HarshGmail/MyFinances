import config from './config';
import express from 'express';
import cors from 'cors';
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
} from './routes';
import { requestLogger } from './middleware';

const app = express();
const port = config.PORT;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
    'https://my-finances-alpha.vercel.app',
  ],
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

// Load swagger.json
const swaggerDocument = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gold', goldRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/mutual-funds', mutualFundsRouter);
app.use('/api/funds', mutualFundsInfoRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/goals', userGoalsRouter);
app.use('/api/epf', epfRouter);
app.use('/api/fixed-deposit', fixedDepositsRouter);
app.use('/api/recurring-deposit', recurringDepositsRouter);
app.use('/api', verifyRoutes);

app.get('/health', (req, res) => {
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

    // Start the server
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
      console.log(`📚 Swagger docs at http://localhost:${port}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await database.disconnect();
  process.exit(0);
});

// Start the server
startServer();
