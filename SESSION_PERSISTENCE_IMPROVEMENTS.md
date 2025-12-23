# Session Persistence Improvements

## Overview
This document outlines the improvements made to implement 24-hour session persistence for the radio lineup generator application.

## Problem
Users were being logged out on every page refresh, requiring them to log in repeatedly.

## Solution Implemented

### 1. Enhanced Cookie Configuration
- **File**: `server/routes/auth.js`
- **Changes**:
  - Updated cookie options to use environment-based secure settings
  - Improved cookie domain handling for production vs development
  - Ensured consistent cookie options across login, logout, and verification endpoints

### 2. Automatic Token Refresh
- **File**: `server/routes/auth.js`
- **New Features**:
  - Added `/auth/refresh` endpoint for manual token refresh
  - Enhanced `/auth/me` endpoint to automatically refresh tokens when they're about to expire (within 1 hour)
  - Enhanced `/auth/verify` endpoint to refresh tokens during verification

### 3. Improved Frontend Session Management
- **File**: `src/contexts/AuthContext.tsx`
- **Changes**:
  - Added automatic token refresh every hour to keep sessions active
  - Implemented activity tracking to refresh tokens on user interaction
  - Added visibility change listener to verify session when user returns to tab
  - Improved error handling to not immediately log out users on network errors
  - Added fallback to localStorage when server verification fails temporarily

### 4. Better Error Handling
- **File**: `src/lib/api-client.ts`
- **Changes**:
  - Enhanced error handling to include HTTP status codes
  - Improved error reporting for authentication failures

### 5. Secure JWT Configuration
- **File**: `ecosystem.config.js`
- **Changes**:
  - Updated JWT secret to a more secure value
  - Applied consistent secret across development and production environments

## Key Features

### Session Duration
- **JWT Token Expiration**: 24 hours
- **Cookie Expiration**: 24 hours
- **Automatic Refresh**: Every hour to maintain active session
- **Activity-based Refresh**: Refreshes token on user activity (30-minute timeout)

### Session Persistence Mechanisms
1. **Automatic Token Refresh**: Tokens are refreshed every hour to prevent expiration
2. **Activity Tracking**: User activity (mouse, keyboard, touch) triggers token refresh
3. **Visibility Change Detection**: Session verification when user returns to tab
4. **Graceful Error Handling**: Network errors don't immediately log out users
5. **Fallback to localStorage**: Uses stored user data when server is temporarily unavailable

### Security Features
- **HttpOnly Cookies**: Prevents XSS attacks
- **Secure Cookies**: Enabled in production environment
- **SameSite Policy**: Set to 'lax' for security
- **Environment-based Configuration**: Different settings for development and production

## Technical Implementation

### Server-side Changes
```javascript
// Enhanced cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? undefined : undefined
};

// Automatic token refresh in /auth/me endpoint
if (tokenExp - now < oneHour) {
  // Refresh token if it expires within 1 hour
  const newToken = jwt.sign(/* ... */);
  res.cookie('auth_token', newToken, cookieOptions);
}
```

### Client-side Changes
```typescript
// Automatic token refresh every hour
useEffect(() => {
  if (!user) return;
  
  const refreshInterval = setInterval(async () => {
    try {
      await api.mutate('/auth/refresh', {});
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
  
  return () => clearInterval(refreshInterval);
}, [user]);

// Activity tracking
const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
activityEvents.forEach(event => {
  document.addEventListener(event, resetActivityTimeout, true);
});
```

## Testing the Implementation

1. **Login**: User logs in and receives a 24-hour session
2. **Page Refresh**: User stays logged in after refreshing the page
3. **Browser Restart**: User remains logged in after closing and reopening browser
4. **Inactivity**: Session remains active for 24 hours even with no activity
5. **Activity**: User activity extends the session beyond 24 hours

## Monitoring

The implementation includes comprehensive logging:
- Session verification attempts
- Token refresh operations
- Authentication errors
- User activity tracking

## Future Enhancements

1. **Session Analytics**: Track session duration and user behavior
2. **Configurable Timeouts**: Allow admins to adjust session duration
3. **Multi-device Sessions**: Support for multiple active sessions per user
4. **Session Revocation**: Allow users to revoke sessions from other devices

## Troubleshooting

If users are still being logged out:

1. **Check Browser Console**: Look for authentication errors
2. **Verify Cookie Settings**: Ensure cookies are enabled and not blocked
3. **Check Network**: Verify server connectivity
4. **Clear Browser Data**: Clear cookies and localStorage if needed
5. **Check Server Logs**: Look for authentication-related errors

## Security Considerations

- JWT tokens are stored in HttpOnly cookies to prevent XSS attacks
- Tokens are automatically refreshed to maintain security
- Session verification occurs on every page load and tab focus
- Network errors don't compromise security by keeping invalid sessions 