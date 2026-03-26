
-- Disable RLS on all tables
ALTER TABLE public.clothing_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryon_gallery DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Users can delete own items" ON public.clothing_items;
DROP POLICY IF EXISTS "Users can insert own items" ON public.clothing_items;
DROP POLICY IF EXISTS "Users can update own items" ON public.clothing_items;
DROP POLICY IF EXISTS "Users can view own items" ON public.clothing_items;

DROP POLICY IF EXISTS "Users can delete own history" ON public.outfit_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.outfit_history;
DROP POLICY IF EXISTS "Users can update own history" ON public.outfit_history;
DROP POLICY IF EXISTS "Users can view own history" ON public.outfit_history;

DROP POLICY IF EXISTS "Users can delete own plans" ON public.outfit_plans;
DROP POLICY IF EXISTS "Users can insert own plans" ON public.outfit_plans;
DROP POLICY IF EXISTS "Users can update own plans" ON public.outfit_plans;
DROP POLICY IF EXISTS "Users can view own plans" ON public.outfit_plans;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view public gallery items" ON public.tryon_gallery;
DROP POLICY IF EXISTS "Users can delete own gallery" ON public.tryon_gallery;
DROP POLICY IF EXISTS "Users can insert own gallery" ON public.tryon_gallery;
DROP POLICY IF EXISTS "Users can update own gallery" ON public.tryon_gallery;
DROP POLICY IF EXISTS "Users can view own gallery" ON public.tryon_gallery;
