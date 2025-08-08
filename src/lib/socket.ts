import { io, Socket } from 'socket.io-client';
import { ChatMessage } from './supabase';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class SocketManager {
  private socket: Socket | null = null;
  private chatSocket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;
    
    // Main socket connection
    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    // Chat namespace connection
    this.chatSocket = io(`${SOCKET_URL}/chat`, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (this.socket) {
      this.socket.on('connect', () => {
        console.log('Connected to main socket');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from main socket');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Main socket connection error:', error);
      });

      // Price update events
      this.socket.on('price_update', (data: { coinId: string; price: number; change24h: number }) => {
        this.emit('priceUpdate', data);
      });
    }

    if (this.chatSocket) {
      this.chatSocket.on('connect', () => {
        console.log('Connected to chat socket');
      });

      this.chatSocket.on('disconnect', () => {
        console.log('Disconnected from chat socket');
      });

      this.chatSocket.on('connect_error', (error) => {
        console.error('Chat socket connection error:', error);
      });

      // Chat events
      this.chatSocket.on('message', (message: ChatMessage) => {
        this.emit('newMessage', message);
      });

      this.chatSocket.on('user_joined', (data: { userId: string; username: string; coinId: string }) => {
        this.emit('userJoined', data);
      });

      this.chatSocket.on('user_left', (data: { userId: string; username: string; coinId: string }) => {
        this.emit('userLeft', data);
      });

      this.chatSocket.on('typing', (data: { userId: string; username: string; coinId: string; isTyping: boolean }) => {
        this.emit('typing', data);
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.chatSocket) {
      this.chatSocket.disconnect();
      this.chatSocket = null;
    }
    this.eventListeners.clear();
  }

  // Chat methods
  joinCoinChat(coinId: string) {
    if (this.chatSocket) {
      this.chatSocket.emit('join_coin', coinId);
    }
  }

  leaveCoinChat(coinId: string) {
    if (this.chatSocket) {
      this.chatSocket.emit('leave_coin', coinId);
    }
  }

  sendMessage(coinId: string, content: string) {
    if (this.chatSocket) {
      this.chatSocket.emit('send_message', { coinId, content });
    }
  }

  setTyping(coinId: string, isTyping: boolean) {
    if (this.chatSocket) {
      this.chatSocket.emit('typing', { coinId, isTyping });
    }
  }

  // Event listener management
  private eventListeners = new Map<string, Set<Function>>();

  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Getters
  get isConnected() {
    return this.socket?.connected || false;
  }

  get isChatConnected() {
    return this.chatSocket?.connected || false;
  }

  get mainSocket() {
    return this.socket;
  }

  get chatSocketInstance() {
    return this.chatSocket;
  }
}

// Create singleton instance
export const socketManager = new SocketManager();

// React hook for socket connection
import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export const useSocket = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useEffect(() => {
    const connectSocket = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          socketManager.connect(token);
        } catch (error) {
          console.error('Error connecting to socket:', error);
        }
      }
    };

    connectSocket();

    return () => {
      socketManager.disconnect();
    };
  }, [isAuthenticated, getAccessTokenSilently]);

  return socketManager;
};

export default socketManager;