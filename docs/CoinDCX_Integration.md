# CoinDCX Integration

## Overview
Integration of CoinDCX API to provide real-time crypto prices and portfolio tracking.

## Features
- Real-time price fetching from CoinDCX
- Portfolio P&L calculations
- Auto-refresh every minute
- Enhanced UI with summary cards

## Setup
1. Add environment variables:
   ```
   COINDCX_API_KEY=your_api_key
   COINDCX_SECRET_KEY=your_secret_key
   ```

2. Install dependencies:
   ```bash
   cd backend && npm install axios cors
   ```

3. Test connection:
   ```bash
   curl http://localhost:5000/api/crypto/test-coindcx
   ```

## API Endpoints
- `GET /api/crypto/portfolio` - Portfolio with current prices
- `GET /api/crypto/test-coindcx` - Test CoinDCX connection

## Supported Coins
Bitcoin, Ethereum, Binance Coin, Cardano, Solana, Polkadot, Ripple, Dogecoin, Litecoin, Chainlink, Uniswap, Avalanche, Polygon

## Usage
Navigate to `/crypto/portfolio` to see enhanced portfolio with real-time prices. 