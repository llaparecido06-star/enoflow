
-- Add capture_point_ids array column to menu_items
ALTER TABLE public.menu_items ADD COLUMN capture_point_ids uuid[] NOT NULL DEFAULT '{}';

-- Migrate existing data from single capture_point_id to array
UPDATE public.menu_items 
SET capture_point_ids = ARRAY[capture_point_id] 
WHERE capture_point_id IS NOT NULL;

-- Drop the old foreign key constraint and column
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_capture_point_id_fkey;
ALTER TABLE public.menu_items DROP COLUMN capture_point_id;
