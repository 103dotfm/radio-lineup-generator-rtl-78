// Test script to verify server accessibility
import https from 'https';
import http from 'http';

const testUrls = [
  'http://192.168.10.121:8080',
  'http://212.179.162.102:8080',
  'https://l.103.fm'
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      console.log(`✅ ${url} - Status: ${res.statusCode}`);
      resolve({ url, status: res.statusCode, success: true });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${url} - Error: ${err.message}`);
      resolve({ url, error: err.message, success: false });
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${url} - Timeout`);
      req.destroy();
      resolve({ url, error: 'Timeout', success: false });
    });
  });
}

async function runTests() {
  console.log('🔍 Testing server accessibility...\n');
  
  for (const url of testUrls) {
    await testUrl(url);
  }
  
  console.log('\n📋 Summary:');
  console.log('- Internal network (192.168.10.121:8080): Should work');
  console.log('- External IP (212.179.162.102:8080): May not work due to firewall');
  console.log('- Domain (l.103.fm): Should work after Worker deployment');
}

runTests();
