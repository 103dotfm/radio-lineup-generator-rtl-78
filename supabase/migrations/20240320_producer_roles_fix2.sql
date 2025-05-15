-- Drop all existing constraints
ALTER TABLE producer_roles 
DROP CONSTRAINT IF EXISTS producer_roles_name_key,
DROP CONSTRAINT IF EXISTS producer_roles_name_display_order_key,
DROP CONSTRAINT IF EXISTS producer_roles_pkey;

-- Clear the table to start fresh
TRUNCATE TABLE producer_roles;

-- Add back only the primary key constraint
ALTER TABLE producer_roles 
ADD CONSTRAINT producer_roles_pkey PRIMARY KEY (id);

-- Enable RLS again just to be sure
ALTER TABLE producer_roles ENABLE ROW LEVEL SECURITY; 