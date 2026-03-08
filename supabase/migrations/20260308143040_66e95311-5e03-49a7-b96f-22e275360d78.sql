
-- Add preview_image_url to outfit_plans to store try-on generated images
ALTER TABLE public.outfit_plans ADD COLUMN IF NOT EXISTS preview_image_url text DEFAULT NULL;
