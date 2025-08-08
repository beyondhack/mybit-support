import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { getUserIdFromSub } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Validation schemas
const watchlistItemSchema = Joi.object({
  coinId: Joi.string().required(),
  notes: Joi.string().max(500).optional(),
  alertPrice: Joi.number().positive().optional(),
  alertEnabled: Joi.boolean().optional()
});

const portfolioTransactionSchema = Joi.object({
  coinId: Joi.string().required(),
  transactionType: Joi.string().valid('buy', 'sell').required(),
  quantity: Joi.number().positive().required(),
  pricePerUnit: Joi.number().positive().required()
});

const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  bio: Joi.string().max(500).optional(),
  location: Joi.string().max(100).optional(),
  website: Joi.string().uri().optional()
});

// GET /api/user/profile - Get user profile
router.get('/profile', async (req, res) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, auth0_sub, email, name, bio, location, website, created_at, updated_at')
      .eq('auth0_sub', req.user.sub)
      .single();
      
    if (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Format response to match frontend interface
    const formattedUser = {
      id: user.id,
      auth0Id: user.auth0_sub,
      email: user.email,
      name: user.name,
      bio: user.bio,
      location: user.location,
      website: user.website,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
    
    res.json(formattedUser);
    
  } catch (error) {
    console.error('Error in GET /profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', async (req, res) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { error: validationError, value } = userUpdateSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError.details[0].message });
    }
    
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        ...value,
        updated_at: new Date().toISOString()
      })
      .eq('auth0_sub', req.user.sub)
      .select('id, auth0_sub, email, name, bio, location, website, created_at, updated_at')
      .single();
      
    if (error) {
      console.error('Error updating user profile:', error);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }
    
    // Format response to match frontend interface
    const formattedUser = {
      id: updatedUser.id,
      auth0Id: updatedUser.auth0_sub,
      email: updatedUser.email,
      name: updatedUser.name,
      bio: updatedUser.bio,
      location: updatedUser.location,
      website: updatedUser.website,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    };
    
    res.json(formattedUser);
    
  } catch (error) {
    console.error('Error in PUT /profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/user/watchlist - Get user's watchlist
router.get('/watchlist', async (req, res) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = await getUserIdFromSub(req.user.sub);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { data: watchlistItems, error } = await supabase
      .from('watchlist_items')
      .select(`
        id,
        coin_id,
        notes,
        alert_price,
        alert_enabled,
        created_at,
        coins!inner(
          id,
          name,
          symbol,
          image_url,
          current_price,
          market_cap,
          price_change_24h,
          market_cap_rank
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching watchlist:', error);
      return res.status(500).json({ error: 'Failed to fetch watchlist' });
    }
    
    const formattedWatchlist = watchlistItems?.map(item => ({
      id: item.id,
      coinId: item.coin_id,
      notes: item.notes,
      alertPrice: item.alert_price,
      alertEnabled: item.alert_enabled,
      createdAt: item.created_at,
      coin: item.coins
    })) || [];
    
    res.json({
      watchlist: formattedWatchlist,
      totalCount: formattedWatchlist.length
    });
    
  } catch (error) {
    console.error('Error in GET /watchlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/user/watchlist - Add coin to watchlist
router.post('/watchlist', async (req, res) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { error: validationError, value } = watchlistItemSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError.details[0].message });
    }
    
    const userId = await getUserIdFromSub(req.user.sub);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { coinId, notes, alertPrice, alertEnabled } = value;
    
    // Check if coin exists in our database
    const { data: coin, error: coinError } = await supabase
      .from('coins')
      .select('id')
      .eq('id', coinId)
      .single();
      
    if (coinError && coinError.code !== 'PGRST116') {
      console.error('Error checking coin:', coinError);
      return res.status(500).json({ error: 'Failed to verify coin' });
    }
    
    if (!coin) {
      return res.status(404).json({ error: 'Coin not found' });
    }
    
    // Add to watchlist
    const { data: newWatchlistItem, error } = await supabase
      .from('watchlist_items')
      .insert({
        user_id: userId,
        coin_id: coinId,
        notes: notes || null,
        alert_price: alertPrice || null,
        alert_enabled: alertEnabled || false
      })
      .select(`
        id,
        coin_id,
        notes,
        alert_price,
        alert_enabled,
        created_at,
        coins!inner(
          id,
          name,
          symbol,
          image_url,
          current_price,
          market_cap,
          price_change_24h,
          market_cap_rank
        )
      `)
      .single();
      
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Coin already in watchlist' });
      }
      console.error('Error adding to watchlist:', error);
      return res.status(500).json({ error: 'Failed to add to watchlist' });
    }
    
    const formattedItem = {
      id: newWatchlistItem.id,
      coinId: newWatchlistItem.coin_id,
      notes: newWatchlistItem.notes,
      alertPrice: newWatchlistItem.alert_price,
      alertEnabled: newWatchlistItem.alert_enabled,
      createdAt: newWatchlistItem.created_at,
      coin: newWatchlistItem.coins
    };
    
    res.status(201).json({ watchlistItem: formattedItem });
    
  } catch (error) {
    console.error('Error in POST /watchlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/user/watchlist/:coinId - Remove coin from watchlist
router.delete('/watchlist/:coinId', async (req, res) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { coinId } = req.params;
    
    const userId = await getUserIdFromSub(req.user.sub);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('user_id', userId)
      .eq('coin_id', coinId);
      
    if (error) {
      console.error('Error removing from watchlist:', error);
      return res.status(500).json({ error: 'Failed to remove from watchlist' });
    }
    
    res.json({ message: 'Coin removed from watchlist' });
    
  } catch (error) {
    console.error('Error in DELETE /watchlist/:coinId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/user/portfolio - Get user's portfolio
router.get('/portfolio', async (req, res) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = await getUserIdFromSub(req.user.sub);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get all transactions
    const { data: transactions, error } = await supabase
      .from('portfolio_transactions')
      .select(`
        id,
        coin_id,
        transaction_type,
        quantity,
        price_per_unit,
        total_value,
        created_at,
        coins!inner(
          id,
          name,
          symbol,
          image_url,
          current_price,
          market_cap,
          price_change_24h,
          market_cap_rank
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching portfolio:', error);
      return res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
    
    // Calculate portfolio summary
    const holdings = new Map<string, {
      coinId: string;
      coin: any;
      totalQuantity: number;
      totalInvested: number;
      averagePrice: number;
      currentValue: number;
      profitLoss: number;
      profitLossPercentage: number;
    }>();
    
    transactions?.forEach(tx => {
      const existing = holdings.get(tx.coin_id) || {
        coinId: tx.coin_id,
        coin: tx.coins[0],
        totalQuantity: 0,
        totalInvested: 0,
        averagePrice: 0,
        currentValue: 0,
        profitLoss: 0,
        profitLossPercentage: 0
      };
      
      if (tx.transaction_type === 'buy') {
        existing.totalQuantity += tx.quantity;
        existing.totalInvested += tx.total_value;
      } else {
        existing.totalQuantity -= tx.quantity;
        existing.totalInvested -= tx.total_value;
      }
      
      if (existing.totalQuantity > 0) {
        existing.averagePrice = existing.totalInvested / existing.totalQuantity;
        existing.currentValue = existing.totalQuantity * (tx.coins[0].current_price || 0);
        existing.profitLoss = existing.currentValue - existing.totalInvested;
        existing.profitLossPercentage = existing.totalInvested > 0 
          ? (existing.profitLoss / existing.totalInvested) * 100 
          : 0;
      }
      
      holdings.set(tx.coin_id, existing);
    });
    
    // Filter out holdings with zero quantity
    const activeHoldings = Array.from(holdings.values()).filter(h => h.totalQuantity > 0);
    
    // Calculate total portfolio value
    const totalValue = activeHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalInvested = activeHoldings.reduce((sum, h) => sum + h.totalInvested, 0);
    const totalProfitLoss = totalValue - totalInvested;
    const totalProfitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
    
    res.json({
      holdings: activeHoldings,
      transactions: transactions?.map(tx => ({
        id: tx.id,
        coinId: tx.coin_id,
        transactionType: tx.transaction_type,
        quantity: tx.quantity,
        pricePerUnit: tx.price_per_unit,
        totalValue: tx.total_value,
        createdAt: tx.created_at,
        coin: tx.coins
      })) || [],
      summary: {
        totalValue,
        totalInvested,
        totalProfitLoss,
        totalProfitLossPercentage,
        holdingsCount: activeHoldings.length
      }
    });
    
  } catch (error) {
    console.error('Error in GET /portfolio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/user/portfolio/transaction - Add portfolio transaction
router.post('/portfolio/transaction', async (req, res) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { error: validationError, value } = portfolioTransactionSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError.details[0].message });
    }
    
    const userId = await getUserIdFromSub(req.user.sub);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { coinId, transactionType, quantity, pricePerUnit } = value;
    const totalValue = quantity * pricePerUnit;
    
    // Check if coin exists
    const { data: coin, error: coinError } = await supabase
      .from('coins')
      .select('id')
      .eq('id', coinId)
      .single();
      
    if (coinError && coinError.code !== 'PGRST116') {
      console.error('Error checking coin:', coinError);
      return res.status(500).json({ error: 'Failed to verify coin' });
    }
    
    if (!coin) {
      return res.status(404).json({ error: 'Coin not found' });
    }
    
    // Add transaction
    const { data: newTransaction, error } = await supabase
      .from('portfolio_transactions')
      .insert({
        user_id: userId,
        coin_id: coinId,
        transaction_type: transactionType,
        quantity,
        price_per_unit: pricePerUnit,
        total_value: totalValue
      })
      .select(`
        id,
        coin_id,
        transaction_type,
        quantity,
        price_per_unit,
        total_value,
        created_at,
        coins!inner(
          id,
          name,
          symbol,
          image_url,
          current_price,
          market_cap,
          price_change_24h,
          market_cap_rank
        )
      `)
      .single();
      
    if (error) {
      console.error('Error adding transaction:', error);
      return res.status(500).json({ error: 'Failed to add transaction' });
    }
    
    const formattedTransaction = {
      id: newTransaction.id,
      coinId: newTransaction.coin_id,
      transactionType: newTransaction.transaction_type,
      quantity: newTransaction.quantity,
      pricePerUnit: newTransaction.price_per_unit,
      totalValue: newTransaction.total_value,
      createdAt: newTransaction.created_at,
      coin: newTransaction.coins
    };
    
    res.status(201).json({ transaction: formattedTransaction });
    
  } catch (error) {
    console.error('Error in POST /portfolio/transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;