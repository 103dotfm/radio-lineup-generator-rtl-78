import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PROJECT_ID = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!PROJECT_ID || !ACCESS_TOKEN) {
  console.error('Missing required environment variables');
  process.exit(1);
}

try {
  // Generate types
  execSync(
    `npx supabase gen types typescript --project-id "${PROJECT_ID}" --schema public > src/lib/supabase/types/supabase.ts`,
    { stdio: 'inherit' }
  );

  console.log('Types generated successfully!');
} catch (error) {
  console.error('Error generating types:', error);
  process.exit(1);
} 