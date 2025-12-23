-- Migration: Add master schedule fields to schedule_slots table
-- This migration adds the necessary fields to support master schedule functionality

-- Add missing columns to schedule_slots table
ALTER TABLE schedule_slots 
ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slot_date DATE,
ADD COLUMN IF NOT EXISTS parent_slot_id UUID REFERENCES schedule_slots(id),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_master ON schedule_slots(is_master);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_slot_date ON schedule_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_parent_slot_id ON schedule_slots(parent_slot_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_deleted ON schedule_slots(is_deleted);

-- Update existing slots to have proper slot_date based on day_of_week
-- This sets the slot_date to the current week's date for the given day_of_week
UPDATE schedule_slots 
SET slot_date = (
  SELECT date_trunc('week', CURRENT_DATE)::date + (day_of_week * interval '1 day')
)
WHERE slot_date IS NULL;

-- Make slot_date NOT NULL after setting default values
ALTER TABLE schedule_slots ALTER COLUMN slot_date SET NOT NULL;

-- Add comment to explain the new fields
COMMENT ON COLUMN schedule_slots.is_master IS 'Whether this is a master schedule slot (template) or a weekly instance';
COMMENT ON COLUMN schedule_slots.slot_date IS 'The actual date of this slot';
COMMENT ON COLUMN schedule_slots.parent_slot_id IS 'Reference to master slot if this is a weekly instance';
COMMENT ON COLUMN schedule_slots.is_deleted IS 'Soft delete flag'; 