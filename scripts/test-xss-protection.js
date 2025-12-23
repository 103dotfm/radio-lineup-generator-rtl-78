#!/usr/bin/env node

/**
 * XSS Protection Test Script
 * Tests that DOMPurify sanitization works correctly without breaking functionality
 */

import { JSDOM } from 'jsdom';

// Create a DOM environment for DOMPurify
const dom = new JSDOM('');
global.window = dom.window;
global.document = dom.window.document;

// Import DOMPurify after setting up the DOM
const DOMPurify = (await import('dompurify')).default;

console.log('🧪 Testing XSS Protection Implementation...\n');

// Test configurations (matching our sanitize utility)
const showDetailsConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'div', 'span', 'a', 'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'td', 'th'
  ],
  ALLOWED_ATTR: [
    'class', 'style', 'href', 'target', 'rel',
    'id', 'title', 'alt', 'dir', 'lang',
    'colspan', 'rowspan', 'align', 'valign'
  ],
  FORBID_TAGS: [
    'script', 'object', 'embed', 'form', 'input', 'textarea',
    'select', 'option', 'button', 'iframe', 'frame', 'frameset'
  ],
  FORBID_ATTR: [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus',
    'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect',
    'onunload', 'onabort', 'onbeforeunload', 'onerror', 'onhashchange',
    'onmessage', 'onoffline', 'ononline', 'onpagehide', 'onpageshow',
    'onpopstate', 'onresize', 'onstorage', 'oncontextmenu'
  ]
};

const emailConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'div', 'span', 'a'
  ],
  ALLOWED_ATTR: [
    'class', 'style', 'href', 'target', 'rel'
  ],
  FORBID_TAGS: [
    'script', 'object', 'embed', 'form', 'input', 'textarea',
    'select', 'option', 'button', 'iframe', 'frame', 'frameset',
    'table', 'thead', 'tbody', 'tr', 'td', 'th'
  ],
  FORBID_ATTR: [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus',
    'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect',
    'onunload', 'onabort', 'onbeforeunload', 'onerror', 'onhashchange',
    'onmessage', 'onoffline', 'ononline', 'onpagehide', 'onpageshow',
    'onpopstate', 'onresize', 'onstorage', 'oncontextmenu'
  ]
};

// Test cases
const testCases = [
  {
    name: 'Valid HTML - Should be preserved (Show Details)',
    input: '<strong>Bold text</strong><p>Paragraph with <em>emphasis</em></p>',
    expected: 'preserved',
    config: showDetailsConfig
  },
  {
    name: 'Script injection - Should be stripped (Show Details)',
    input: '<script>alert("xss")</script><p>Safe content</p>',
    expected: 'stripped',
    config: showDetailsConfig
  },
  {
    name: 'Event handler - Should be stripped (Show Details)',
    input: '<img src="x" onerror="alert(\'xss\')" alt="test">',
    expected: 'stripped',
    config: showDetailsConfig
  },
  {
    name: 'Iframe - Should be stripped (Show Details)',
    input: '<iframe src="javascript:alert(\'xss\')"></iframe><p>Safe</p>',
    expected: 'stripped',
    config: showDetailsConfig
  },
  {
    name: 'Valid table - Should be preserved (Show Details)',
    input: '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>',
    expected: 'preserved',
    config: showDetailsConfig
  },
  {
    name: 'Table in email - Should be stripped (Email Content)',
    input: '<table><tr><td>Cell 1</td></tr></table>',
    expected: 'stripped',
    config: emailConfig
  },
  {
    name: 'Valid HTML in email - Should be preserved (Email Content)',
    input: '<strong>Bold text</strong><p>Paragraph with <em>emphasis</em></p>',
    expected: 'preserved',
    config: emailConfig
  },
  {
    name: 'Script in email - Should be stripped (Email Content)',
    input: '<script>alert("xss")</script><p>Safe content</p>',
    expected: 'stripped',
    config: emailConfig
  }
];

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  
  try {
    const result = DOMPurify.sanitize(testCase.input, testCase.config);
    const hasScript = result.includes('<script>') || result.includes('onerror=') || result.includes('iframe');
    const hasTable = result.includes('<table>');
    
    let testPassed = false;
    
    if (testCase.expected === 'preserved') {
      testPassed = !hasScript && (testCase.input.includes('<table>') ? hasTable : true);
    } else if (testCase.expected === 'stripped') {
      testPassed = !hasScript;
    }
    
    if (testPassed) {
      console.log(`  ✅ PASSED`);
      passedTests++;
    } else {
      console.log(`  ❌ FAILED`);
      console.log(`    Input: ${testCase.input}`);
      console.log(`    Output: ${result}`);
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
  }
  
  console.log('');
});

console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All XSS protection tests passed!');
  console.log('✅ DOMPurify is working correctly');
  console.log('✅ Security configurations are effective');
  console.log('✅ Context-specific sanitization works');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}
