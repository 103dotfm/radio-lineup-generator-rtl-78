
import { initializeDatabaseSchema } from './database-schema-check';

// Call initialization functions when the app starts
export const initializeSupabase = () => {
  // Initialize database schema checks
  initializeDatabaseSchema();
};

// Auto-execute when imported
initializeSupabase();
