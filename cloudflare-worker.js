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
