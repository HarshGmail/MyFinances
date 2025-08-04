import axios from 'axios';
import { QuoteSummaryResult, StockData, StockSearchResponse } from '../utils/types';
import { defaultStockInfoOptions } from './stockServiceHelper';
import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';

export class StocksService {
  static async fetchNSEQuotes(symbols: string[]): Promise<Record<string, StockData | null>> {
    const results: [string, StockData | null][] = [];

    for (const symbol of symbols) {
      try {
        const yfSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?interval=1d&range=1y`;
        const response = await axios.get(url);
        results.push([symbol, response.data]);
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Yahoo API error:', error.message);
        results.push([symbol, null]);
      }

      if (symbol !== symbols[symbols.length - 1]) {
        await new Promise((res) => setTimeout(res, 1000));
      }
    }

    return Object.fromEntries(results);
  }

  static async searchStocks(query: string): Promise<StockSearchResponse[]> {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=6&newsCount=3&listsCount=2&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=false&enableNavLinks=true&enableEnhancedTrivialQuery=true&enableResearchReports=true&enableCulturalAssets=true&enableLogoUrl=true&enableLists=false&recommendCount=5&enablePrivateCompany=true`;
    const response = await axios.get(url);
    const quotes: StockSearchResponse[] = response.data.quotes || [];
    // @ts-expect-error stock
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return quotes.filter((q) => q.exchange === 'NSI').map(({ isYahooFinance, ...rest }) => rest);
  }

  static async getFullStockProfile(symbol: string, range = '1y', interval = '1d') {
    const now = Math.floor(Date.now() / 1000);
    let startTime: number;

    switch (range) {
      case '1d':
        startTime = now - 86400;
        break;
      case '1w':
        startTime = now - 604800;
        break;
      case '1m':
        startTime = now - 2592000;
        break;
      case '3m':
        startTime = now - 7776000;
        break;
      case '6m':
        startTime = now - 15552000;
        break;
      case '5y':
        startTime = now - 157680000;
        break;
      case 'max':
        startTime = 493590046;
        break;
      default:
        startTime = now - 31536000;
    }

    const yfSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;

    const endpoints = [
      // `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yfSymbol}?formatted=true&modules=incomeStatementHistory%2CcashflowStatementHistory%2CbalanceSheetHistory%2CincomeStatementHistoryQuarterly%2CcashflowStatementHistoryQuarterly%2CbalanceSheetHistoryQuarterly&enablePrivateCompany=true&overnightPrice=true&lang=en-US&region=US&crumb=2mSQjIzO7Qe`,
      // `https://query1.finance.yahoo.com/v7/finance/quote?fields=fiftyTwoWeekHigh%2CfiftyTwoWeekLow%2CfromCurrency%2CfromExchange%2CheadSymbolAsString%2ClogoUrl%2ClongName%2CmarketCap%2CmessageBoardId%2CoptionsType%2CovernightMarketTime%2CovernightMarketPrice%2CovernightMarketChange%2CovernightMarketChangePercent%2CregularMarketTime%2CregularMarketChange%2CregularMarketChangePercent%2CregularMarketOpen%2CregularMarketPrice%2CregularMarketSource%2CregularMarketVolume%2CpostMarketTime%2CpostMarketPrice%2CpostMarketChange%2CpostMarketChangePercent%2CpreMarketTime%2CpreMarketPrice%2CpreMarketChange%2CpreMarketChangePercent%2CshortName%2CtoCurrency%2CtoExchange%2CunderlyingExchangeSymbol%2CunderlyingSymbol%2CstockStory%2CquartrId&formatted=true&imgHeights=50&imgLabels=logoUrl&imgWidths=50&symbols=${yfSymbol}&enablePrivateCompany=true&overnightPrice=true&topPickThisMonth=true&lang=en-US&region=US&crumb=2mSQjIzO7Qe`,
      // `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yfSymbol}?formatted=true&modules=upgradeDowngradeHistory%2CearningsHistory%2CearningsTrend%2CindustryTrend%2CindexTrend%2CsectorTrend&enablePrivateCompany=true&overnightPrice=true&lang=en-US&region=US&crumb=2mSQjIzO7Qe`,
      `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${yfSymbol}?merge=false&padTimeSeries=true&period1=${startTime}&period2=${now}&type=${defaultStockInfoOptions.join('%2C')}&lang=en-US&region=US`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${yfSymbol}?period1=${startTime}&period2=${now}&interval=${interval}&includePrePost=true&events=div%7Csplit%7Cearn&lang=en-US&region=US&source=cosaic`,
    ];
    const [trends, chartData] = await Promise.all(
      endpoints.map((url) =>
        axios
          .get(url)
          .then((res) => res.data)
          .catch((err) => {
            console.error(`Error fetching ${url}:`, err.message);
            return null;
          })
      )
    );

    // const financials = await this.fetchQuoteSummaryViaBrowser(yfSymbol);

    return {
      //   financials,
      trends,
      chartData,
    };
  }
  static async fetchQuoteSummaryViaBrowser(symbol: string): Promise<QuoteSummaryResult | null> {
    const yfSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
    const isProduction = process.env.NODE_ENV === 'production';

    const browser = await puppeteer.launch(
      isProduction
        ? {
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            defaultViewport: chromium.defaultViewport,
          }
        : {
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [],
          }
    );

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36'
      );

      const stockUrl = `https://finance.yahoo.com/quote/${yfSymbol}/financials`;
      console.log(`Navigating to: ${stockUrl}`);
      await page.goto(stockUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      const jsonData = await page.evaluate(() => {
        try {
          const scriptTag = Array.from(document.querySelectorAll('script')).find((el) =>
            el.textContent?.includes('root.App.main')
          );
          if (!scriptTag) return null;

          const rawText = scriptTag.textContent || '';
          const match = rawText.match(/root\.App\.main = (.*?);\n/);
          if (!match || match.length < 2) return null;

          return JSON.parse(match[1]);
        } catch (err: unknown) {
          const error = err as Error;
          console.log(error.message);
          return null;
        }
      });

      if (!jsonData) {
        console.warn('⚠️ Failed to extract financials from page script.');
        return null;
      }

      const result: QuoteSummaryResult = jsonData.context?.dispatcher?.stores?.QuoteSummaryStore;
      return result ?? null;
    } catch (err) {
      console.error('❌ Puppeteer error:', err);
      return null;
    } finally {
      await browser.close();
    }
  }
}
