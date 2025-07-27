import axios from 'axios';
import crypto from 'crypto';
import config from '../config';

interface CoinDCXTicker {
  market: string;
  last_price: string;
  bid: string;
  ask: string;
  high: string;
  low: string;
  volume: string;
  timestamp: number;
}

interface CoinCandle {
  open: string;
  high: number;
  low: number;
  volume: number;
  close: number;
  time: number;
}

interface CoinDCXBalance {
  currency: string;
  balance: string;
  available: string;
  locked: string;
}

interface CoinDCXUserData {
  balances: CoinDCXBalance[];
  timestamp: number;
}

class CoinDCXService {
  private baseUrl = 'https://api.coindcx.com';
  private apiKey: string;
  private secretKey: string;

  constructor() {
    this.apiKey = config.COINDCX_API_KEY || '';
    this.secretKey = config.COINDCX_SECRET_KEY || '';
  }

  // Get all ticker data (public endpoint)
  async getTickers(): Promise<CoinDCXTicker[]> {
    try {
      console.log('Fetching CoinDCX tickers...');
      const response = await axios.get(`${this.baseUrl}/exchange/ticker`, {
        timeout: 10000,
      });
      console.log(`Successfully fetched ${response.data.length} tickers from CoinDCX`);
      return response.data;
    } catch (error) {
      console.error('Error fetching CoinDCX tickers:', error);
      throw new Error('Failed to fetch crypto prices from CoinDCX');
    }
  }

  // Get current price for a specific coin
  async getCurrentPrice(coinName: string): Promise<number | null> {
    try {
      const marketPair = this.mapCoinToMarketPair(coinName);
      if (!marketPair) {
        console.warn(`No market pair found for coin: ${coinName}`);
        return null;
      }

      const tickers = await this.getTickers();
      const ticker = tickers.find((ticker) => ticker.market === marketPair);

      if (ticker) {
        const price = parseFloat(ticker.last_price);
        console.log(`Current price for ${coinName} (${marketPair}): ₹${price}`);
        return price;
      }
      return null;
    } catch (error) {
      console.error(`Error getting current price for ${coinName}:`, error);
      return null;
    }
  }

  // Map coin names to CoinDCX market pairs (INR pairs)
  private mapCoinToMarketPair(coinName: string): string | null {
    const coinMappings: { [key: string]: string } = {
      bitcoin: 'BTCINR',
      btc: 'BTCINR',
      ethereum: 'ETHINR',
      eth: 'ETHINR',
      'binance coin': 'BNBINR',
      bnb: 'BNBINR',
      cardano: 'ADAINR',
      ada: 'ADAINR',
      solana: 'SOLINR',
      sol: 'SOLINR',
      polkadot: 'DOTINR',
      dot: 'DOTINR',
      ripple: 'XRPINR',
      xrp: 'XRPINR',
      dogecoin: 'DOGEINR',
      doge: 'DOGEINR',
      litecoin: 'LTCINR',
      ltc: 'LTCINR',
      chainlink: 'LINKINR',
      link: 'LINKINR',
      uniswap: 'UNIINR',
      uni: 'UNIINR',
      avalanche: 'AVAXINR',
      avax: 'AVAXINR',
      pol: 'POLINR',
      matic: 'MATICINR',
    };

    const normalizedCoinName = coinName.toLowerCase().trim();
    const marketPair = coinMappings[normalizedCoinName];

    if (!marketPair) {
      console.warn(
        `No market pair mapping found for coin: ${coinName} (normalized: ${normalizedCoinName})`
      );
    }

    return marketPair || null;
  }

  // Get multiple current prices at once
  async getCurrentPrices(coinNames: string[]): Promise<{ [coinName: string]: number | null }> {
    try {
      console.log(`Fetching current prices for ${coinNames.length} coins:`, coinNames);
      const tickers = await this.getTickers();
      const prices: { [coinName: string]: number | null } = {};

      for (const coinName of coinNames) {
        const marketPair = this.mapCoinToMarketPair(coinName);
        if (marketPair) {
          const ticker = tickers.find((t) => t.market === marketPair);
          prices[coinName] = ticker ? parseFloat(ticker.last_price) : null;
        } else {
          prices[coinName] = null;
        }
      }

      console.log('Fetched prices:', prices);
      return prices;
    } catch (error) {
      console.error('Error getting current prices:', error);
      return {};
    }
  }

  // Get user balances from CoinDCX (authenticated endpoint)
  async getUserBalances(): Promise<CoinDCXUserData | null> {
    try {
      const timeStamp = Math.floor(Date.now());
      console.log('Timestamp:', timeStamp);

      if (!this.apiKey || !this.secretKey) {
        console.error('CoinDCX API credentials not configured');
        return null;
      }

      const body = {
        timestamp: timeStamp,
      };

      const payload = Buffer.from(JSON.stringify(body)).toString();
      const signature = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');

      const options = {
        url: this.baseUrl + '/exchange/v1/users/balances',
        headers: {
          'X-AUTH-APIKEY': this.apiKey,
          'X-AUTH-SIGNATURE': signature,
          'Content-Type': 'application/json',
        },
        json: true,
        body: body,
      };

      console.log('Making authenticated request to CoinDCX...');
      const response = await axios.post(options.url, options.body, {
        headers: options.headers,
        timeout: 10000,
      });

      console.log('CoinDCX user balances response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching CoinDCX user balances:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }
      return null;
    }
  }

  // Fetch public coin candles from CoinDCX
  async getCoinCandles({
    symbol,
    interval = '1d',
    limit = 365,
    startTime,
    endTime,
  }: {
    symbol: string;
    interval?: string;
    limit?: number;
    startTime?: number;
    endTime?: number;
  }): Promise<CoinCandle[]> {
    try {
      if (typeof startTime !== 'number' || typeof endTime !== 'number') {
        throw new Error('startTime and endTime are required and must be numbers');
      }
      const pair = `I-${symbol}_INR`;
      const url = `https://public.coindcx.com/market_data/candles?pair=${pair}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
      const response = await axios.get(url);
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching coin candles from CoinDCX:', error);
      return [];
    }
  }

  // Test the service
  async testConnection(): Promise<boolean> {
    try {
      const tickers = await this.getTickers();
      console.log(`CoinDCX service test successful. Found ${tickers.length} tickers.`);
      return true;
    } catch (error) {
      console.error('CoinDCX service test failed:', error);
      return false;
    }
  }
}

export default new CoinDCXService();
