import { query } from './src/lib/db.js';
import fs from 'fs';

async function runFixScript() {
  try {
    console.log('Starting Israeli week format fix...');
    
    // Read the SQL script
    const sqlScript = fs.readFileSync('fix_israeli_week_format.sql', 'utf8');
    
    // Split the script into individual statements
    const statements = sqlScript.split(';').filter(stmt => stmt.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + '...');
        
        const result = await query(statement);
        if (result.error) {
          console.error('Error executing statement:', result.error);
          return;
        }
        
        if (result.data && result.data.length > 0) {
          console.log('Result:', result.data);
        }
        console.log('Statement executed successfully\n');
      }
    }
    
    console.log('Israeli week format fix completed successfully!');
  } catch (error) {
    console.error('Error running fix script:', error);
  }
}

runFixScript(); 