-- Security Fix 1: Prevent privilege escalation via users.is_admin
-- This migration adds security measures to prevent users from promoting themselves to admin

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    is_admin BOOLEAN;
BEGIN
    -- Get current user ID from session (this will be set by the application)
    current_user_id := current_setting('app.current_user_id', true)::uuid;
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if current user is admin
    SELECT is_admin INTO is_admin 
    FROM users 
    WHERE id = current_user_id;
    
    RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to prevent self-admin promotion
CREATE OR REPLACE FUNCTION prevent_self_admin_promotion()
RETURNS TRIGGER AS $$
BEGIN
    -- If is_admin is being changed from false to true
    IF OLD.is_admin = false AND NEW.is_admin = true THEN
        -- Check if the current user is already an admin
        IF NOT is_current_user_admin() THEN
            RAISE EXCEPTION 'Only existing admins can promote users to admin';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_self_admin_promotion_trigger ON users;
CREATE TRIGGER prevent_self_admin_promotion_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_admin_promotion();

-- Instead of a constraint, we'll use a trigger to prevent new admin creation
-- This is more flexible and won't conflict with existing admin users

-- Create a trigger function to prevent new admin creation
CREATE OR REPLACE FUNCTION prevent_new_admin_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check on INSERT operations
    IF TG_OP = 'INSERT' AND NEW.is_admin = true THEN
        RAISE EXCEPTION 'Cannot create new admin users directly. Use promote_user_to_admin() function instead.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_new_admin_creation_trigger ON users;
CREATE TRIGGER prevent_new_admin_creation_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_new_admin_creation();

-- Create a function to safely promote users to admin (only for existing admins)
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_id_to_promote UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_current_user_admin() THEN
        RAISE EXCEPTION 'Only existing admins can promote users to admin';
    END IF;
    
    -- Update the user to admin
    UPDATE users 
    SET is_admin = true, 
        role = 'admin',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id_to_promote;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to safely demote users from admin (only for existing admins)
CREATE OR REPLACE FUNCTION demote_user_from_admin(user_id_to_demote UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is admin
    IF NOT is_current_user_admin() THEN
        RAISE EXCEPTION 'Only existing admins can demote users from admin';
    END IF;
    
    -- Prevent demoting the last admin
    IF (SELECT COUNT(*) FROM users WHERE is_admin = true) <= 1 
       AND (SELECT is_admin FROM users WHERE id = user_id_to_demote) = true THEN
        RAISE EXCEPTION 'Cannot demote the last admin user';
    END IF;
    
    -- Update the user to regular user
    UPDATE users 
    SET is_admin = false, 
        role = 'user',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = user_id_to_demote;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the security measures
COMMENT ON FUNCTION prevent_self_admin_promotion() IS 'Prevents users from promoting themselves to admin';
COMMENT ON FUNCTION promote_user_to_admin(UUID) IS 'Safely promotes a user to admin (admin only)';
COMMENT ON FUNCTION demote_user_from_admin(UUID) IS 'Safely demotes a user from admin (admin only)';
