# CoinDCX Integration Guide

## Overview

This guide explains the integration of CoinDCX API into the OurFinance application to provide real-time crypto prices and portfolio tracking.

## Features Implemented

### 1. Real-time Price Fetching
- **CoinDCX Service**: Backend service to fetch current crypto prices
- **Market Pair Mapping**: Automatic mapping of common coin names to CoinDCX market pairs
- **Error Handling**: Robust error handling with detailed logging
- **Rate Limiting**: Built-in timeout and retry mechanisms

### 2. Portfolio Enhancement
- **Current Prices**: Real-time prices for all crypto holdings
- **Profit/Loss Calculation**: Automatic P&L calculation for each coin
- **Portfolio Summary**: Total invested, current value, and overall P&L
- **Auto-refresh**: Prices update every minute

### 3. Enhanced UI
- **Summary Cards**: Visual overview of portfolio performance
- **Detailed Table**: Comprehensive view with all metrics
- **Color-coded P&L**: Green for profits, red for losses
- **Responsive Design**: Works on all screen sizes

## API Endpoints

### Backend Endpoints

#### 1. GET `/api/crypto/portfolio`
Returns portfolio data with current prices and P&L calculations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "coinName": "bitcoin",
      "totalQuantity": 0.001234,
      "totalInvested": 50000.00,
      "avgPurchasePrice": 40500.00,
      "currentPrice": 42000.00,
      "currentValue": 51828.00,
      "profitLoss": 1828.00,
      "profitLossPercentage": 3.66,
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    }
  ],
  "summary": {
    "totalInvested": 100000.00,
    "totalCurrentValue": 105000.00,
    "totalProfitLoss": 5000.00,
    "totalProfitLossPercentage": 5.00
  }
}
```

#### 2. GET `/api/crypto/test-coindcx`
Test endpoint to verify CoinDCX API connection.

**Response:**
```json
{
  "success": true,
  "message": "CoinDCX API connection successful",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Frontend Queries

#### 1. `useCryptoPortfolioQuery()`
React Query hook for fetching portfolio data with auto-refresh.

**Features:**
- 30-second cache time
- Auto-refresh every minute
- Error handling
- Loading states

## Supported Cryptocurrencies

The integration supports the following cryptocurrencies with automatic market pair mapping:

| Coin Name | Market Pair | Supported Aliases |
|-----------|-------------|-------------------|
| Bitcoin | B-BTC_USDT | bitcoin, btc |
| Ethereum | B-ETH_USDT | ethereum, eth |
| Binance Coin | B-BNB_USDT | binance coin, bnb |
| Cardano | B-ADA_USDT | cardano, ada |
| Solana | B-SOL_USDT | solana, sol |
| Polkadot | B-DOT_USDT | polkadot, dot |
| Ripple | B-XRP_USDT | ripple, xrp |
| Dogecoin | B-DOGE_USDT | dogecoin, doge |
| Litecoin | B-LTC_USDT | litecoin, ltc |
| Chainlink | B-LINK_USDT | chainlink, link |
| Uniswap | B-UNI_USDT | uniswap, uni |
| Avalanche | B-AVAX_USDT | avalanche, avax |
| Polygon | B-MATIC_USDT | polygon, matic |

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```env
COINDCX_API_KEY=your_api_key_here
COINDCX_SECRET_KEY=your_secret_key_here
```

### 2. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install axios cors

# Frontend dependencies (already installed)
cd ../frontend
npm install
```

### 3. Test the Integration

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Test the CoinDCX connection:
   ```bash
   curl http://localhost:5000/api/crypto/test-coindcx
   ```

3. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

4. Navigate to `/crypto/portfolio` to see the enhanced portfolio page.

## Error Handling

### Common Issues

1. **No Market Pair Found**
   - **Cause**: Coin name not in the mapping table
   - **Solution**: Add the coin to the `mapCoinToMarketPair` function

2. **API Rate Limits**
   - **Cause**: Too many requests to CoinDCX
   - **Solution**: Built-in caching and rate limiting

3. **Network Timeouts**
   - **Cause**: Slow internet or CoinDCX server issues
   - **Solution**: 10-second timeout with retry logic

### Debugging

Enable detailed logging by checking the backend console output. The service logs:
- API requests and responses
- Price fetching operations
- Error details with status codes
- Market pair mapping warnings

## Performance Considerations

### Caching Strategy
- **Backend**: 30-second cache for price data
- **Frontend**: 30-second stale time, 1-minute refresh interval
- **Error Recovery**: Graceful fallback to last known prices

### Rate Limiting
- **CoinDCX API**: Public endpoints have generous limits
- **Application**: Built-in timeouts prevent hanging requests
- **Batching**: Multiple prices fetched in single API call

## Future Enhancements

### Planned Features
1. **WebSocket Integration**: Real-time price updates
2. **Historical Data**: Price charts and trends
3. **More Cryptocurrencies**: Expand supported coin list
4. **Price Alerts**: Notifications for price movements
5. **Portfolio Analytics**: Advanced performance metrics

### Technical Improvements
1. **Redis Caching**: Faster price data access
2. **Multiple Exchanges**: Fallback price sources
3. **Price Validation**: Cross-reference with other APIs
4. **Advanced Error Recovery**: Smart retry mechanisms

## Security Considerations

### API Key Management
- Store keys in environment variables
- Never commit keys to version control
- Use different keys for development/production

### Data Validation
- Validate all price data before use
- Sanitize coin names to prevent injection
- Implement rate limiting on endpoints

### Error Information
- Don't expose internal errors to clients
- Log detailed errors for debugging
- Provide user-friendly error messages

## Troubleshooting

### Backend Issues

1. **Server won't start**
   - Check MongoDB connection
   - Verify environment variables
   - Check for port conflicts

2. **CoinDCX API errors**
   - Verify API keys are correct
   - Check network connectivity
   - Review API rate limits

### Frontend Issues

1. **Portfolio not loading**
   - Check backend server is running
   - Verify authentication
   - Check browser console for errors

2. **Prices not updating**
   - Check network connectivity
   - Verify CoinDCX API status
   - Review React Query cache settings

## Support

For issues or questions:
1. Check the backend logs for detailed error information
2. Test the CoinDCX connection endpoint
3. Verify environment variables are set correctly
4. Check the browser console for frontend errors

## References

- [CoinDCX API Documentation](https://docs.coindcx.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/) 