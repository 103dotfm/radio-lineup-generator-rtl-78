
-- This migration adds:
-- 1. A new workers table to store worker information
-- 2. Updates the digital_shifts table to include additional_text field
-- 3. Updates the digital_shift_custom_rows table to support column-specific content

-- Check if the workers table exists, if not create it
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies to the workers table
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Create policies for the workers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workers' AND policyname = 'Allow authenticated read access'
  ) THEN
    CREATE POLICY "Allow authenticated read access" ON public.workers
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workers' AND policyname = 'Allow authenticated insert access'
  ) THEN
    CREATE POLICY "Allow authenticated insert access" ON public.workers
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workers' AND policyname = 'Allow authenticated update access'
  ) THEN
    CREATE POLICY "Allow authenticated update access" ON public.workers
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workers' AND policyname = 'Allow authenticated delete access'
  ) THEN
    CREATE POLICY "Allow authenticated delete access" ON public.workers
      FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Check if the digital_work_arrangements table exists, if not create it
CREATE TABLE IF NOT EXISTS public.digital_work_arrangements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  notes TEXT,
  footer_text TEXT,
  footer_image_url TEXT,
  comic_prompt TEXT, -- Add comic_prompt field
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies to the digital_work_arrangements table
ALTER TABLE public.digital_work_arrangements ENABLE ROW LEVEL SECURITY;

-- Create policies for the digital_work_arrangements table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_work_arrangements' AND policyname = 'Allow authenticated read access'
  ) THEN
    CREATE POLICY "Allow authenticated read access" ON public.digital_work_arrangements
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_work_arrangements' AND policyname = 'Allow authenticated insert access'
  ) THEN
    CREATE POLICY "Allow authenticated insert access" ON public.digital_work_arrangements
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_work_arrangements' AND policyname = 'Allow authenticated update access'
  ) THEN
    CREATE POLICY "Allow authenticated update access" ON public.digital_work_arrangements
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_work_arrangements' AND policyname = 'Allow authenticated delete access'
  ) THEN
    CREATE POLICY "Allow authenticated delete access" ON public.digital_work_arrangements
      FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Create the digital_shifts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.digital_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arrangement_id UUID REFERENCES public.digital_work_arrangements(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  shift_type TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  person_name TEXT,
  is_custom_time BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add additional_text column if it doesn't exist in digital_shifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'digital_shifts' AND column_name = 'additional_text'
  ) THEN
    ALTER TABLE public.digital_shifts ADD COLUMN additional_text TEXT;
  END IF;
END
$$;

-- Add RLS policies to the digital_shifts table
ALTER TABLE public.digital_shifts ENABLE ROW LEVEL SECURITY;

-- Create policies for the digital_shifts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_shifts' AND policyname = 'Allow authenticated read access'
  ) THEN
    CREATE POLICY "Allow authenticated read access" ON public.digital_shifts
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_shifts' AND policyname = 'Allow authenticated insert access'
  ) THEN
    CREATE POLICY "Allow authenticated insert access" ON public.digital_shifts
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_shifts' AND policyname = 'Allow authenticated update access'
  ) THEN
    CREATE POLICY "Allow authenticated update access" ON public.digital_shifts
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_shifts' AND policyname = 'Allow authenticated delete access'
  ) THEN
    CREATE POLICY "Allow authenticated delete access" ON public.digital_shifts
      FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Create digital_shift_custom_rows table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.digital_shift_custom_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arrangement_id UUID REFERENCES public.digital_work_arrangements(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  content TEXT, -- Keep for backward compatibility
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add contents column to store column-specific content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'digital_shift_custom_rows' AND column_name = 'contents'
  ) THEN
    ALTER TABLE public.digital_shift_custom_rows ADD COLUMN contents JSONB;
  END IF;
END
$$;

-- Add RLS policies to the digital_shift_custom_rows table
ALTER TABLE public.digital_shift_custom_rows ENABLE ROW LEVEL SECURITY;

-- Create policies for the digital_shift_custom_rows table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_shift_custom_rows' AND policyname = 'Allow authenticated read access'
  ) THEN
    CREATE POLICY "Allow authenticated read access" ON public.digital_shift_custom_rows
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_shift_custom_rows' AND policyname = 'Allow authenticated insert access'
  ) THEN
    CREATE POLICY "Allow authenticated insert access" ON public.digital_shift_custom_rows
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_shift_custom_rows' AND policyname = 'Allow authenticated update access'
  ) THEN
    CREATE POLICY "Allow authenticated update access" ON public.digital_shift_custom_rows
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'digital_shift_custom_rows' AND policyname = 'Allow authenticated delete access'
  ) THEN
    CREATE POLICY "Allow authenticated delete access" ON public.digital_shift_custom_rows
      FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END
$$;
