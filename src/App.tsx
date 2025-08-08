import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Auth0ProviderWrapper from '@/providers/Auth0Provider';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useApiAuth } from '@/lib/api';
import { useSocket } from '@/lib/socket';

// Pages
import Dashboard from '@/pages/Dashboard';
import Watchlist from '@/pages/Watchlist';
import Portfolio from '@/pages/Portfolio';
import Chat from '@/pages/Chat';
import CoinDetails from '@/pages/CoinDetails';
import Profile from '@/pages/Profile';

function AppContent() {
  const { isAuthenticated } = useAuth0();
  const { setAuthToken } = useApiAuth();
  const socket = useSocket();

  useEffect(() => {
    if (isAuthenticated) {
      setAuthToken();
    }
  }, [isAuthenticated, setAuthToken]);

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Dashboard />} />
          
          {/* Protected routes */}
          <Route 
            path="/watchlist" 
            element={
              <ProtectedRoute>
                <Watchlist />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/portfolio" 
            element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route path="/coin/:coinId" element={<CoinDetails />} />
          
          {/* 404 route */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">Page not found</p>
                  <a 
                    href="/" 
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Go Home
                  </a>
                </div>
              </div>
            } 
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default function App() {
  return (
    <Auth0ProviderWrapper>
      <AppContent />
    </Auth0ProviderWrapper>
  );
}
