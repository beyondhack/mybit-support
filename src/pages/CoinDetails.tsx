import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Plus, 
  Minus, 
  ExternalLink, 
  MessageCircle,
  BarChart3,
  Globe,
  Users
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useSocket } from '@/lib/socket';
import { Coin, ChatMessage } from '@/lib/supabase';

export default function CoinDetails() {
  const { coinId } = useParams<{ coinId: string }>();
  const { isAuthenticated } = useAuth0();
  const socketManager = useSocket();
  const chatSocket = socketManager.chatSocketInstance;
  const [coin, setCoin] = useState<Coin | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    type: 'buy' as 'buy' | 'sell',
    quantity: '',
    price: ''
  });

  useEffect(() => {
    if (coinId) {
      fetchCoinDetails();
      if (isAuthenticated) {
        checkWatchlistStatus();
        joinChatRoom();
      }
    }
  }, [coinId, isAuthenticated]);

  useEffect(() => {
    if (!chatSocket || !coinId) return;

    chatSocket.on('message', (message: ChatMessage) => {
      if (message.coinId === coinId) {
        setMessages(prev => [...prev, message]);
      }
    });

    chatSocket.on('userJoined', ({ coinId: roomCoinId, userCount }: { coinId: string; userCount: number }) => {
      if (roomCoinId === coinId) {
        setOnlineUsers(userCount);
      }
    });

    chatSocket.on('userLeft', ({ coinId: roomCoinId, userCount }: { coinId: string; userCount: number }) => {
      if (roomCoinId === coinId) {
        setOnlineUsers(userCount);
      }
    });

    return () => {
      chatSocket.off('message');
      chatSocket.off('userJoined');
      chatSocket.off('userLeft');
    };
  }, [chatSocket, coinId]);

  const fetchCoinDetails = async () => {
    if (!coinId) return;

    try {
      setLoading(true);
      const coinData = await apiClient.getCoinDetails(coinId);
      setCoin(coinData);
      setTransactionForm(prev => ({ ...prev, price: coinData.current_price?.toString() || '' }));
    } catch (err) {
      console.error('Error fetching coin details:', err);
      setError('Failed to load coin details');
    } finally {
      setLoading(false);
    }
  };

  const checkWatchlistStatus = async () => {
    if (!coinId) return;

    try {
      const watchlist = await apiClient.getWatchlist();
      setIsInWatchlist(watchlist.watchlist.some(item => item.coinId === coinId));
    } catch (err) {
      console.error('Error checking watchlist status:', err);
    }
  };

  const joinChatRoom = async () => {
    if (!coinId || !chatSocket) return;

    try {
      setLoadingMessages(true);
      chatSocket.emit('joinRoom', coinId);
      const roomMessages = await apiClient.getChatMessages(coinId);
      setMessages(roomMessages.messages || []);
    } catch (err) {
      console.error('Error joining chat room:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const toggleWatchlist = async () => {
    if (!coinId || !coin) return;

    try {
      setAddingToWatchlist(true);
      if (isInWatchlist) {
        await apiClient.removeFromWatchlist(coinId);
        setIsInWatchlist(false);
      } else {
        await apiClient.addToWatchlist({
          coinId: coinId
        });
        setIsInWatchlist(true);
      }
    } catch (err) {
      console.error('Error updating watchlist:', err);
      alert('Failed to update watchlist');
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const addTransaction = async () => {
    if (!coinId || !transactionForm.quantity || !transactionForm.price) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await apiClient.addTransaction({
        coinId: coinId,
        transactionType: transactionForm.type,
        quantity: parseFloat(transactionForm.quantity),
        pricePerUnit: parseFloat(transactionForm.price)
      });
      
      setShowAddTransaction(false);
      setTransactionForm(prev => ({ ...prev, quantity: '' }));
      alert('Transaction added successfully!');
    } catch (err) {
      console.error('Error adding transaction:', err);
      alert('Failed to add transaction');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !coinId || !chatSocket) return;

    try {
      const messageData = {
        coinId: coinId,
        content: newMessage.trim()
      };

      chatSocket.emit('sendMessage', messageData);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
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

  const formatVolume = (volume: number | undefined) => {
    if (!volume) return 'N/A';
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toLocaleString()}`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !coin) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Coin</h3>
            <p className="text-red-600">{error || 'Coin not found'}</p>
            <Link
              to="/"
              className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            {coin.image_url && (
              <img
                className="h-12 w-12 rounded-full mr-4"
                src={coin.image_url}
                alt={coin.name}
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{coin.name}</h1>
              <p className="text-gray-600 uppercase text-lg font-medium">{coin.symbol}</p>
            </div>
          </div>
          
          {isAuthenticated && (
            <div className="flex space-x-3">
              <button
                onClick={toggleWatchlist}
                disabled={addingToWatchlist}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition-colors ${
                  isInWatchlist
                    ? 'border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <Star className={`w-4 h-4 mr-2 ${isInWatchlist ? 'fill-current' : ''}`} />
                {addingToWatchlist ? 'Loading...' : isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
              </button>
              
              <button
                onClick={() => setShowAddTransaction(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Current Price</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(coin.current_price)}</p>
                  {coin.price_change_percentage_24h !== undefined && (
                    <div className={`flex items-center mt-1 ${
                      coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {coin.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      <span className="text-sm font-medium">
                        {formatPercentage(coin.price_change_percentage_24h)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Market Cap</p>
                  <p className="text-xl font-semibold text-gray-900">{formatMarketCap(coin.market_cap)}</p>
                  {coin.market_cap_rank && (
                    <p className="text-sm text-gray-500">Rank #{coin.market_cap_rank}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">24h Volume</p>
                  <p className="text-xl font-semibold text-gray-900">{formatVolume(coin.total_volume)}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Circulating Supply</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {coin.circulating_supply ? `${coin.circulating_supply.toLocaleString()} ${coin.symbol.toUpperCase()}` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Price Chart</h2>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">24H</button>
                  <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">7D</button>
                  <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">30D</button>
                  <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">1Y</button>
                </div>
              </div>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Chart integration coming soon</p>
                  <p className="text-sm text-gray-400">Price history and technical analysis</p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Price Range (24h)</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      Low: {formatPrice(coin.low_24h)}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-900">
                      High: {formatPrice(coin.high_24h)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">All-Time High</h3>
                  <div className="text-sm text-gray-900">
                    {formatPrice(coin.ath)}
                    {coin.ath_date && (
                      <span className="text-gray-500 ml-2">
                        ({new Date(coin.ath_date).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">All-Time Low</h3>
                  <div className="text-sm text-gray-900">
                    {formatPrice(coin.atl)}
                    {coin.atl_date && (
                      <span className="text-gray-500 ml-2">
                        ({new Date(coin.atl_date).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Last Updated</h3>
                  <div className="text-sm text-gray-900">
                    {coin.last_updated ? new Date(coin.last_updated).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {isAuthenticated && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link
                    to="/portfolio"
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Portfolio
                  </Link>
                  
                  <Link
                    to="/watchlist"
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Manage Watchlist
                  </Link>
                </div>
              </div>
            )}

            {/* Live Chat */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Live Chat</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-1" />
                    {onlineUsers} online
                  </div>
                </div>
              </div>
              
              <div className="h-64 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  messages.slice(-10).map((message) => (
                    <div key={message.id} className="text-sm">
                      <div className="font-medium text-gray-900 text-xs mb-1">
                        {message.user.name || message.user.email?.split('@')[0] || 'Anonymous'}
                        <span className="text-gray-500 ml-2">{formatTime(message.createdAt)}</span>
                      </div>
                      <div className="text-gray-700">{message.content}</div>
                    </div>
                  ))
                )}
              </div>
              
              {isAuthenticated && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Type a message..."
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                  <Link
                    to="/chat"
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    View full chat →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Transaction Modal */}
        {showAddTransaction && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Transaction</h3>
                  <button
                    onClick={() => setShowAddTransaction(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-md">
                    {coin.image_url && (
                      <img
                        className="h-8 w-8 rounded-full mr-3"
                        src={coin.image_url}
                        alt={coin.name}
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{coin.name}</div>
                      <div className="text-xs text-gray-500 uppercase">{coin.symbol}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                    <select
                      value={transactionForm.type}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      step="any"
                      value={transactionForm.quantity}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price per Unit (USD)</label>
                    <input
                      type="number"
                      step="any"
                      value={transactionForm.price}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, price: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  {transactionForm.quantity && transactionForm.price && (
                    <div className="p-3 bg-blue-50 rounded-md">
                      <div className="text-sm text-blue-800">
                        Total: {formatPrice(parseFloat(transactionForm.quantity) * parseFloat(transactionForm.price))}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowAddTransaction(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addTransaction}
                      className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Add Transaction
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}