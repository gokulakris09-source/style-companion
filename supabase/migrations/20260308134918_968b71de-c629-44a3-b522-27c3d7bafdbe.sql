
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  style_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clothing items table
CREATE TABLE public.clothing_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('top', 'bottom', 'dress', 'footwear', 'outerwear', 'accessory')),
  color TEXT NOT NULL,
  fabric TEXT NOT NULL,
  season TEXT NOT NULL CHECK (season IN ('spring', 'summer', 'fall', 'winter', 'all')),
  occasion TEXT NOT NULL CHECK (occasion IN ('casual', 'formal', 'smart-casual', 'sportswear', 'party')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  care_instructions TEXT DEFAULT '',
  cleanliness TEXT NOT NULL DEFAULT 'clean' CHECK (cleanliness IN ('clean', 'worn', 'dirty')),
  image_url TEXT DEFAULT '',
  last_worn_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own items" ON public.clothing_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own items" ON public.clothing_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON public.clothing_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON public.clothing_items FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_clothing_items_updated_at BEFORE UPDATE ON public.clothing_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outfit plans (weekly planner)
CREATE TABLE public.outfit_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  week_start DATE NOT NULL,
  item_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week, week_start)
);
ALTER TABLE public.outfit_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plans" ON public.outfit_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON public.outfit_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.outfit_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.outfit_plans FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_outfit_plans_updated_at BEFORE UPDATE ON public.outfit_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outfit history
CREATE TABLE public.outfit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_ids UUID[] NOT NULL,
  worn_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT DEFAULT '',
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.outfit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own history" ON public.outfit_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.outfit_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own history" ON public.outfit_history FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for clothing images
INSERT INTO storage.buckets (id, name, public) VALUES ('clothing-images', 'clothing-images', true);
CREATE POLICY "Anyone can view clothing images" ON storage.objects FOR SELECT USING (bucket_id = 'clothing-images');
CREATE POLICY "Users can upload own clothing images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clothing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own clothing images" ON storage.objects FOR UPDATE USING (bucket_id = 'clothing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own clothing images" ON storage.objects FOR DELETE USING (bucket_id = 'clothing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
