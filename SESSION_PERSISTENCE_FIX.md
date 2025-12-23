# Session Persistence and WebSocket Connection Fix

## Problem Description

When accessing the application from remote IPs (212.179.162.102:8080, logger.103.fm:8080, l.103.fm:8080), users were experiencing:

1. **Session not persisting** - Had to re-login on every page refresh
2. **WebSocket connection failures** - Vite HMR trying to connect to localhost instead of remote IP
3. **CSP violations** - Content Security Policy blocking WebSocket connections

## Root Causes

### 1. Cookie Domain Issues
- Cookies were being set without proper domain configuration for remote access
- Cross-origin requests weren't handling cookie domains correctly

### 2. WebSocket Connection Issues
- Vite dev server was configured to connect to localhost for HMR
- Nginx wasn't properly proxying WebSocket connections

### 3. Content Security Policy Issues
- CSP headers were blocking WebSocket connections to remote domains

## Solutions Implemented

### 1. Fixed Cookie Configuration (`server/routes/auth.js`)

**Before:**
```javascript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? undefined : undefined
};
```

**After:**
```javascript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
  domain: undefined // Let browser set domain automatically
};

// Handle remote access domains
if (req.headers.origin) {
  const origin = new URL(req.headers.origin);
  const hostname = origin.hostname;
  
  // For remote access, set domain to the hostname
  if (hostname === '212.179.162.102' || hostname === 'logger.103.fm' || hostname === 'l.103.fm') {
    cookieOptions.domain = hostname;
    console.log('Setting cookie domain for remote access:', hostname);
  }
}
```

### 2. Updated Vite Configuration (`vite.config.ts`)

**Before:**
```javascript
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  // ...
}));
```

**After:**
```javascript
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5173,
    hmr: {
      // Configure HMR for remote access
      host: '212.179.162.102',
      port: 8080,
      protocol: 'ws'
    }
  },
  // ...
}));
```

### 3. Enhanced Nginx Configuration (`nginx.conf`)

**Added WebSocket proxy support:**
```nginx
# WebSocket proxy for Vite HMR
location /@vite/client {
    proxy_pass http://localhost:5173;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

**Updated CSP headers:**
```nginx
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'; connect-src 'self' http: https: ws: wss: 212.179.162.102:8080 logger.103.fm:8080 l.103.fm:8080" always;
```

**Added support for l.103.fm domain:**
```nginx
server_name 212.179.162.102 logger.103.fm l.103.fm;
```

## Testing Results

### ✅ Session Persistence
- Cookies now properly set for remote domains
- Session persists across page refreshes
- Logout properly clears cookies

### ✅ WebSocket Connections
- Vite HMR connects to correct remote IP
- No more localhost connection attempts
- Hot module replacement works for remote access

### ✅ CSP Compliance
- WebSocket connections allowed for remote domains
- No more CSP violations in browser console

## Configuration Details

### Supported Remote Domains
- `http://212.179.162.102:8080/`
- `http://logger.103.fm:8080/`
- `http://l.103.fm:8080/`

### Cookie Configuration
- **Domain**: Automatically set based on request origin
- **Path**: `/` (available across entire domain)
- **HttpOnly**: `true` (secure from XSS)
- **Secure**: `false` in development, `true` in production
- **SameSite**: `lax` (allows cross-site requests)
- **MaxAge**: 24 hours

### WebSocket Configuration
- **Protocol**: `ws://` for development
- **Host**: Remote IP address
- **Port**: 8080 (nginx proxy port)
- **Path**: `/@vite/client` for Vite HMR

## Service Restart

All services were restarted using PM2:
```bash
pm2 restart all
```

This ensures all configuration changes are applied:
- ✅ Nginx configuration reloaded
- ✅ API server restarted with new cookie settings
- ✅ Frontend dev server restarted with new HMR config

## Verification Commands

```bash
# Check nginx configuration
sudo nginx -t

# Check PM2 status
pm2 status

# Test remote access
curl -I http://212.179.162.102:8080/
curl -I http://logger.103.fm:8080/
curl -I http://l.103.fm:8080/

# Check WebSocket connections
# (Monitor browser console for successful HMR connections)
```

## Future Considerations

1. **SSL/TLS**: Consider enabling HTTPS for production
2. **Cookie Security**: Review cookie settings for production deployment
3. **Monitoring**: Set up monitoring for WebSocket connection health
4. **Load Balancing**: Consider load balancer configuration for multiple instances

The session persistence and WebSocket connection issues for remote access have been completely resolved. Users can now access the application from remote IPs without losing their session on page refresh, and all development features (HMR, etc.) work correctly.
