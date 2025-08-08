import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  auth0Id: string;
  email: string;
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coin {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  image_url?: string;
  current_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
  total_volume?: number;
  high_24h?: number;
  low_24h?: number;
  circulating_supply?: number;
  total_supply?: number;
  max_supply?: number;
  ath?: number;
  ath_change_percentage?: number;
  ath_date?: string;
  atl?: number;
  atl_change_percentage?: number;
  atl_date?: string;
  last_updated?: string;
}

export interface WatchlistItem {
  id: string;
  coinId: string;
  notes?: string;
  alertPrice?: number;
  alertEnabled: boolean;
  createdAt: string;
  coin: Coin;
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  coinId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PortfolioTransaction {
  id: string;
  coinId: string;
  transactionType: 'buy' | 'sell';
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  createdAt: string;
  coin: Coin;
}

export interface PortfolioHolding {
  coinId: string;
  coin: Coin;
  totalQuantity: number;
  totalInvested: number;
  averagePrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  holdingsCount: number;
}