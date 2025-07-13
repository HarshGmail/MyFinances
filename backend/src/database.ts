import { MongoClient, Db } from 'mongodb';
import config from './config';

class Database {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  async connect(): Promise<void> {
    try {
      this.client = new MongoClient(config.MONGO);
      await this.client.connect();

      this.db = this.client.db();

      console.log('✅ Connected to MongoDB successfully');

      // Test the connection
      await this.db.admin().ping();
      console.log('✅ Database ping successful');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        console.log('✅ Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
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
