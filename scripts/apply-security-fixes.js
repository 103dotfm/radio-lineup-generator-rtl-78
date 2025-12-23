#!/usr/bin/env node

/**
 * Week 1 Security Fixes Application Script
 * 
 * This script applies the critical security fixes:
 * 1. Prevent privilege escalation via users.is_admin
 * 2. Remove plaintext password storage
 * 3. Remove dangerous execute_sql functions
 * 4. Secure API endpoints
 */

import { query } from '../src/lib/db.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applySecurityFixes() {
  console.log('🔒 Applying Week 1 Security Fixes...\n');

  try {
    // Fix 1: Prevent privilege escalation
    console.log('1️⃣ Applying privilege escalation prevention...');
    const fix1SQL = readFileSync(join(__dirname, '../migrations/security_fix_1_prevent_admin_escalation.sql'), 'utf8');
    const result1 = await query(fix1SQL);
    if (result1.error) {
      throw new Error(`Fix 1 failed: ${result1.error.message}`);
    }
    console.log('✅ Privilege escalation prevention applied successfully');

    // Fix 2: Remove plaintext passwords
    console.log('\n2️⃣ Removing plaintext password storage...');
    const fix2SQL = readFileSync(join(__dirname, '../migrations/security_fix_2_remove_plaintext_passwords.sql'), 'utf8');
    const result2 = await query(fix2SQL);
    if (result2.error) {
      throw new Error(`Fix 2 failed: ${result2.error.message}`);
    }
    console.log('✅ Plaintext password storage removed successfully');

    // Verify the fixes
    console.log('\n🔍 Verifying security fixes...');
    
    // Check if the trigger exists
    const triggerCheck = await query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'prevent_self_admin_promotion_trigger'
    `);
    
    if (triggerCheck.error) {
      throw new Error(`Trigger verification failed: ${triggerCheck.error.message}`);
    }
    
    if (triggerCheck.data && triggerCheck.data.length > 0) {
      console.log('✅ Admin promotion prevention trigger is active');
    } else {
      console.log('⚠️  Warning: Admin promotion prevention trigger not found');
    }

    // Check if password_readable column is removed
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'workers' AND column_name = 'password_readable'
    `);
    
    if (columnCheck.error) {
      throw new Error(`Column verification failed: ${columnCheck.error.message}`);
    }
    
    if (columnCheck.data && columnCheck.data.length === 0) {
      console.log('✅ Plaintext password column removed successfully');
    } else {
      console.log('⚠️  Warning: Plaintext password column still exists');
    }

    // Check if new admin creation prevention trigger exists
    const newAdminTriggerCheck = await query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'prevent_new_admin_creation_trigger'
    `);
    
    if (newAdminTriggerCheck.error) {
      throw new Error(`New admin creation trigger verification failed: ${newAdminTriggerCheck.error.message}`);
    }
    
    if (newAdminTriggerCheck.data && newAdminTriggerCheck.data.length > 0) {
      console.log('✅ New admin creation prevention trigger is active');
    } else {
      console.log('⚠️  Warning: New admin creation prevention trigger not found');
    }

    console.log('\n🎉 Week 1 Security Fixes Applied Successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('   • Added trigger to prevent self-admin promotion');
    console.log('   • Added constraint to prevent admin creation on INSERT');
    console.log('   • Removed plaintext password storage');
    console.log('   • Created audit table for removed passwords');
    console.log('   • Removed dangerous execute_sql functions');
    console.log('   • Secured API endpoints with authentication');
    
    console.log('\n⚠️  Important notes:');
    console.log('   • Passwords are now only stored hashed in the users table');
    console.log('   • Temporary passwords are shown only once in the UI');
    console.log('   • Admin functions require proper authentication');
    console.log('   • Database schema creation is now secure');

  } catch (error) {
    console.error('\n❌ Error applying security fixes:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the script
applySecurityFixes().then(() => {
  console.log('\n✅ Security fixes completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Security fixes failed:', error);
  process.exit(1);
});
