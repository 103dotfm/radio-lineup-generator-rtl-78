# Getting Your Cloudflare Zone ID

## **Method 1: From Cloudflare Dashboard**

1. **Go to Cloudflare Dashboard**: https://dash.cloudflare.com
2. **Select your domain**: `l.103.fm`
3. **Look at the right sidebar** - you'll see "Zone ID"
4. **Copy the Zone ID** (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

## **Method 2: Using curl (if you have API token)**

If you have a Cloudflare API token, you can get the Zone ID with:

```bash
curl -X GET "https://api.cloudflare.com/client/v4/zones?name=l.103.fm" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"
```

## **Method 3: From DNS Settings**

1. Go to **DNS** settings for `l.103.fm`
2. Look at the URL in your browser
3. The Zone ID is in the URL: `https://dash.cloudflare.com/YOUR_ACCOUNT_ID/l.103.fm/dns/records`

## **Next Steps**

Once you have your Zone ID:
1. Update `wrangler.toml` with your Zone ID
2. We'll proceed with the deployment
