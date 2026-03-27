import { MongoClient, Db } from 'mongodb';
import config from './config';
import logger from './utils/logger';

class Database {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    try {
      this.client = new MongoClient(config.MONGO);
      await this.client.connect();

      this.db = this.client.db();

      logger.info('Connected to MongoDB successfully');

      // Test the connection
      await this.db.admin().ping();
      logger.info('Database ping successful');
    } catch (error) {
      logger.error({ err: error }, 'Failed to connect to MongoDB');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        logger.info('Disconnected from MongoDB');
      }
    } catch (error) {
      logger.error({ err: error }, 'Error disconnecting from MongoDB');
      throw error;
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('Database client not connected. Call connect() first.');
    }
    return this.client;
  }

  isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }
}

// Create a singleton instance
const database = new Database();

export default database;
