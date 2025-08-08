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
const messageSchema = Joi.object({
  coinId: Joi.string().required(),
  content: Joi.string().min(1).max(1000).required()
});

const messagesQuerySchema = Joi.object({
  coinId: Joi.string().required(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  before: Joi.date().iso().optional()
});

// GET /api/chat/messages - Get chat messages for a coin
router.get('/messages', async (req, res) => {
  try {
    const { error: validationError, value } = messagesQuerySchema.validate(req.query);
    if (validationError) {
      return res.status(400).json({ error: validationError.details[0].message });
    }
    
    const { coinId, limit, offset, before } = value;
    
    let query = supabase
      .from('chat_messages')
      .select(`
        id,
        coin_id,
        content,
        created_at,
        users!inner(
          id,
          name,
          email
        )
      `)
      .eq('coin_id', coinId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (before) {
      query = query.lt('created_at', before.toISOString());
    }
    
    const { data: messages, error } = await query;
    
    if (error) {
      console.error('Error fetching chat messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
    
    const formattedMessages = messages?.map(msg => ({
      id: msg.id,
      content: msg.content,
      createdAt: msg.created_at,
      coinId: msg.coin_id,
      user: {
        id: msg.users[0].id,
        name: msg.users[0].name,
        email: msg.users[0].email
      }
    })).reverse() || []; // Reverse to show oldest first
    
    res.json({
      messages: formattedMessages,
      hasMore: messages?.length === limit,
      nextOffset: offset + limit
    });
    
  } catch (error) {
    console.error('Error in GET /messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/chat/messages - Send a chat message
router.post('/messages', async (req, res) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { error: validationError, value } = messageSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError.details[0].message });
    }
    
    const userId = await getUserIdFromSub(req.user.sub);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { coinId, content } = value;
    
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
    
    // Save message to database
    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        coin_id: coinId,
        content: content.trim()
      })
      .select(`
        id,
        content,
        created_at,
        users!inner(
          id,
          name,
          email
        )
      `)
      .single();
      
    if (error) {
      console.error('Error saving message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
    
    const formattedMessage = {
      id: newMessage.id,
      content: newMessage.content,
      createdAt: newMessage.created_at,
      coinId: coinId,
      user: {
        id: newMessage.users[0].id,
        name: newMessage.users[0].name,
        email: newMessage.users[0].email
      }
    };
    
    res.status(201).json({ message: formattedMessage });
    
  } catch (error) {
    console.error('Error in POST /messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/rooms - Get active chat rooms (coins with recent messages)
router.get('/rooms', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    
    // Get coins with recent chat activity
    const { data: activeRooms, error } = await supabase
      .from('chat_messages')
      .select(`
        coin_id,
        created_at,
        coins!inner(
          id,
          name,
          symbol,
          image_url,
          current_price,
          price_change_24h
        )
      `)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(limit * 5); // Get more to deduplicate
    
    if (error) {
      console.error('Error fetching active rooms:', error);
      return res.status(500).json({ error: 'Failed to fetch active rooms' });
    }
    
    // Deduplicate by coin_id and get message counts
    const roomsMap = new Map();
    const coinIds = new Set<string>();
    
    activeRooms?.forEach(msg => {
      if (!roomsMap.has(msg.coin_id)) {
        roomsMap.set(msg.coin_id, {
          coinId: msg.coin_id,
          coin: msg.coins,
          lastActivity: msg.created_at,
          messageCount: 0
        });
      }
      coinIds.add(msg.coin_id);
    });
    
    // Get message counts for each coin
    if (coinIds.size > 0) {
      const { data: messageCounts, error: countError } = await supabase
        .from('chat_messages')
        .select('coin_id')
        .in('coin_id', Array.from(coinIds))
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (!countError && messageCounts) {
        const counts = messageCounts.reduce((acc, msg) => {
          acc[msg.coin_id] = (acc[msg.coin_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        roomsMap.forEach((room, coinId) => {
          room.messageCount = counts[coinId] || 0;
        });
      }
    }
    
    const rooms = Array.from(roomsMap.values())
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, limit);
    
    res.json({
      rooms,
      totalCount: rooms.length
    });
    
  } catch (error) {
    console.error('Error in GET /rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/chat/messages/:messageId - Delete a message (only by author)
router.delete('/messages/:messageId', async (req, res) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { messageId } = req.params;
    
    const userId = await getUserIdFromSub(req.user.sub);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if message exists and belongs to user
    const { data: message, error: fetchError } = await supabase
      .from('chat_messages')
      .select('id, user_id')
      .eq('id', messageId)
      .single();
      
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Message not found' });
      }
      console.error('Error fetching message:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch message' });
    }
    
    if (message.user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }
    
    // Delete the message
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);
      
    if (deleteError) {
      console.error('Error deleting message:', deleteError);
      return res.status(500).json({ error: 'Failed to delete message' });
    }
    
    res.json({ message: 'Message deleted successfully' });
    
  } catch (error) {
    console.error('Error in DELETE /messages/:messageId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;