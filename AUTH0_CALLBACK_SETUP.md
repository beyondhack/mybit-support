# Auth0 Callback URL Configuration Guide

## Current Issue
You're experiencing a 401 error when trying to authenticate with Auth0. This is typically caused by:
1. Incorrect callback URLs in Auth0 dashboard
2. Missing or incorrect environment variables
3. Domain/Client ID mismatch

## Required Auth0 Dashboard Configuration

### 1. Application Settings
In your Auth0 dashboard, go to Applications > [Your App] > Settings:

**Allowed Callback URLs:**
```
http://localhost:5173,
https://traemybit-supportswfu-eggr7-edgar-roberto-brizuelas-projects.vercel.app,
https://your-custom-domain.com
```

**Allowed Logout URLs:**
```
http://localhost:5173,
https://traemybit-supportswfu-eggr7-edgar-roberto-brizuelas-projects.vercel.app,
https://your-custom-domain.com
```

**Allowed Web Origins:**
```
http://localhost:5173,
https://traemybit-supportswfu-eggr7-edgar-roberto-brizuelas-projects.vercel.app,
https://your-custom-domain.com
```

### 2. Environment Variables in Vercel
Go to Vercel Dashboard > Your Project > Settings > Environment Variables:

```
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-api-identifier (optional)
VITE_AUTH0_REDIRECT_URI=https://your-vercel-domain.vercel.app
```

### 3. Common Issues and Solutions

**401 Unauthorized Error:**
- ✅ Check that callback URLs exactly match your domain
- ✅ Ensure no trailing slashes in URLs
- ✅ Verify environment variables are set in Vercel
- ✅ Confirm Auth0 application type is "Single Page Application"
- ✅ Check that domain and client ID are correct

**Environment Variables Not Loading:**
- ✅ Redeploy after adding environment variables
- ✅ Ensure variables start with `VITE_` prefix
- ✅ Check for typos in variable names

**Callback URL Mismatch:**
- ✅ Use exact URLs (including protocol)
- ✅ Add both development and production URLs
- ✅ Remove any query parameters from callback URLs

## Testing Steps

1. **Check Environment Variables:**
   - Open browser console
   - Look for "Auth0 Configuration Debug" logs
   - Verify all required variables are loaded

2. **Test Authentication:**
   - Click "Sign In" button
   - Check console for detailed error messages
   - Look for 401 error details and suggested solutions

3. **Verify Callback:**
   - After login attempt, check console for "Auth0 Redirect Callback" logs
   - Ensure redirect URL matches configured callback URLs

## Debug Information

The application now provides enhanced debugging:
- Configuration status on startup
- Detailed error messages for 401 errors
- Authentication state logging
- Callback URL verification

Check the browser console for detailed information about what's failing.