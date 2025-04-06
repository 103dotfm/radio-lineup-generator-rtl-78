
-- Remove comic_image_url column from digital_work_arrangements table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'digital_work_arrangements' AND column_name = 'comic_prompt'
  ) THEN
    ALTER TABLE public.digital_work_arrangements DROP COLUMN IF EXISTS comic_prompt;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'digital_work_arrangements' AND column_name = 'comic_image_url'
  ) THEN
    ALTER TABLE public.digital_work_arrangements DROP COLUMN IF EXISTS comic_image_url;
  END IF;
END
$$;
