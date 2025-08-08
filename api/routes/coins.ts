import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// CoinGecko API configuration
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY;

// Create axios instance with default config
const coinGeckoApi = axios.create({
  baseURL: COINGECKO_BASE_URL,
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    ...(API_KEY && { 'x-cg-demo-api-key': API_KEY })
  }
});

// Cache for API responses (simple in-memory cache)
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache helper functions
function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any, ttlMinutes: number = 5) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000
  });
}

// GET /api/coins/trending - Get trending coins
router.get('/trending', async (req, res) => {
  try {
    const cacheKey = 'trending_coins';
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    // Fetch from CoinGecko
    const response = await coinGeckoApi.get('/search/trending');
    const trendingCoins = response.data.coins.map((item: any) => ({
      id: item.item.id,
      name: item.item.name,
      symbol: item.item.symbol,
      market_cap_rank: item.item.market_cap_rank,
      thumb: item.item.thumb,
      small: item.item.small,
      large: item.item.large,
      price_btc: item.item.price_btc
    }));
    
    const result = {
      coins: trendingCoins,
      lastUpdated: new Date().toISOString(),
      cacheExpiry: 300 // 5 minutes
    };
    
    setCachedData(cacheKey, result, 5);
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching trending coins:', error);
    res.status(500).json({ 
      error: 'Failed to fetch trending coins',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/coins/market - Get market data for multiple coins
router.get('/market', async (req, res) => {
  try {
    const { 
      ids = 'bitcoin,ethereum,cardano,polkadot,chainlink',
      vs_currency = 'usd',
      order = 'market_cap_desc',
      per_page = '10',
      page = '1',
      sparkline = 'true',
      price_change_percentage = '24h'
    } = req.query;
    
    const cacheKey = `market_${ids}_${vs_currency}_${page}_${per_page}`;
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    const response = await coinGeckoApi.get('/coins/markets', {
      params: {
        ids,
        vs_currency,
        order,
        per_page,
        page,
        sparkline,
        price_change_percentage
      }
    });
    
    const marketData = response.data.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      market_cap_rank: coin.market_cap_rank,
      fully_diluted_valuation: coin.fully_diluted_valuation,
      total_volume: coin.total_volume,
      high_24h: coin.high_24h,
      low_24h: coin.low_24h,
      price_change_24h: coin.price_change_24h,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      market_cap_change_24h: coin.market_cap_change_24h,
      market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h,
      circulating_supply: coin.circulating_supply,
      total_supply: coin.total_supply,
      max_supply: coin.max_supply,
      ath: coin.ath,
      ath_change_percentage: coin.ath_change_percentage,
      ath_date: coin.ath_date,
      atl: coin.atl,
      atl_change_percentage: coin.atl_change_percentage,
      atl_date: coin.atl_date,
      roi: coin.roi,
      last_updated: coin.last_updated,
      sparkline_in_7d: coin.sparkline_in_7d
    }));
    
    const result = {
      coins: marketData,
      lastUpdated: new Date().toISOString(),
      cacheExpiry: 60 // 1 minute
    };
    
    setCachedData(cacheKey, result, 1);
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch market data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/coins/:id/market - Get detailed market data for a specific coin
router.get('/:id/market', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      vs_currency = 'usd',
      days = '7',
      interval = 'daily'
    } = req.query;
    
    const cacheKey = `coin_${id}_${vs_currency}_${days}`;
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    // Fetch coin details and price history in parallel
    const [coinResponse, historyResponse] = await Promise.all([
      coinGeckoApi.get(`/coins/${id}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: true
        }
      }),
      coinGeckoApi.get(`/coins/${id}/market_chart`, {
        params: {
          vs_currency,
          days,
          interval
        }
      })
    ]);
    
    const coin = coinResponse.data;
    const history = historyResponse.data;
    
    const result = {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      description: coin.description?.en || '',
      market_cap_rank: coin.market_cap_rank,
      current_price: coin.market_data.current_price[vs_currency as string],
      market_cap: coin.market_data.market_cap[vs_currency as string],
      fully_diluted_valuation: coin.market_data.fully_diluted_valuation[vs_currency as string],
      total_volume: coin.market_data.total_volume[vs_currency as string],
      high_24h: coin.market_data.high_24h[vs_currency as string],
      low_24h: coin.market_data.low_24h[vs_currency as string],
      price_change_24h: coin.market_data.price_change_24h,
      price_change_percentage_24h: coin.market_data.price_change_percentage_24h,
      market_cap_change_24h: coin.market_data.market_cap_change_24h,
      market_cap_change_percentage_24h: coin.market_data.market_cap_change_percentage_24h,
      circulating_supply: coin.market_data.circulating_supply,
      total_supply: coin.market_data.total_supply,
      max_supply: coin.market_data.max_supply,
      ath: coin.market_data.ath[vs_currency as string],
      ath_change_percentage: coin.market_data.ath_change_percentage[vs_currency as string],
      ath_date: coin.market_data.ath_date[vs_currency as string],
      atl: coin.market_data.atl[vs_currency as string],
      atl_change_percentage: coin.market_data.atl_change_percentage[vs_currency as string],
      atl_date: coin.market_data.atl_date[vs_currency as string],
      price_history: history.prices,
      market_cap_history: history.market_caps,
      volume_history: history.total_volumes,
      lastUpdated: new Date().toISOString(),
      cacheExpiry: 300 // 5 minutes
    };
    
    setCachedData(cacheKey, result, 5);
    
    // Update coin data in our database
    await updateCoinInDatabase({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      image_url: coin.image?.large || coin.image?.small || coin.image?.thumb,
      current_price: coin.market_data.current_price[vs_currency as string],
      market_cap: coin.market_data.market_cap[vs_currency as string],
      price_change_24h: coin.market_data.price_change_percentage_24h,
      market_cap_rank: coin.market_cap_rank
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching coin market data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch coin market data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/coins/search - Search coins
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const cacheKey = `search_${query.toLowerCase()}`;
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    const response = await coinGeckoApi.get('/search', {
      params: { query }
    });
    
    const result = {
      coins: response.data.coins.slice(0, 10).map((coin: any) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        market_cap_rank: coin.market_cap_rank,
        thumb: coin.thumb,
        large: coin.large
      })),
      lastUpdated: new Date().toISOString(),
      cacheExpiry: 600 // 10 minutes
    };
    
    setCachedData(cacheKey, result, 10);
    res.json(result);
    
  } catch (error) {
    console.error('Error searching coins:', error);
    res.status(500).json({ 
      error: 'Failed to search coins',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to update coin data in database
async function updateCoinInDatabase(coinData: any) {
  try {
    const { error } = await supabase
      .from('coins')
      .upsert({
        id: coinData.id,
        name: coinData.name,
        symbol: coinData.symbol,
        image_url: coinData.image_url,
        current_price: coinData.current_price,
        market_cap: coinData.market_cap,
        price_change_24h: coinData.price_change_24h,
        market_cap_rank: coinData.market_cap_rank,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
      
    if (error) {
      console.error('Error updating coin in database:', error);
    }
  } catch (error) {
    console.error('Error in updateCoinInDatabase:', error);
  }
}

export default router;