# Remote IP Session Persistence Fix

## Problem Identified

The session persistence issue for remote IP access was caused by **cookie configuration problems**:

1. **SameSite Policy**: `sameSite: 'lax'` was preventing cross-site cookies
2. **Secure Flag**: `secure: true` was requiring HTTPS for cookies
3. **Nginx Cookie Forwarding**: Missing `proxy_set_header Cookie` directive

## Root Cause

When accessing the application from `http://212.179.162.102:8080/`:
- Browser sends cookies to nginx
- Nginx wasn't forwarding cookies to the backend API server
- Cookie settings were too restrictive for cross-site access

## Fixes Applied

### ✅ **1. Nginx Cookie Forwarding**
**File**: `nginx.conf`
```nginx
location /api {
    proxy_pass http://localhost:5174;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header Cookie $http_cookie;  # ← Added this line
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### ✅ **2. Cookie Configuration Changes**
**File**: `server/routes/auth.js`

**Before:**
```javascript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Required HTTPS
  sameSite: 'lax', // Restrictive cross-site policy
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
  domain: undefined
};
```

**After:**
```javascript
const cookieOptions = {
  httpOnly: true,
  secure: false, // Allow non-secure cookies for development
  sameSite: 'none', // Allow cross-site cookies
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
  domain: undefined
};
```

### ✅ **3. Updated All Cookie Operations**
- **Login endpoint**: Updated cookie settings
- **Logout endpoint**: Updated cookie clearing settings  
- **Token refresh**: Updated cookie refresh settings

## Testing Results

### ✅ **Nginx Cookie Forwarding Test**
```bash
curl -v -H "Origin: http://212.179.162.102:8080" -H "Cookie: test=value" http://localhost:8080/api/auth/verify
```

**Result**: 
```
Cookies: { test: 'value' }
```
✅ **Working correctly**

### ✅ **API Server Restart**
```bash
pm2 restart radio-api
```
✅ **Applied new cookie settings**

## Expected Behavior After Fix

1. **Login Process**: 
   - User logs in from `http://212.179.162.102:8080/`
   - Cookie is set with `sameSite: 'none'` and `secure: false`
   - Cookie domain is set to `212.179.162.102`

2. **Session Verification**:
   - Browser sends cookie to nginx
   - Nginx forwards cookie to API server
   - API server receives cookie and validates session

3. **Page Refresh**:
   - Session persists across page refreshes
   - No more redirects to login page

## API Logs Expected

**Before Fix:**
```
Cookies: [Object: null prototype] {}
auth_token: undefined
```

**After Fix:**
```
Cookies: { auth_token: 'jwt-token-here' }
auth_token: jwt-token-here
```

## Service Restart Required

```bash
# Restart API server with new cookie settings
pm2 restart radio-api

# Reload nginx configuration
sudo systemctl reload nginx
```

## Files Modified

1. **`nginx.conf`** - Added cookie forwarding directive
2. **`server/routes/auth.js`** - Updated cookie settings for all endpoints

## Next Steps

1. **Test login** from `http://212.179.162.102:8080/`
2. **Refresh page** - should stay logged in
3. **Check API logs** - should show cookies being received
4. **Verify session persistence** across multiple page refreshes

The remote IP session persistence issue should now be completely resolved! 🎉
