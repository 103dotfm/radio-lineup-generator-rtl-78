# Manual Cloudflare Worker Deployment Guide

## **Step 1: Access Cloudflare Workers**

1. **Go to Cloudflare Dashboard**: https://dash.cloudflare.com
2. **Select your domain**: `l.103.fm`
3. **Go to Workers & Pages**: Click on "Workers & Pages" in the left sidebar
4. **Create a new Worker**: Click "Create application"

## **Step 2: Create the Worker**

1. **Choose "Create Worker"**
2. **Name your worker**: `l-103-fm-proxy`
3. **Click "Deploy"** (we'll edit the code after)

## **Step 3: Edit the Worker Code**

1. **Click on your worker** to open the editor
2. **Replace the default code** with the content from `cloudflare-worker.js`
3. **Click "Save and deploy"**

## **Step 4: Configure Routes**

1. **Go to "Settings"** tab in your worker
2. **Click "Triggers"**
3. **Add a route**:
   - **Route**: `l.103.fm/*`
   - **Zone**: Select your `l.103.fm` zone
4. **Save the route**

## **Step 5: Update DNS**

1. **Go to DNS settings** for `l.103.fm`
2. **Remove any existing A records** for `l.103.fm`
3. **Add a CNAME record**:
   - **Name**: `l`
   - **Target**: `l-103-fm-proxy.your-subdomain.workers.dev`
   - **Proxy status**: DNS only (gray cloud)

## **Step 6: Configure SSL/TLS**

1. **Go to SSL/TLS settings**
2. **Set SSL/TLS encryption mode** to **"Full (strict)"**
3. **Enable "Always Use HTTPS"**

## **Worker Code to Copy:**

Copy this code into your worker editor:

```javascript
// Cloudflare Worker to proxy requests from https://l.103.fm to http://212.179.162.102:8080
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Get the original URL
  const url = new URL(request.url)
  
  // Create the target URL pointing to your server (using external IP)
  const targetUrl = `http://212.179.162.102:8080${url.pathname}${url.search}`
  
  // Create headers for the request to your server
  const headers = new Headers(request.headers)
  
  // Update the Host header to match your server
  headers.set('Host', '212.179.162.102:8080')
  
  // Add X-Forwarded headers
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '')
  headers.set('X-Forwarded-Proto', 'https')
  headers.set('X-Forwarded-Host', url.hostname)
  
  // Create the request to your server
  const serverRequest = new Request(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'manual'
  })
  
  try {
    // Fetch from your server with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(serverRequest, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    // Create response headers
    const responseHeaders = new Headers(response.headers)
    
    // Add security headers
    responseHeaders.set('X-Frame-Options', 'SAMEORIGIN')
    responseHeaders.set('X-Content-Type-Options', 'nosniff')
    responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    responseHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    
    // Handle WebSocket upgrades
    if (request.headers.get('Upgrade') === 'websocket') {
      return response
    }
    
    // Create the response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
    
  } catch (error) {
    // Handle specific errors
    console.error('Worker error:', error)
    
    let errorMessage = 'Service temporarily unavailable'
    let statusCode = 503
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - server is not responding'
      statusCode = 504
    } else if (error.message.includes('fetch')) {
      errorMessage = 'Unable to connect to server - please check if the server is running on port 8080'
      statusCode = 502
    }
    
    return new Response(errorMessage, {
      status: statusCode,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}
```

## **Testing**

After deployment, test:
- `https://l.103.fm` - Should work with HTTPS
- Check Worker logs in the Cloudflare Dashboard
