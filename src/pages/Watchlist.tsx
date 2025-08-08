import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Trash2, Plus, Search, TrendingUp, TrendingDown, Bell, BellOff } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { WatchlistItem, Coin } from '@/lib/supabase';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [searchResults, setSearchResults] = useState<Coin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    const searchCoins = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setSearching(true);
        const results = await apiClient.searchCoins(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching coins:', err);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchCoins, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getWatchlist();
      setWatchlist(data.watchlist);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      setError('Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async (coinId: string) => {
    try {
      const newItem = await apiClient.addToWatchlist({ coinId });
      setWatchlist(prev => [newItem, ...prev]);
      setShowAddModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      alert('Failed to add coin to watchlist');
    }
  };

  const removeFromWatchlist = async (coinId: string) => {
    try {
      await apiClient.removeFromWatchlist(coinId);
      setWatchlist(prev => prev.filter(item => item.coinId !== coinId));
    } catch (err) {
      console.error('Error removing from watchlist:', err);
      alert('Failed to remove coin from watchlist');
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price);
  };

  const formatPercentage = (percentage: number | undefined) => {
    if (percentage === undefined || percentage === null) return 'N/A';
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const formatMarketCap = (marketCap: number | undefined) => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center py-4 border-b border-gray-200 last:border-b-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full mr-4"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Watchlist</h1>
            <p className="text-gray-600">Track your favorite cryptocurrencies</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Coin
          </button>
        </div>

        {/* Watchlist */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Watchlist</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchWatchlist}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No coins in your watchlist</h3>
            <p className="text-gray-600 mb-6">Start tracking your favorite cryptocurrencies</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Coin
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      24h Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Market Cap
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alert
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {watchlist.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.coin.image_url && (
                            <img
                              className="h-8 w-8 rounded-full mr-3"
                              src={item.coin.image_url}
                              alt={item.coin.name}
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.coin.name}</div>
                            <div className="text-sm text-gray-500 uppercase">{item.coin.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPrice(item.coin.current_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center ${
                          (item.coin.price_change_24h || 0) >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {(item.coin.price_change_24h || 0) >= 0 ? (
                            <TrendingUp className="w-4 h-4 mr-1" />
                          ) : (
                            <TrendingDown className="w-4 h-4 mr-1" />
                          )}
                          {formatPercentage(item.coin.price_change_24h)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatMarketCap(item.coin.market_cap)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          {item.alertEnabled ? (
                            <Bell className="w-4 h-4 text-blue-600 mr-1" />
                          ) : (
                            <BellOff className="w-4 h-4 text-gray-400 mr-1" />
                          )}
                          {item.alertPrice ? formatPrice(item.alertPrice) : 'None'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/coin/${item.coinId}`}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => removeFromWatchlist(item.coinId)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Coin Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Coin to Watchlist</h3>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search for a cryptocurrency..."
                  />
                </div>

                {searching && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                    {searchResults.map((coin) => {
                      const isInWatchlist = watchlist.some(item => item.coinId === coin.id);
                      return (
                        <div
                          key={coin.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center">
                            {coin.image_url && (
                              <img
                                className="h-6 w-6 rounded-full mr-3"
                                src={coin.image_url}
                                alt={coin.name}
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{coin.name}</div>
                              <div className="text-xs text-gray-500 uppercase">{coin.symbol}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => addToWatchlist(coin.id)}
                            disabled={isInWatchlist}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                              isInWatchlist
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isInWatchlist ? 'Added' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No coins found for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}