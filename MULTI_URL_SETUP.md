# Multi-URL Setup Guide

This guide explains how to configure your Radio Lineup Generator to work with multiple URLs for both local network and remote access.

## URLs Supported

1. **Local Network Access**: `http://192.168.10.121` (port 80)
2. **Remote IP Access**: `http://212.179.162.102:8080`
3. **Remote Domain Access**: `http://logger.103.fm:8080`

## Configuration Changes Made

### 1. Server CORS Configuration
Updated `server/server.js` to allow requests from all your URLs:
- Added remote IP and domain to allowed origins
- Maintains security while enabling multi-URL access

### 2. Frontend API Client
Updated `src/lib/api-client.ts` to auto-detect the current host and use the appropriate API URL:
- Automatically detects if you're on local network or remote URLs
- Uses the correct API endpoint for each environment
- Falls back to relative paths for same-origin requests

### 3. Vite Configuration
Updated `vite.config.ts` to listen on all interfaces:
- Changed host from `localhost` to `0.0.0.0`
- Allows connections from any IP address

### 4. Nginx Configuration
Updated `nginx.conf` to handle both local and remote access:
- Port 80: Local network access (`192.168.10.121`)
- Port 8080: Remote access (`212.179.162.102` and `logger.103.fm`)

### 5. PM2 Configuration
Updated `ecosystem.config.cjs` to allow connections from any IP:
- Added `HOST: '0.0.0.0'` to API server configuration
- Keeps database connection as `localhost` (correct for local DB)

## Database Connection

The database connection remains local (`localhost`/`127.0.0.1`) which is correct because:
- The database runs on the same server as the application
- All API requests are handled by the local server
- No need to expose the database to external connections

## Environment Variables

You can optionally set `VITE_API_URL` in your environment to override the auto-detection:

```bash
# For local development
VITE_API_URL=http://192.168.10.121:5174

# For remote access
VITE_API_URL=http://212.179.162.102:8080
# or
VITE_API_URL=http://logger.103.fm:8080
```

If not set, the application will auto-detect the appropriate URL based on the current hostname.

## Restarting Services

To apply all changes, run the restart script:

```bash
./restart-services.sh
```

This script will:
1. Stop all PM2 processes
2. Reload nginx configuration
3. Start PM2 processes with new configuration
4. Save PM2 configuration

## Testing

After restarting, test access from each URL:

1. **Local Network**: `http://192.168.10.121`
2. **Remote IP**: `http://212.179.162.102:8080`
3. **Remote Domain**: `http://logger.103.fm:8080`

All URLs should now work correctly with proper database connectivity.

## Troubleshooting

### CORS Errors
If you see CORS errors, check that the origin is included in the `allowedOrigins` array in `server/server.js`.

### Database Connection Issues
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Check database credentials in `ecosystem.config.cjs`
- Verify database is accessible: `psql -h localhost -U radiouser -d radiodb`

### Port Issues
- Check if ports are in use: `netstat -tlnp | grep :80` and `netstat -tlnp | grep :8080`
- Ensure nginx is running: `sudo systemctl status nginx`
- Check PM2 status: `pm2 status`

### Firewall Issues
- Ensure port 8080 is open for remote access: `sudo ufw allow 8080`
- Check if port 80 is open for local access: `sudo ufw allow 80` 