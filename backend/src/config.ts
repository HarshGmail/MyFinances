import dotenv from 'dotenv';

dotenv.config();

interface Config {
  // Server configuration
  PORT: number;
  NODE_ENV: string;

  // Database configuration
  MONGO: string;

  //Coindcx API configuration
  COINDCX_API_KEY?: string;
  COINDCX_SECRET_KEY?: string;

  // Upstox API configuration (for future use)
  UPSTOX_CLIENT_ID?: string;
  UPSTOX_CLIENT_SECRET?: string;
  UPSTOX_REDIRECT_URI?: string;

  TWELVE_DATA_API_KEY?: string;

  // JWT secret
  JWT_SECRET: string;
}

// Validate required environment variables
const requiredEnvVars = ['MONGO', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Export configuration object
const config: Config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO: process.env.MONGO!,
  UPSTOX_CLIENT_ID: process.env.UPSTOX_CLIENT_ID,
  UPSTOX_CLIENT_SECRET: process.env.UPSTOX_CLIENT_SECRET,
  UPSTOX_REDIRECT_URI: process.env.UPSTOX_REDIRECT_URI,
  COINDCX_API_KEY: process.env.COINDCX_API_KEY,
  COINDCX_SECRET_KEY: process.env.COINDCX_SECRET_KEY,
  TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET!,
};

export default config;
