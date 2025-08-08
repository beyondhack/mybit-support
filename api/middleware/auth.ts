import dotenv from 'dotenv';
dotenv.config();

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { createClient } from '@supabase/supabase-js';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email?: string;
        name?: string;
        [key: string]: any;
      };
    }
  }
}

// JWKS client for Auth0
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  requestHeaders: {},
  timeout: 30000,
});

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Get signing key from Auth0
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Auth middleware
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    jwt.verify(token, getKey, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    }, async (err, decoded) => {
      if (err) {
        console.error('JWT verification error:', err);
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      if (!decoded || typeof decoded === 'string') {
        return res.status(401).json({ error: 'Invalid token payload' });
      }
      
      req.user = decoded as any;
      
      // Ensure user exists in our database
      try {
        await ensureUserExists(decoded as any);
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ error: 'Database error' });
      }
      
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Ensure user exists in database
async function ensureUserExists(user: any) {
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('auth0_sub', user.sub)
    .single();
    
  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }
  
  if (!existingUser) {
    // Create new user
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        auth0_sub: user.sub,
        email: user.email || '',
        username: user.name || user.email?.split('@')[0] || 'User',
        avatar_url: user.picture || null,
        preferences: {}
      });
      
    if (insertError) {
      throw insertError;
    }
  }
}

// Optional middleware for Socket.IO authentication
export const socketAuthMiddleware = async (socket: any, next: any) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('No token provided'));
    }
    
    jwt.verify(token, getKey, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    }, async (err, decoded) => {
      if (err) {
        return next(new Error('Invalid token'));
      }
      
      socket.user = decoded;
      await ensureUserExists(decoded as any);
      next();
    });
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

// Helper function to get user ID from Auth0 sub
export async function getUserIdFromSub(auth0Sub: string): Promise<string | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('auth0_sub', auth0Sub)
      .single();
      
    if (error || !user) {
      console.error('Error fetching user by Auth0 sub:', error);
      return null;
    }
    
    return user.id;
  } catch (error) {
    console.error('Error in getUserIdFromSub:', error);
    return null;
  }
}