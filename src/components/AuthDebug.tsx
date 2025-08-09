import { useAuth0 } from '@auth0/auth0-react';

export default function AuthDebug() {
  const { isAuthenticated, isLoading, user, error } = useAuth0();

  const envVars = {
    domain: import.meta.env.VITE_AUTH0_DOMAIN,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    redirectUri: import.meta.env.VITE_AUTH0_REDIRECT_URI
  };

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 max-w-sm max-h-96 overflow-y-auto">
      <h3 className="font-bold text-sm mb-2">Auth Debug Info</h3>
      <div className="text-xs space-y-1">
        <div>Loading: {isLoading ? 'true' : 'false'}</div>
        <div>Authenticated: {isAuthenticated ? 'true' : 'false'}</div>
        <div>User: {user ? user.email || user.name : 'null'}</div>
        <div>Error: {error ? error.message : 'none'}</div>
        <div>Location: {window.location.pathname}</div>
        <hr className="my-2" />
        <div className="font-semibold">Environment Variables:</div>
        <div>Domain: {envVars.domain || 'undefined'}</div>
        <div>Client ID: {envVars.clientId || 'undefined'}</div>
        <div>Audience: {envVars.audience || 'undefined'}</div>
        <div>Redirect URI: {envVars.redirectUri || 'undefined'}</div>
        <hr className="my-2" />
        <div>Auth Storage: {localStorage.getItem('@@auth0spajs@@::' + envVars.clientId + '::' + envVars.audience + '::openid profile email') ? 'exists' : 'missing'}</div>
      </div>
    </div>
  );
}