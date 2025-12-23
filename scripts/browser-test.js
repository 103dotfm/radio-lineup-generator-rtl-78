/**
 * Browser Test Script for XSS Protection
 * Run this in your browser console to test the sanitization
 */

console.log('🧪 Browser XSS Protection Test');
console.log('==============================');

// Test function to simulate our sanitization
function testSanitization(input, context = 'show') {
  console.log(`\n🔍 Testing: ${input}`);
  
  // Simulate what our sanitization would do
  let result = input;
  
  // Remove script tags
  result = result.replace(/<script[^>]*>.*?<\/script>/gi, '');
  
  // Remove event handlers
  result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove iframes
  result = result.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  
  // For email context, remove tables
  if (context === 'email') {
    result = result.replace(/<table[^>]*>.*?<\/table>/gi, '');
  }
  
  console.log(`   Input:  ${input}`);
  console.log(`   Output: ${result}`);
  console.log(`   Safe:   ${result !== input ? '✅' : '❌'}`);
  
  return result;
}

// Test cases
const testCases = [
  {
    name: 'Valid HTML',
    input: '<strong>Bold text</strong><p>Paragraph with <em>emphasis</em></p>',
    context: 'show'
  },
  {
    name: 'Script injection',
    input: '<script>alert("xss")</script><p>Safe content</p>',
    context: 'show'
  },
  {
    name: 'Event handler',
    input: '<img src="x" onerror="alert(\'xss\')" alt="test">',
    context: 'show'
  },
  {
    name: 'Iframe',
    input: '<iframe src="javascript:alert(\'xss\')"></iframe><p>Safe</p>',
    context: 'show'
  },
  {
    name: 'Table in show details',
    input: '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>',
    context: 'show'
  },
  {
    name: 'Table in email',
    input: '<table><tr><td>Cell 1</td></tr></table>',
    context: 'email'
  }
];

console.log('\n📋 Running test cases...');

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  testSanitization(testCase.input, testCase.context);
});

console.log('\n✅ Test completed!');
console.log('\n📝 To test in your application:');
console.log('1. Open a show and edit an item');
console.log('2. Add the test HTML to the details field');
console.log('3. Save and verify the content is sanitized');
console.log('4. Check that valid HTML is preserved');
console.log('5. Check that malicious content is stripped');

// Export for use in browser
window.testXSSProtection = testSanitization;
