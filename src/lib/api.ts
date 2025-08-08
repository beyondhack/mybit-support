import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { Coin, WatchlistItem, PortfolioTransaction, PortfolioHolding, PortfolioSummary, ChatMessage, User } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('auth0_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth0_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const apiClient = {
  // Coins
  getTrendingCoins: async (): Promise<Coin[]> => {
    const response = await api.get('/coins/trending');
    return response.data.coins;
  },

  getCoinsMarketData: async (ids: string[], vsCurrency = 'usd'): Promise<Coin[]> => {
    const response = await api.get('/coins/market', {
      params: { ids: ids.join(','), vs_currency: vsCurrency }
    });
    return response.data.coins;
  },

  getCoinDetails: async (id: string, vsCurrency = 'usd'): Promise<Coin> => {
    const response = await api.get(`/coins/${id}`, {
      params: { vs_currency: vsCurrency }
    });
    return response.data.coin;
  },

  searchCoins: async (query: string): Promise<Coin[]> => {
    const response = await api.get('/coins/search', {
      params: { q: query }
    });
    return response.data.coins;
  },

  // User Profile
  getUserProfile: async (): Promise<User> => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  updateUserProfile: async (data: { name?: string; bio?: string; location?: string; website?: string }): Promise<User> => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  // Watchlist
  getWatchlist: async (): Promise<{ watchlist: WatchlistItem[]; totalCount: number }> => {
    const response = await api.get('/user/watchlist');
    return response.data;
  },

  addToWatchlist: async (data: {
    coinId: string;
    notes?: string;
    alertPrice?: number;
    alertEnabled?: boolean;
  }): Promise<WatchlistItem> => {
    const response = await api.post('/user/watchlist', data);
    return response.data.watchlistItem;
  },

  removeFromWatchlist: async (coinId: string): Promise<void> => {
    await api.delete(`/user/watchlist/${coinId}`);
  },

  // Portfolio
  getPortfolio: async (): Promise<{
    holdings: PortfolioHolding[];
    transactions: PortfolioTransaction[];
    summary: PortfolioSummary;
  }> => {
    const response = await api.get('/user/portfolio');
    return response.data;
  },

  addTransaction: async (data: {
    coinId: string;
    transactionType: 'buy' | 'sell';
    quantity: number;
    pricePerUnit: number;
  }): Promise<PortfolioTransaction> => {
    const response = await api.post('/user/portfolio/transaction', data);
    return response.data.transaction;
  },

  // Chat
  getChatMessages: async (coinId: string, params?: {
    limit?: number;
    offset?: number;
    before?: string;
  }): Promise<{
    messages: ChatMessage[];
    hasMore: boolean;
    nextOffset: number;
  }> => {
    const response = await api.get('/chat/messages', {
      params: { coinId, ...params }
    });
    return response.data;
  },

  sendChatMessage: async (data: {
    coinId: string;
    content: string;
  }): Promise<ChatMessage> => {
    const response = await api.post('/chat/messages', data);
    return response.data.message;
  },

  getChatRooms: async (limit = 20): Promise<{
    rooms: Array<{
      coinId: string;
      coin: Coin;
      lastActivity: string;
      messageCount: number;
    }>;
    totalCount: number;
  }> => {
    const response = await api.get('/chat/rooms', {
      params: { limit }
    });
    return response.data;
  },

  deleteChatMessage: async (messageId: string): Promise<void> => {
    await api.delete(`/chat/messages/${messageId}`);
  },
};

// Hook to set auth token
export const useApiAuth = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const setAuthToken = async () => {
    if (isAuthenticated) {
      try {
        const token = await getAccessTokenSilently();
        localStorage.setItem('auth0_token', token);
      } catch (error) {
        console.error('Error getting access token:', error);
      }
    }
  };

  return { setAuthToken };
};

export default api;