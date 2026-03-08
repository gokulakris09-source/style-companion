
-- Add rating column to outfit_history
ALTER TABLE public.outfit_history ADD COLUMN IF NOT EXISTS rating integer DEFAULT NULL;

-- Add occasion column to outfit_history  
ALTER TABLE public.outfit_history ADD COLUMN IF NOT EXISTS occasion text DEFAULT NULL;
