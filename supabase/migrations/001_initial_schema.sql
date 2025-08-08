-- Crypto Onboarding App - Initial Database Schema
-- This migration creates all required tables and RLS policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth0_sub VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.jwt() ->> 'sub' = auth0_sub);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.jwt() ->> 'sub' = auth0_sub);

-- Indexes
CREATE INDEX idx_users_auth0_sub ON users(auth0_sub);
CREATE INDEX idx_users_email ON users(email);

-- Grants
GRANT SELECT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;

-- Coins Table
CREATE TABLE coins (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    image_url TEXT,
    current_price DECIMAL(20,8),
    market_cap BIGINT,
    price_change_24h DECIMAL(10,4),
    market_cap_rank INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_coins_symbol ON coins(symbol);
CREATE INDEX idx_coins_market_cap_rank ON coins(market_cap_rank);
CREATE INDEX idx_coins_last_updated ON coins(last_updated DESC);

-- Enable RLS
ALTER TABLE coins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Coins are viewable by everyone" ON coins
    FOR SELECT USING (true);

-- Grants
GRANT SELECT ON coins TO anon;
GRANT ALL PRIVILEGES ON coins TO authenticated;

-- Watchlist Items Table
CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    coin_id VARCHAR(100) REFERENCES coins(id) ON DELETE CASCADE,
    notes TEXT,
    alert_price DECIMAL(20,8),
    alert_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, coin_id)
);

-- Indexes
CREATE INDEX idx_watchlist_user_id ON watchlist_items(user_id);
CREATE INDEX idx_watchlist_coin_id ON watchlist_items(coin_id);

-- Enable RLS
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own watchlist" ON watchlist_items
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth0_sub = auth.jwt() ->> 'sub'
        )
    );

-- Grants
GRANT ALL PRIVILEGES ON watchlist_items TO authenticated;

-- Chat Messages Table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id VARCHAR(100) REFERENCES coins(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_chat_messages_coin_id ON chat_messages(coin_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Chat messages are viewable by authenticated users" ON chat_messages
    FOR SELECT USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY "Users can insert own messages" ON chat_messages
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE auth0_sub = auth.jwt() ->> 'sub'
        )
    );

-- Grants
GRANT SELECT, INSERT ON chat_messages TO authenticated;

-- Portfolio Transactions Table
CREATE TABLE portfolio_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    coin_id VARCHAR(100) REFERENCES coins(id) ON DELETE CASCADE,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
    quantity DECIMAL(20,8) NOT NULL,
    price_per_unit DECIMAL(20,8) NOT NULL,
    total_value DECIMAL(20,8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_portfolio_user_id ON portfolio_transactions(user_id);
CREATE INDEX idx_portfolio_coin_id ON portfolio_transactions(coin_id);
CREATE INDEX idx_portfolio_created_at ON portfolio_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own portfolio" ON portfolio_transactions
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth0_sub = auth.jwt() ->> 'sub'
        )
    );

-- Grants
GRANT ALL PRIVILEGES ON portfolio_transactions TO authenticated;

-- Coin Snapshots Table (for historical data)
CREATE TABLE coin_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_id VARCHAR(100) REFERENCES coins(id) ON DELETE CASCADE,
    price DECIMAL(20,8) NOT NULL,
    market_cap BIGINT,
    volume_24h BIGINT,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_snapshots_coin_id ON coin_snapshots(coin_id);
CREATE INDEX idx_snapshots_time ON coin_snapshots(snapshot_time DESC);

-- Enable RLS
ALTER TABLE coin_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Snapshots are viewable by everyone" ON coin_snapshots
    FOR SELECT USING (true);

-- Grants
GRANT SELECT ON coin_snapshots TO anon;
GRANT ALL PRIVILEGES ON coin_snapshots TO authenticated;

-- Sample coins data
INSERT INTO coins (id, name, symbol, current_price, market_cap_rank) VALUES
('bitcoin', 'Bitcoin', 'BTC', 45000.00, 1),
('ethereum', 'Ethereum', 'ETH', 3000.00, 2),
('cardano', 'Cardano', 'ADA', 1.20, 3),
('polkadot', 'Polkadot', 'DOT', 25.00, 4),
('chainlink', 'Chainlink', 'LINK', 28.00, 5);

-- Function to clean old chat messages (keep last 50 per coin)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_messages 
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY coin_id 
                ORDER BY created_at DESC
            ) as rn
            FROM chat_messages 
            WHERE is_deleted = false
        ) ranked 
        WHERE rn <= 50
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update user updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();