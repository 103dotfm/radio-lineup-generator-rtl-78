import { query } from './src/lib/db.js';

async function setupInternalEmail() {
  try {
    console.log('Setting up internal server email settings...');
    
    // Check if email settings exist
    const existingSettings = await query('SELECT * FROM email_settings LIMIT 1');
    
    if (existingSettings.data && existingSettings.data.length > 0) {
      console.log('Updating existing email settings...');
      
      // Update existing settings to use internal server
      const result = await query(`
        UPDATE email_settings 
        SET 
          email_method = 'internal_server',
          sender_email = 'test@localhost',
          sender_name = 'Radio Lineup Generator',
          subject_template = 'ליינאפ תוכנית {{show_name}}',
          body_template = '<h1>{{show_name}}</h1><p>תאריך: {{show_date}}</p><p>שעה: {{show_time}}</p>',
          is_eu_region = false,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [existingSettings.data[0].id]);
      
      if (result.error) throw result.error;
      console.log('✅ Email settings updated successfully');
      
    } else {
      console.log('Creating new email settings...');
      
      // Create new email settings
      const result = await query(`
        INSERT INTO email_settings (
          email_method,
          sender_email,
          sender_name,
          subject_template,
          body_template,
          smtp_host,
          smtp_port,
          smtp_user,
          smtp_password,
          is_eu_region,
          created_at,
          updated_at
        ) VALUES (
          'internal_server',
          'test@localhost',
          'Radio Lineup Generator',
          'ליינאפ תוכנית {{show_name}}',
          '<h1>{{show_name}}</h1><p>תאריך: {{show_date}}</p><p>שעה: {{show_time}}</p>',
          'localhost',
          25,
          '',
          '',
          false,
          NOW(),
          NOW()
        ) RETURNING *
      `);
      
      if (result.error) throw result.error;
      console.log('✅ Email settings created successfully');
    }
    
    // Add a test recipient
    console.log('Adding test email recipient...');
    const recipientResult = await query(`
      INSERT INTO email_recipients (email, created_at) 
      VALUES ('test@example.com', NOW())
      RETURNING *
    `);
    
    if (recipientResult.error) throw recipientResult.error;
    console.log('✅ Test recipient added successfully');
    
    console.log('\n🎉 Internal server email setup complete!');
    console.log('You can now test the email functionality in the admin panel.');
    
  } catch (error) {
    console.error('❌ Error setting up internal email:', error);
  }
}

setupInternalEmail(); 