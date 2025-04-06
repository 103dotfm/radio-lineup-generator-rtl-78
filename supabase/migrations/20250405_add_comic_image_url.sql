
-- Add comic_image_url column to digital_work_arrangements table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'digital_work_arrangements' AND column_name = 'comic_image_url'
  ) THEN
    ALTER TABLE public.digital_work_arrangements DROP COLUMN IF EXISTS comic_prompt;
    ALTER TABLE public.digital_work_arrangements DROP COLUMN IF EXISTS comic_image_url;
  END IF;
END
$$;
