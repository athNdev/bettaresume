# Authentication Setup Guide

This document explains how to set up and use authentication in Betta Resume.

## Overview

Betta Resume supports two authentication modes:

1. **Dev Mode** - Uses localStorage only, no real authentication (for development)
2. **Prod Mode** - Uses AWS Cognito for real authentication + backend persistence

## Dev Mode (Default)

```bash
npm run dev       # Starts with localStorage only
npm run server    # Start backend (optional in dev mode)
```

In dev mode:
- Any email/password is accepted for login
- Data is stored in localStorage with key `betta-resume-data-dev`
- No backend required for basic functionality
- Backend sync is optional (for testing)

## Prod Mode

```bash
npm run prod      # Starts with Cognito authentication
npm run server    # Backend is required in prod mode
```

In prod mode:
- Real AWS Cognito authentication required
- Data is stored in localStorage with key `betta-resume-data-prod`
- All data synced to backend database
- JWT tokens verified on every API request

## Setting Up AWS Cognito

### 1. Create User Pool in AWS Console

1. Go to AWS Cognito Console
2. Click "Create user pool"
3. Configure:
   - **Sign-in options**: Email
   - **Password policy**: At least 8 characters
   - **MFA**: Optional (recommended)
   - **User account recovery**: Enable email
   - **Self-registration**: Enable if you want public sign-ups
   - **Email delivery**: Cognito default or SES
   
4. **IMPORTANT - Configure Required Attributes**:
   - `email` (required)
   - `name` (required)
   - `preferred_username` (required) - **This is crucial for custom UI signup!**

5. Configure app client:
   - App type: Public client
   - **Authentication flows**: 
     - ✅ `ALLOW_USER_PASSWORD_AUTH` - **Required for custom UI login!**
     - ✅ `ALLOW_REFRESH_TOKEN_AUTH`
     - ✅ `ALLOW_USER_SRP_AUTH` (optional but recommended)
   - No client secret (for browser apps)

6. **IMPORTANT - User Pool Sign-in Options**:
   - If you enable "Email as alias", the Username CANNOT be in email format
   - Our implementation generates unique usernames automatically
   - Users sign in using their email address

7. Note down:
   - **User Pool ID**: `us-east-1_xxxxxxxxx`
   - **Client ID**: `xxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Region**: `us-east-1`

### 2. Configure Frontend Environment

Create `.env.local` file in the project root:

```env
# Cognito Configuration
NEXT_PUBLIC_COGNITO_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id-here

# API Configuration
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
```

### 3. Configure Backend Environment

Create `.env` file in the `server/` directory:

```env
# Cognito Configuration (for JWT verification)
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=your-client-id-here

# Server Configuration
PORT=4000
DATABASE_PATH=./data/betta-resume.db
```

### 4. Start the Application

```bash
# Terminal 1: Start the backend server
cd server && npm run dev

# Terminal 2: Start the frontend in prod mode
npm run prod
```

## Authentication Flow

### Sign Up
1. User enters email, name, password
2. Cognito creates user account
3. Verification email sent
4. User verifies email
5. User can now sign in

### Sign In
1. User enters email, password
2. Frontend sends credentials to Cognito
3. Cognito returns JWT tokens (access, ID, refresh)
4. Tokens stored in localStorage
5. ID token sent with every API request

### Token Verification (Backend)
1. Backend extracts token from `Authorization: Bearer <token>` header
2. Fetches Cognito JWKS (JSON Web Key Set)
3. Verifies token signature using public key
4. Validates issuer, audience, expiration
5. Extracts user ID from `sub` claim
6. Attaches user to GraphQL context

### Auto-Refresh
- Access tokens expire after 1 hour (configurable in Cognito)
- ID tokens expire after 1 hour
- Refresh tokens expire after 30 days (configurable)
- Frontend automatically refreshes tokens before expiry

## API Authorization

In prod mode, all GraphQL mutations and user-specific queries require authentication:

### Automatically Secured
- `me` query - Returns current authenticated user
- `resumes` query - Only returns authenticated user's resumes
- `resume(id)` query - Verifies user owns the resume
- All mutations - Use authenticated user ID

### Example GraphQL Request
```javascript
const response = await fetch('http://localhost:4000/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`, // Required in prod mode
  },
  body: JSON.stringify({
    query: `
      query {
        me {
          id
          email
          resumes {
            id
            name
          }
        }
      }
    `,
  }),
});
```

## Google SSO Setup

To enable "Continue with Google" social login, you need to configure Google as a federated identity provider in your Cognito User Pool.

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Configure:
   - **Name**: Betta Resume
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (development)
     - `https://your-production-domain.com` (production)
   - **Authorized redirect URIs**: 
     - `https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
7. Save and note down:
   - **Client ID**: `xxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxx`

### 2. Configure Cognito User Pool Domain

1. Go to AWS Cognito Console → Your User Pool
2. Navigate to **App integration** → **Domain**
3. Choose either:
   - **Cognito domain**: `your-app-name` → `your-app-name.auth.us-east-1.amazoncognito.com`
   - **Custom domain**: Your own domain (requires SSL certificate)
4. Save the domain

### 3. Add Google as Identity Provider

1. In Cognito Console → **Sign-in experience** → **Federated identity provider sign-in**
2. Click **Add identity provider** → **Google**
3. Enter your Google OAuth credentials:
   - **Client ID**: From step 1
   - **Client secret**: From step 1
4. Configure attribute mapping:
   - `email` → `email`
   - `name` → `name`
   - `sub` → `username`
5. Save changes

### 4. Update App Client Settings

1. Go to **App integration** → **App client list** → Your app client
2. Under **Hosted UI**:
   - **Allowed callback URLs**: `http://localhost:3000/auth/callback` (add production URL too)
   - **Allowed sign-out URLs**: `http://localhost:3000` (add production URL too)
   - **Identity providers**: Select **Google**
   - **OAuth 2.0 grant types**: ✅ Authorization code grant
   - **OpenID Connect scopes**: ✅ email, ✅ openid, ✅ profile
3. Save changes

### 5. Update Environment Variables

Add these to your `.env.local` file:

```env
# Existing Cognito config
NEXT_PUBLIC_COGNITO_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id-here

# OAuth / Social Login (required for Google SSO)
NEXT_PUBLIC_COGNITO_DOMAIN=your-app-name.auth.us-east-1.amazoncognito.com
NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN=true
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_IN=http://localhost:3000/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGN_OUT=http://localhost:3000
```

### 6. Test Google SSO

1. Start the app in production mode: `npm run prod`
2. Go to login page
3. Click "Continue with Google"
4. You should be redirected to Google's sign-in page
5. After signing in, you'll be redirected back to `/auth/callback`
6. The app will exchange the code for tokens and log you in

### Google SSO Flow Diagram

```
User clicks "Continue with Google"
            ↓
    Redirect to Cognito Hosted UI
    (https://your-domain.auth.region.amazoncognito.com/oauth2/authorize?identity_provider=Google)
            ↓
    Cognito redirects to Google
            ↓
    User signs in with Google
            ↓
    Google redirects back to Cognito
            ↓
    Cognito redirects to your app
    (http://localhost:3000/auth/callback?code=xxx)
            ↓
    App exchanges code for tokens
    (POST /oauth2/token)
            ↓
    User is logged in!
```

## Security Notes

1. **Never commit `.env` files** - They contain secrets
2. **Use HTTPS in production** - Required for secure token transmission
3. **Enable MFA** - Recommended for extra security
4. **Rotate tokens** - Frontend handles this automatically
5. **Secure cookies** - Consider using httpOnly cookies for tokens in production

## Troubleshooting

### "Username cannot be of email format" error
- Your User Pool has email alias enabled
- The signup code generates non-email usernames automatically
- Users can still use email to sign in thanks to email alias

### "Attributes did not conform to schema: preferred_username required" error
- Add `preferred_username` as a required attribute in your User Pool schema
- Or remove it from required attributes in Cognito console
- Our signup sends `preferred_username` automatically (uses user's name)

### "USER_PASSWORD_AUTH flow not enabled" error
- Go to Cognito Console → User Pool → App clients
- Edit your app client
- Enable `ALLOW_USER_PASSWORD_AUTH` authentication flow
- This is required for username/password login with custom UI

### "Authentication required" error
- Check if token is present in localStorage
- Token may have expired - try signing in again
- Verify Cognito configuration matches between frontend and backend

### "Invalid token" error
- User Pool ID mismatch between frontend/backend
- Client ID mismatch
- Token was tampered with
- Clock skew between client and server

### "Token expired" error
- Frontend should automatically refresh
- If persists, clear localStorage and sign in again

### CORS errors
- Add your frontend URL to the backend CORS configuration
- Check that credentials are included in requests
