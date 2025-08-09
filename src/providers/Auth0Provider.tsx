import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { ReactNode, useEffect, useCallback } from 'react';

interface Auth0ProviderWrapperProps {
  children: ReactNode;
}

// Component to handle Auth0 errors and provide debugging info
function Auth0ErrorHandler({ children }: { children: ReactNode }) {
  const { error, isLoading, isAuthenticated, user, loginWithRedirect } = useAuth0();

  // Function to clear Auth0 state and storage
  const clearAuth0State = useCallback(() => {
    try {
      // Clear localStorage Auth0 entries
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('@@auth0spajs@@') || key.startsWith('auth0.')) {
          localStorage.removeItem(key);
          console.log('Cleared localStorage key:', key);
        }
      });
      
      // Clear sessionStorage Auth0 entries
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('@@auth0spajs@@') || key.startsWith('auth0.')) {
          sessionStorage.removeItem(key);
          console.log('Cleared sessionStorage key:', key);
        }
      });
      
      console.log('Auth0 state cleared successfully');
    } catch (err) {
      console.error('Error clearing Auth0 state:', err);
    }
  }, []);

  // Function to retry authentication
  const retryAuthentication = useCallback(async () => {
    try {
      clearAuth0State();
      // Wait a bit for storage to clear
      await new Promise(resolve => setTimeout(resolve, 100));
      // Redirect to login
      await loginWithRedirect({
        appState: { returnTo: window.location.pathname }
      });
    } catch (err) {
      console.error('Error retrying authentication:', err);
      // Fallback: reload the page
      window.location.reload();
    }
  }, [clearAuth0State, loginWithRedirect]);

  useEffect(() => {
    if (error) {
      console.error('Auth0 Error Details:', {
        error: error.message,
        name: error.name,
        description: (error as any).description || 'No description',
        statusCode: (error as any).statusCode,
        code: (error as any).code,
        stack: error.stack
      });

      // Check for specific error types
      if (error.message.includes('401') || (error as any).statusCode === 401) {
        console.error('Auth0 401 Error - Possible causes:', [
          'Invalid Auth0 domain or client ID',
          'Callback URL not configured in Auth0 dashboard',
          'Auth0 application not properly configured',
          'Environment variables not loaded in production'
        ]);
      }
      
      // Handle Invalid state error specifically
      if (error.message.includes('Invalid state') || error.name === 'GenericError') {
        console.error('Auth0 Invalid State Error - This usually indicates:', [
          'State parameter mismatch between login request and callback',
          'Corrupted browser storage or cache',
          'Multiple login attempts or page refreshes during auth flow',
          'Callback URL mismatch or timing issues'
        ]);
        console.log('Attempting to clear Auth0 state and retry...');
      }
    }

    // Debug authentication state
    console.log('Auth0 State:', {
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      hasError: !!error,
      currentUrl: window.location.href,
      storageKeys: {
        localStorage: Object.keys(localStorage).filter(k => k.includes('auth0')),
        sessionStorage: Object.keys(sessionStorage).filter(k => k.includes('auth0'))
      }
    });
  }, [error, isLoading, isAuthenticated, user]);

  if (error) {
    const isInvalidState = error.message.includes('Invalid state') || error.name === 'GenericError';
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-semibold mb-2">{error.name}</p>
            <p className="text-red-700 text-sm mb-3">{error.message}</p>
            
            {isInvalidState && (
              <div className="text-left mb-4">
                <p className="font-semibold text-red-800 mb-2">Invalid State Error Solutions:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  <li>Clear browser cache and Auth0 storage</li>
                  <li>Avoid refreshing page during login process</li>
                  <li>Ensure callback URLs match exactly</li>
                  <li>Try logging in from a fresh browser session</li>
                </ul>
              </div>
            )}
            
            {error.message.includes('401') && (
              <div className="text-left">
                <p className="font-semibold text-red-800 mb-2">401 Error Solutions:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  <li>Check Auth0 domain and client ID in environment variables</li>
                  <li>Verify callback URLs in Auth0 dashboard match your domain</li>
                  <li>Ensure Auth0 application is properly configured</li>
                  <li>Check if environment variables are loaded in production</li>
                </ul>
              </div>
            )}
          </div>
          
          <div className="space-x-3">
            {isInvalidState ? (
              <>
                <button 
                  onClick={retryAuthentication}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Clear State & Retry Login
                </button>
                <button 
                  onClick={clearAuth0State}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                >
                  Clear Cache Only
                </button>
              </>
            ) : (
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function Auth0ProviderWrapper({ children }: Auth0ProviderWrapperProps) {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
  const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI || window.location.origin;

  // Enhanced debugging information
  console.log('Auth0 Configuration Debug:', {
    domain: domain ? `${domain.substring(0, 10)}...` : 'MISSING',
    clientId: clientId ? `${clientId.substring(0, 10)}...` : 'MISSING',
    audience: audience ? `${audience.substring(0, 10)}...` : 'NOT_SET',
    redirectUri,
    currentOrigin: window.location.origin,
    currentUrl: window.location.href
  });

  if (!domain || !clientId) {
    console.error('Auth0 configuration missing:', {
      domain: !!domain,
      clientId: !!clientId,
      allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_AUTH0'))
    });
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Auth0 Configuration Error</h1>
          <p className="text-gray-600 mb-4">
            Auth0 environment variables are missing or not loaded properly.
          </p>
          <div className="text-left bg-gray-100 p-4 rounded text-sm">
            <p className="font-semibold mb-2">Missing:</p>
            <ul className="list-disc list-inside space-y-1">
              {!domain && <li>VITE_AUTH0_DOMAIN</li>}
              {!clientId && <li>VITE_AUTH0_CLIENT_ID</li>}
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              Check Vercel environment variables or .env file
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience,
        scope: 'openid profile email'
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
      onRedirectCallback={(appState) => {
        console.log('Auth0 Redirect Callback:', {
          appState,
          currentUrl: window.location.href,
          returnTo: appState?.returnTo || window.location.pathname,
          urlParams: new URLSearchParams(window.location.search).toString(),
          hasCode: window.location.search.includes('code='),
          hasState: window.location.search.includes('state='),
          hasError: window.location.search.includes('error=')
        });
        
        // Check for error parameters in callback
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          console.error('Auth0 Callback Error:', {
            error,
            errorDescription,
            fullUrl: window.location.href
          });
        }
        
        // Navigate to the intended page or default to root
        const targetPath = appState?.returnTo || '/';
        console.log('Navigating to:', targetPath);
        window.history.replaceState({}, document.title, targetPath);
      }}

    >
      <Auth0ErrorHandler>
        {children}
      </Auth0ErrorHandler>
    </Auth0Provider>
  );
}