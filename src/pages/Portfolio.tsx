import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, TrendingUp, TrendingDown, Plus, DollarSign, BarChart3, Activity } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PortfolioHolding, PortfolioTransaction, PortfolioSummary, Coin } from '@/lib/supabase';

export default function Portfolio() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [searchResults, setSearchResults] = useState<Coin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [transactionForm, setTransactionForm] = useState({
    type: 'buy' as 'buy' | 'sell',
    quantity: '',
    price: ''
  });

  useEffect(() => {
    fetchPortfolio();
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

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPortfolio();
      setHoldings(data.holdings);
      setTransactions(data.transactions);
      setSummary(data.summary);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async () => {
    if (!selectedCoin || !transactionForm.quantity || !transactionForm.price) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await apiClient.addTransaction({
        coinId: selectedCoin.id,
        transactionType: transactionForm.type,
        quantity: parseFloat(transactionForm.quantity),
        pricePerUnit: parseFloat(transactionForm.price)
      });
      
      // Refresh portfolio data
      await fetchPortfolio();
      
      // Reset form
      setShowAddModal(false);
      setSelectedCoin(null);
      setTransactionForm({ type: 'buy', quantity: '', price: '' });
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error adding transaction:', err);
      alert('Failed to add transaction');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio</h1>
            <p className="text-gray-600">Track your virtual cryptocurrency investments</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Portfolio</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchPortfolio}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Portfolio Summary */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Value</p>
                      <p className="text-2xl font-bold text-gray-900">{formatPrice(summary.totalValue)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Invested</p>
                      <p className="text-2xl font-bold text-gray-900">{formatPrice(summary.totalInvested)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${
                      summary.totalProfitLoss >= 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {summary.totalProfitLoss >= 0 ? (
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">P&L</p>
                      <p className={`text-2xl font-bold ${
                        summary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPrice(summary.totalProfitLoss)}
                      </p>
                      <p className={`text-sm ${
                        summary.totalProfitLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(summary.totalProfitLossPercentage)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <PieChart className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Holdings</p>
                      <p className="text-2xl font-bold text-gray-900">{summary.holdingsCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Holdings */}
            {holdings.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center mb-8">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No holdings yet</h3>
                <p className="text-gray-600 mb-6">Start building your virtual portfolio</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Transaction
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Current Holdings</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Coin
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Holdings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          P&L
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {holdings.map((holding) => (
                        <tr key={holding.coinId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {holding.coin.image_url && (
                                <img
                                  className="h-8 w-8 rounded-full mr-3"
                                  src={holding.coin.image_url}
                                  alt={holding.coin.name}
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{holding.coin.name}</div>
                                <div className="text-sm text-gray-500 uppercase">{holding.coin.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {holding.totalQuantity.toFixed(6)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(holding.averagePrice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(holding.coin.current_price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(holding.currentValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className={holding.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                              <div className="font-medium">{formatPrice(holding.profitLoss)}</div>
                              <div className="text-xs">{formatPercentage(holding.profitLossPercentage)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              to={`/coin/${holding.coinId}`}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            {transactions.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Coin
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.slice(0, 10).map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              transaction.transactionType === 'buy'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.transactionType.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {transaction.coin.image_url && (
                                <img
                                  className="h-6 w-6 rounded-full mr-2"
                                  src={transaction.coin.image_url}
                                  alt={transaction.coin.name}
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{transaction.coin.name}</div>
                                <div className="text-xs text-gray-500 uppercase">{transaction.coin.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.quantity.toFixed(6)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(transaction.pricePerUnit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPrice(transaction.totalValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add Transaction Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Transaction</h3>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedCoin(null);
                      setTransactionForm({ type: 'buy', quantity: '', price: '' });
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                {!selectedCoin ? (
                  <>
                    <div className="relative mb-4">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                        {searchResults.map((coin) => (
                          <div
                            key={coin.id}
                            onClick={() => {
                              setSelectedCoin(coin);
                              setTransactionForm(prev => ({ ...prev, price: coin.current_price?.toString() || '' }));
                            }}
                            className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            {coin.image_url && (
                              <img
                                className="h-6 w-6 rounded-full mr-3"
                                src={coin.image_url}
                                alt={coin.name}
                              />
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{coin.name}</div>
                              <div className="text-xs text-gray-500 uppercase">{coin.symbol}</div>
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatPrice(coin.current_price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      {selectedCoin.image_url && (
                        <img
                          className="h-8 w-8 rounded-full mr-3"
                          src={selectedCoin.image_url}
                          alt={selectedCoin.name}
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{selectedCoin.name}</div>
                        <div className="text-xs text-gray-500 uppercase">{selectedCoin.symbol}</div>
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
                        onClick={() => setSelectedCoin(null)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={addTransaction}
                        className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        Add Transaction
                      </button>
                    </div>
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