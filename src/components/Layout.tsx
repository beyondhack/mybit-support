import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  TrendingUp, 
  Star, 
  PieChart, 
  MessageCircle, 
  User, 
  LogOut, 
  LogIn,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: TrendingUp },
    { name: 'Watchlist', href: '/watchlist', icon: Star },
    { name: 'Portfolio', href: '/portfolio', icon: PieChart },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and main navigation */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-2xl font-bold text-blue-600">
                  CryptoHub
                </Link>
              </div>
              
              {/* Desktop navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                        isActivePath(item.href)
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User menu */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {user?.picture && (
                      <img
                        className="h-8 w-8 rounded-full"
                        src={user.picture}
                        alt={user.name || 'User'}
                      />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {user?.name || user?.email}
                    </span>
                  </div>
                  <Link
                    to="/profile"
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <User className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => loginWithRedirect()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                      isActivePath(item.href)
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {/* Mobile user menu */}
            <div className="pt-4 pb-3 border-t border-gray-200">
              {isAuthenticated ? (
                <div className="space-y-1">
                  <div className="flex items-center px-4 py-2">
                    {user?.picture && (
                      <img
                        className="h-10 w-10 rounded-full"
                        src={user.picture}
                        alt={user.name || 'User'}
                      />
                    )}
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">
                        {user?.name || user?.email}
                      </div>
                      <div className="text-sm text-gray-500">{user?.email}</div>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <User className="w-5 h-5 mr-3" />
                      Profile
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout({ logoutParams: { returnTo: window.location.origin } });
                    }}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <LogOut className="w-5 h-5 mr-3" />
                      Sign Out
                    </div>
                  </button>
                </div>
              ) : (
                <div className="px-4">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      loginWithRedirect();
                    }}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}