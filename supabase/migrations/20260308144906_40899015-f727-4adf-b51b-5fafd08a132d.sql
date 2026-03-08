-- Add image_url to outfit_history
ALTER TABLE public.outfit_history ADD COLUMN IF NOT EXISTS image_url text;

-- Add day_of_week to outfit_history for easier weekly querying
ALTER TABLE public.outfit_history ADD COLUMN IF NOT EXISTS day_of_week text;

-- Add missing UPDATE RLS policy
CREATE POLICY "Users can update own history"
ON public.outfit_history
FOR UPDATE
USING (auth.uid() = user_id);