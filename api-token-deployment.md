# Cloudflare API Token Deployment Guide

## **Step 1: Create API Token**

1. **Go to Cloudflare Dashboard**: https://dash.cloudflare.com/profile/api-tokens
2. **Click "Create Token"**
3. **Choose "Custom token"**
4. **Configure permissions**:
   - **Zone**: `l.103.fm` - Zone:Read, Zone:Edit
   - **Zone**: `l.103.fm` - DNS:Edit
   - **Zone**: `l.103.fm` - SSL and Certificates:Edit
   - **Account**: Workers:Edit
5. **Set Zone Resources**: Include - Specific zone - `l.103.fm`
6. **Click "Continue to summary"**
7. **Click "Create Token"**
8. **Copy the token** (you'll only see it once!)

## **Step 2: Configure Wrangler**

1. **Create wrangler.toml** with your token:
```toml
name = "l-103-fm-proxy"
main = "cloudflare-worker.js"
compatibility_date = "2025-08-10"

[env.production]
name = "l-103-fm-proxy"
route = "l.103.fm/*"

# Add your API token
[env.production.vars]
CLOUDFLARE_API_TOKEN = "your-api-token-here"
```

2. **Set environment variable**:
```bash
export CLOUDFLARE_API_TOKEN="your-api-token-here"
```

## **Step 3: Deploy**

```bash
wrangler deploy --env production
```

## **Step 4: Configure DNS**

1. **Go to DNS settings** for `l.103.fm`
2. **Remove any existing A records** for `l.103.fm`
3. **Add a CNAME record**:
   - **Name**: `l`
   - **Target**: `l-103-fm-proxy.your-subdomain.workers.dev`
   - **Proxy status**: DNS only (gray cloud)

## **Step 5: Configure SSL/TLS**

1. **Go to SSL/TLS settings**
2. **Set SSL/TLS encryption mode** to **"Full (strict)"**
3. **Enable "Always Use HTTPS"**
