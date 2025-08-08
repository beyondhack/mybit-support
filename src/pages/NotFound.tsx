import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* 404 Illustration */}
          <div className="mx-auto h-32 w-32 text-gray-300 mb-8">
            <svg
              className="h-full w-full"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.007-5.691-2.709M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or you entered the wrong URL.
          </p>

          {/* Action Buttons */}
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Go Home
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </button>
          </div>

          {/* Helpful Links */}
          <div className="mt-12">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Pages</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <Link
                to="/"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Home className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium text-gray-900">Dashboard</p>
                  <p className="text-xs text-gray-500">View trending coins</p>
                </div>
              </Link>

              <Link
                to="/watchlist"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Search className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium text-gray-900">Watchlist</p>
                  <p className="text-xs text-gray-500">Track your coins</p>
                </div>
              </Link>

              <Link
                to="/portfolio"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium text-gray-900">Portfolio</p>
                  <p className="text-xs text-gray-500">Manage investments</p>
                </div>
              </Link>

              <Link
                to="/chat"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium text-gray-900">Chat</p>
                  <p className="text-xs text-gray-500">Join discussions</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Contact Support */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Still can't find what you're looking for?{' '}
              <a
                href="mailto:support@mybit.com"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}