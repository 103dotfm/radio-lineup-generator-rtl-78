-- First, drop the unique constraint on name if it exists
ALTER TABLE producer_roles DROP CONSTRAINT IF EXISTS producer_roles_name_key;

-- Add a unique constraint on both name and display_order
ALTER TABLE producer_roles 
ADD CONSTRAINT producer_roles_name_display_order_key 
UNIQUE (name, display_order);

-- Update the table to allow upsert on id
ALTER TABLE producer_roles 
DROP CONSTRAINT IF EXISTS producer_roles_pkey,
ADD CONSTRAINT producer_roles_pkey PRIMARY KEY (id); 