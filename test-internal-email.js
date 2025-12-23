import nodemailer from 'nodemailer';

// Test internal server email functionality
async function testInternalServerEmail() {
  console.log('Testing internal server email functionality...');
  
  try {
    // Create transporter for internal server (localhost)
    const transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 25,
      secure: false,
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    });

    console.log('Verifying SMTP connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Test email
    const testEmail = {
      from: '"Test Sender" <test@localhost>',
      to: 'test@example.com',
      subject: 'Test Internal Server Email',
      html: `
        <h1>Test Email from Internal Server</h1>
        <p>This is a test email sent using the internal server SMTP.</p>
        <p>Time: ${new Date().toISOString()}</p>
      `,
      headers: {
        'X-Mailer': 'Radio Lineup Generator - Internal Server Test',
        'X-Priority': '3'
      }
    };

    console.log('Sending test email...');
    const info = await transporter.sendMail(testEmail);
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
  } catch (error) {
    console.error('❌ Error testing internal server email:', error.message);
    console.error('Details:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Suggestion: Make sure your server has an SMTP service running on localhost:25');
      console.log('   You can install and configure Postfix, Exim, or another SMTP server.');
    }
  }
}

// Run the test
testInternalServerEmail(); 