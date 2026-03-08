
-- Create tryon_gallery table
CREATE TABLE public.tryon_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  item_names text[] NOT NULL DEFAULT '{}',
  style text,
  background text,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tryon_gallery ENABLE ROW LEVEL SECURITY;

-- Users can view own gallery items
CREATE POLICY "Users can view own gallery" ON public.tryon_gallery
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own gallery items
CREATE POLICY "Users can insert own gallery" ON public.tryon_gallery
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete own gallery items
CREATE POLICY "Users can delete own gallery" ON public.tryon_gallery
  FOR DELETE USING (auth.uid() = user_id);

-- Users can update own gallery items (toggle public)
CREATE POLICY "Users can update own gallery" ON public.tryon_gallery
  FOR UPDATE USING (auth.uid() = user_id);

-- Anyone can view public gallery items (for sharing)
CREATE POLICY "Anyone can view public gallery items" ON public.tryon_gallery
  FOR SELECT USING (is_public = true);

-- Create storage bucket for try-on images
INSERT INTO storage.buckets (id, name, public) VALUES ('tryon-images', 'tryon-images', true);

-- Storage policies for tryon-images bucket
CREATE POLICY "Users can upload tryon images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tryon-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view tryon images" ON storage.objects
  FOR SELECT USING (bucket_id = 'tryon-images');

CREATE POLICY "Users can delete own tryon images" ON storage.objects
  FOR DELETE USING (bucket_id = 'tryon-images' AND (storage.foldername(name))[1] = auth.uid()::text);
