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

  // MCP server URL (for ChatGPT proxy — defaults to prod)
  MCP_URL?: string;

  // Google OAuth2 for Gmail integration
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;

  // AES-256-GCM encryption key (64-char hex = 32 bytes)
  ENCRYPTION_KEY?: string;

  // PDF parsing microservice (Rust). When set, PDF parsing is offloaded to this service.
  // When unset, the Node.js inline parsers are used as fallback.
  PDF_PARSING_SERVICE_URL?: string;

  // Resend API key for sending password reset emails
  RESEND_API_KEY?: string;

  // Resend webhook secret for verifying email.received webhooks
  RESEND_WEBHOOK_SECRET?: string;

  // Frontend URL for password reset links (defaults to prod)
  FRONTEND_URL?: string;
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
  MCP_URL: process.env.MCP_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  PDF_PARSING_SERVICE_URL: process.env.PDF_PARSING_SERVICE_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://www.my-finances.site',
};

export default config;
