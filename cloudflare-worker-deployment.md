# Cloudflare Worker Deployment Guide

## **Overview**
This Cloudflare Worker will proxy requests from `https://l.103.fm` to `http://212.179.162.102:8080`, providing HTTPS access to your application.

## **Prerequisites**
1. Cloudflare account with Workers enabled
2. Domain `l.103.fm` added to Cloudflare
3. Wrangler CLI installed

## **Step 1: Install Wrangler CLI**
```bash
npm install -g wrangler
```

## **Step 2: Login to Cloudflare**
```bash
wrangler login
```

## **Step 3: Get Your Zone ID**
1. Go to Cloudflare Dashboard
2. Select your domain `l.103.fm`
3. Copy the Zone ID from the right sidebar
4. Update `wrangler.toml` with your Zone ID

## **Step 4: Update Configuration**
Edit `wrangler.toml` and replace the empty `zone_id` with your actual Zone ID:
```toml
zone_id = "your-zone-id-here"
```

## **Step 5: Deploy the Worker**
```bash
wrangler deploy
```

## **Step 6: Configure DNS**
1. Go to Cloudflare DNS settings
2. **Remove any existing A records** for `l.103.fm` pointing to `212.179.162.102`
3. Add a CNAME record:
   - **Name**: `l`
   - **Target**: `l-103-fm-proxy.your-subdomain.workers.dev`
   - **Proxy status**: DNS only (gray cloud)
4. **Important**: Make sure the cloud icon is **gray** (DNS only), not orange (proxied)

## **Step 7: Configure SSL/TLS**
1. Go to SSL/TLS settings
2. Set SSL/TLS encryption mode to **"Full (strict)"**
3. Enable **"Always Use HTTPS"**

## **How It Works**
- User visits `https://l.103.fm`
- Cloudflare Worker receives the request
- Worker forwards request to `http://212.179.162.102:8080`
- Worker returns the response with HTTPS headers
- User gets secure HTTPS access

## **Benefits**
- ✅ **HTTPS**: All traffic is encrypted
- ✅ **No Port Forwarding**: Bypasses network restrictions
- ✅ **Global CDN**: Fast access worldwide
- ✅ **DDoS Protection**: Built-in security
- ✅ **No Browser Warnings**: Trusted certificate

## **Testing**
After deployment, visit: `https://l.103.fm`

## **Troubleshooting**

### **Common Issues:**

1. **CF 522 Error**: 
   - Check if your server is running on port 8080
   - Verify the external IP `212.179.162.102:8080` is accessible
   - Check Worker logs in Cloudflare Dashboard

2. **Error 111 (Connection Refused)**:
   - Port 8080 is not open on the external IP
   - Contact your hosting provider to open port 8080

3. **DNS Issues**:
   - Make sure DNS points to the Worker, not directly to your server
   - Use gray cloud (DNS only), not orange cloud (proxied)

4. **Worker Not Responding**:
   - Check Worker logs in Cloudflare Dashboard
   - Verify the Worker is deployed successfully
   - Check if the Zone ID is correct

### **Testing Steps:**
1. Test internal access: `http://192.168.10.121:8080`
2. Test external IP: `http://212.179.162.102:8080`
3. Test Worker: `https://l.103.fm`

### **Worker Logs:**
- Go to Cloudflare Dashboard → Workers & Pages
- Select your worker
- Check "Logs" tab for error messages
