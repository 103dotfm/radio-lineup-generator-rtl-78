#!/bin/bash

echo "Testing multi-URL accessibility..."
echo "=================================="

# Test local network access
echo "1. Testing local network access (192.168.10.121)..."
if curl -s -o /dev/null -w "%{http_code}" http://192.168.10.121 | grep -q "200"; then
    echo "   ✓ Local network access working"
else
    echo "   ✗ Local network access failed"
fi

# Test remote IP access
echo "2. Testing remote IP access (212.179.162.102:8080)..."
if curl -s -o /dev/null -w "%{http_code}" http://212.179.162.102:8080 | grep -q "200"; then
    echo "   ✓ Remote IP access working"
else
    echo "   ✗ Remote IP access failed"
fi

# Test remote domain access
echo "3. Testing remote domain access (logger.103.fm:8080)..."
if curl -s -o /dev/null -w "%{http_code}" http://logger.103.fm:8080 | grep -q "200"; then
    echo "   ✓ Remote domain access working"
else
    echo "   ✗ Remote domain access failed"
fi

# Test API endpoints
echo "4. Testing API endpoints..."
if curl -s -o /dev/null -w "%{http_code}" http://192.168.10.121/api | grep -q "200"; then
    echo "   ✓ Local API working"
else
    echo "   ✗ Local API failed"
fi

if curl -s -o /dev/null -w "%{http_code}" http://212.179.162.102:8080/api | grep -q "200"; then
    echo "   ✓ Remote API working"
else
    echo "   ✗ Remote API failed"
fi

echo ""
echo "Test completed!"
echo ""
echo "If all tests pass, your website is accessible from all URLs:"
echo "- Local: http://192.168.10.121"
echo "- Remote IP: http://212.179.162.102:8080"
echo "- Remote Domain: http://logger.103.fm:8080" 