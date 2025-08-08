import { ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome to CryptoHub
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please sign in to access your crypto dashboard
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <button
              onClick={() => loginWithRedirect()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Sign in to continue
            </button>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Track your favorite cryptocurrencies, manage your portfolio, and chat with the community
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}