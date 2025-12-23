#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';

const API_BASE = 'http://localhost:5174';

async function testStorage() {
  console.log('Testing new storage system...\n');

  try {
    // Test 1: Check if storage endpoint is accessible
    console.log('1. Testing storage endpoint accessibility...');
    const response = await fetch(`${API_BASE}/api/storage/list/general`);
    if (response.ok) {
      console.log('✅ Storage endpoint is accessible');
      const data = await response.json();
      console.log(`   Found ${data.files?.length || 0} files in general category`);
    } else {
      console.log('❌ Storage endpoint is not accessible');
      return;
    }

    // Test 2: Check if static file serving works
    console.log('\n2. Testing static file serving...');
    const staticResponse = await fetch(`${API_BASE}/storage/uploads/general/103fm-logo.png`);
    if (staticResponse.ok) {
      console.log('✅ Static file serving is working');
      console.log(`   File size: ${staticResponse.headers.get('content-length')} bytes`);
    } else {
      console.log('❌ Static file serving is not working');
      console.log(`   Status: ${staticResponse.status}`);
    }

    // Test 3: Test file upload (create a test file)
    console.log('\n3. Testing file upload...');
    const testContent = 'This is a test file for storage system verification.';
    const testFilePath = '/tmp/test-storage.txt';
    await fs.writeFile(testFilePath, testContent);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath), 'test-storage.txt');

    const uploadResponse = await fetch(`${API_BASE}/api/storage/upload/general`, {
      method: 'POST',
      body: formData
    });

    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log('✅ File upload is working');
      console.log(`   Uploaded file: ${uploadResult.data.filename}`);
      console.log(`   File path: ${uploadResult.data.path}`);
      
      // Test 4: Verify uploaded file is accessible
      console.log('\n4. Testing uploaded file accessibility...');
      const fileResponse = await fetch(`${API_BASE}${uploadResult.data.path}`);
      if (fileResponse.ok) {
        console.log('✅ Uploaded file is accessible');
        const downloadedContent = await fileResponse.text();
        if (downloadedContent === testContent) {
          console.log('✅ File content matches original');
        } else {
          console.log('❌ File content does not match original');
        }
      } else {
        console.log('❌ Uploaded file is not accessible');
      }
    } else {
      console.log('❌ File upload is not working');
      console.log(`   Status: ${uploadResponse.status}`);
      const errorText = await uploadResponse.text();
      console.log(`   Error: ${errorText}`);
    }

    // Cleanup
    await fs.remove(testFilePath);

    console.log('\n✅ Storage system test completed successfully!');

  } catch (error) {
    console.error('❌ Storage system test failed:', error.message);
  }
}

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testStorage();
}

export default testStorage;
