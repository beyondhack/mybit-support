import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Send, Users, MessageCircle, Hash, Search } from 'lucide-react';
import { useSocket } from '@/lib/socket';
import { apiClient } from '@/lib/api';
import { ChatMessage, Coin } from '@/lib/supabase';

interface ChatRoom {
  coinId: string;
  coinName: string;
  coinSymbol: string;
  coinImage?: string;
  messageCount: number;
  lastMessageAt: string;
}

export default function Chat() {
  const { user } = useAuth0();
  const socketManager = useSocket();
  const chatSocket = socketManager.chatSocketInstance;
  const [activeRooms, setActiveRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<{ [key: string]: number }>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Coin[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchActiveRooms();
  }, []);

  useEffect(() => {
    if (!chatSocket) return;

    // Listen for chat events
    chatSocket.on('message', (message: ChatMessage) => {
      if (message.coinId === selectedRoom) {
        setMessages(prev => [...prev, message]);
      }
    });

    chatSocket.on('user_joined', ({ username }: { username: string }) => {
      // Handle user joined event if needed
    });

    chatSocket.on('user_left', ({ username }: { username: string }) => {
      // Handle user left event if needed
    });

    chatSocket.on('typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (userId === user?.sub) return; // Don't show own typing
      
      setTypingUsers(prev => {
        if (isTyping) {
          return prev.includes(userId) ? prev : [...prev, userId];
        } else {
          return prev.filter(id => id !== userId);
        }
      });
    });

    return () => {
      chatSocket.off('message');
      chatSocket.off('user_joined');
      chatSocket.off('user_left');
      chatSocket.off('typing');
    };
  }, [chatSocket, selectedRoom, user?.sub]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const fetchActiveRooms = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getChatRooms();
      // Map the API response to match the ChatRoom interface
      const rooms = response.rooms.map(room => ({
        coinId: room.coinId,
        coinName: room.coin.name,
        coinSymbol: room.coin.symbol,
        coinImage: room.coin.image,
        messageCount: room.messageCount,
        lastMessageAt: room.lastActivity
      }));
      setActiveRooms(rooms);
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (coinId: string) => {
    if (selectedRoom === coinId) return;

    try {
      setLoadingMessages(true);
      
      // Leave current room
      if (selectedRoom && chatSocket) {
        chatSocket.emit('leave_room', { coinId: selectedRoom });
      }

      // Join new room
      if (chatSocket) {
        chatSocket.emit('join_room', { coinId });
      }

      // Fetch messages for the new room
      const roomMessages = await apiClient.getChatMessages(coinId);
      setMessages(roomMessages.messages || []);
      setSelectedRoom(coinId);
      setTypingUsers([]);
    } catch (err) {
      console.error('Error joining room:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !chatSocket) return;

    try {
      const messageData = {
        coinId: selectedRoom,
        message: newMessage.trim()
      };

      chatSocket.emit('send_message', messageData);
      setNewMessage('');
      
      // Stop typing indicator
      chatSocket.emit('user_typing', { coinId: selectedRoom, isTyping: false });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleTyping = () => {
    if (!selectedRoom || !chatSocket) return;

    chatSocket.emit('user_typing', { coinId: selectedRoom, isTyping: true });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      chatSocket.emit('user_typing', { coinId: selectedRoom, isTyping: false });
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const selectedRoomData = activeRooms.find(room => room.coinId === selectedRoom);

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Chat Rooms</h1>
          
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Search coins to chat..."
            />
          </div>

          {/* Search Results */}
          {searching && (
            <div className="mt-2 text-center py-2">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
              {searchResults.map((coin) => (
                <div
                  key={coin.id}
                  onClick={() => {
                    joinRoom(coin.id);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  {coin.image_url && (
                    <img
                      className="h-6 w-6 rounded-full mr-2"
                      src={coin.image_url}
                      alt={coin.name}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{coin.name}</div>
                    <div className="text-xs text-gray-500 uppercase">{coin.symbol}</div>
                  </div>
                  <Hash className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Rooms */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4">
              <div className="animate-pulse space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeRooms.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No active chat rooms</p>
              <p className="text-xs">Search for a coin to start chatting</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {activeRooms.map((room) => (
                <div
                  key={room.coinId}
                  onClick={() => joinRoom(room.coinId)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedRoom === room.coinId
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {room.coinImage && (
                    <img
                      className="h-10 w-10 rounded-full mr-3"
                      src={room.coinImage}
                      alt={room.coinName}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {room.coinName}
                      </h3>
                      <div className="flex items-center text-xs text-gray-500">
                        <Users className="h-3 w-3 mr-1" />
                        {onlineUsers[room.coinId] || 0}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 uppercase">{room.coinSymbol}</p>
                      <p className="text-xs text-gray-400">
                        {room.messageCount} messages
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {selectedRoomData?.coinImage && (
                    <img
                      className="h-8 w-8 rounded-full mr-3"
                      src={selectedRoomData.coinImage}
                      alt={selectedRoomData.coinName}
                    />
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedRoomData?.coinName || 'Loading...'}
                    </h2>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-1" />
                      {onlineUsers[selectedRoom] || 0} online
                      {typingUsers.length > 0 && (
                        <span className="ml-2 text-blue-600">
                          • {typingUsers.length} typing...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/coin/${selectedRoom}`}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  View Coin
                </Link>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>No messages yet</p>
                  <p className="text-sm">Be the first to start the conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const prevMessage = messages[index - 1];
                    const showDate = !prevMessage || 
                      formatDate(message.createdAt) !== formatDate(prevMessage.createdAt);
                    const isOwnMessage = message.user.id === user?.sub;

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="flex justify-center mb-4">
                            <span className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}>
                            {!isOwnMessage && (
                              <div className="text-xs font-medium mb-1 text-gray-600">
                                {message.user.name || message.user.email?.split('@')[0] || 'Anonymous'}
                              </div>
                            )}
                            <div className="text-sm">{message.content}</div>
                            <div className={`text-xs mt-1 ${
                              isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {formatTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Type a message..."
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Crypto Chat</h3>
              <p className="text-gray-600 mb-4">Select a coin from the sidebar to join the conversation</p>
              <p className="text-sm text-gray-500">Discuss market trends, share insights, and connect with other traders</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}