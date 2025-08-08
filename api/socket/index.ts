import { Server } from 'socket.io';
import { socketAuthMiddleware, getUserIdFromSub } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface ChatMessage {
  id: string;
  coinId: string;
  message: string;
  userId: string;
  userName: string;
  timestamp: string;
}

interface SocketUser {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

// Extend Socket interface to include user property
declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

export function setupSocketIO(io: Server) {
  // Chat namespace
  const chatNamespace = io.of('/chat');
  
  // Authentication middleware for chat namespace
  chatNamespace.use(socketAuthMiddleware);
  
  chatNamespace.on('connection', (socket) => {
    const user = socket.user as SocketUser;
    console.log(`User connected to chat: ${user.email || user.sub}`);
    
    // Join room for specific coin
    socket.on('join_room', async (data: { coinId: string }) => {
      try {
        const { coinId } = data;
        
        if (!coinId) {
          socket.emit('error', { message: 'Coin ID is required' });
          return;
        }
        
        // Leave all previous rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
        
        // Join new room
        socket.join(coinId);
        
        // Get recent messages for this coin (last 50)
        const { data: messages, error } = await supabase
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
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error('Error fetching messages:', error);
          socket.emit('error', { message: 'Failed to load messages' });
          return;
        }
        
        // Format messages and send to client
        const formattedMessages = messages?.reverse().map(msg => ({
          id: msg.id,
          coinId: msg.coin_id,
          content: msg.content,
          createdAt: msg.created_at,
          user: {
            id: msg.users[0].id,
            name: msg.users[0].name,
            email: msg.users[0].email
          }
        })) || [];
        
        socket.emit('room_joined', {
          coinId,
          messages: formattedMessages
        });
        
        // Notify room about new user
        socket.to(coinId).emit('user_joined', {
          username: user.name || user.email?.split('@')[0] || 'Anonymous'
        });
        
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });
    
    // Send message
    socket.on('send_message', async (data: { coinId: string; message: string }) => {
      try {
        const { coinId, message } = data;
        
        if (!coinId || !message?.trim()) {
          socket.emit('error', { message: 'Coin ID and message are required' });
          return;
        }
        
        if (message.length > 500) {
          socket.emit('error', { message: 'Message too long (max 500 characters)' });
          return;
        }
        
        // Get user ID from database
        const userId = await getUserIdFromSub(user.sub);
        if (!userId) {
          socket.emit('error', { message: 'User not found' });
          return;
        }
        
        // Save message to database
        const { data: newMessage, error } = await supabase
          .from('chat_messages')
          .insert({
            coin_id: coinId,
            user_id: userId,
            content: message.trim()
          })
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
          .single();
          
        if (error) {
          console.error('Error saving message:', error);
          socket.emit('error', { message: 'Failed to send message' });
          return;
        }
        
        // Format message to match frontend interface
        const formattedMessage = {
          id: newMessage.id,
          coinId: newMessage.coin_id,
          content: newMessage.content,
          createdAt: newMessage.created_at,
          user: {
            id: newMessage.users[0].id,
            name: newMessage.users[0].name,
            email: newMessage.users[0].email
          }
        };
        
        // Broadcast message to all users in the room
        chatNamespace.to(coinId).emit('message', formattedMessage);
        
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Leave room
    socket.on('leave_room', (data: { coinId: string }) => {
      const { coinId } = data;
      if (coinId) {
        socket.leave(coinId);
        socket.to(coinId).emit('user_left', {
          username: user.name || user.email?.split('@')[0] || 'Anonymous'
        });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected from chat: ${user.email || user.sub}`);
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
  
  // General namespace for other real-time features
  io.on('connection', (socket) => {
    console.log('User connected to main namespace:', socket.id);
    
    // Handle price updates (if needed)
    socket.on('subscribe_price_updates', (coinIds: string[]) => {
      if (Array.isArray(coinIds)) {
        coinIds.forEach(coinId => {
          socket.join(`price_${coinId}`);
        });
      }
    });
    
    socket.on('unsubscribe_price_updates', (coinIds: string[]) => {
      if (Array.isArray(coinIds)) {
        coinIds.forEach(coinId => {
          socket.leave(`price_${coinId}`);
        });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected from main namespace:', socket.id);
    });
  });
  
  // Cleanup old messages periodically (every hour)
  setInterval(async () => {
    try {
      const { error } = await supabase.rpc('cleanup_old_messages');
      if (error) {
        console.error('Error cleaning up old messages:', error);
      } else {
        console.log('Old messages cleaned up successfully');
      }
    } catch (error) {
      console.error('Error in cleanup interval:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
}

// Helper function to broadcast price updates
export function broadcastPriceUpdate(io: Server, coinId: string, priceData: any) {
  io.to(`price_${coinId}`).emit('price_update', {
    coinId,
    ...priceData
  });
}