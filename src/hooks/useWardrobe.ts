import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ClothingItemRow = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  color: string;
  fabric: string;
  season: string;
  occasion: string;
  usage_count: number;
  care_instructions: string | null;
  cleanliness: string;
  image_url: string | null;
  last_worn_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useClothingItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clothing_items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clothing_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClothingItemRow[];
    },
    enabled: !!user,
  });
}

export function useAddClothingItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: Omit<ClothingItemRow, "id" | "user_id" | "created_at" | "updated_at" | "usage_count" | "last_worn_at">) => {
      const { data, error } = await supabase
        .from("clothing_items")
        .insert({ ...item, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clothing_items"] }),
  });
}

export function useUpdateClothingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ClothingItemRow>) => {
      const { data, error } = await supabase
        .from("clothing_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clothing_items"] }),
  });
}

export function useDeleteClothingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clothing_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clothing_items"] }),
  });
}

// Outfit plans
export type OutfitPlanRow = {
  id: string;
  user_id: string;
  day_of_week: string;
  week_start: string;
  item_ids: string[];
  preview_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export function useOutfitPlans(weekStart: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["outfit_plans", user?.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfit_plans")
        .select("*")
        .eq("week_start", weekStart);
      if (error) throw error;
      return data as OutfitPlanRow[];
    },
    enabled: !!user,
  });
}

export function useUpsertOutfitPlan() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      day_of_week,
      week_start,
      item_ids,
      preview_image_url,
    }: {
      day_of_week: string;
      week_start: string;
      item_ids: string[];
      preview_image_url?: string | null;
    }) => {
      const payload: any = { user_id: user!.id, day_of_week, week_start, item_ids };
      if (preview_image_url !== undefined) payload.preview_image_url = preview_image_url;
      const { data, error } = await supabase
        .from("outfit_plans")
        .upsert(payload, { onConflict: "user_id,day_of_week,week_start" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outfit_plans"] }),
  });
}
// Outfit history
export type OutfitHistoryRow = {
  id: string;
  user_id: string;
  item_ids: string[];
  worn_at: string;
  notes: string | null;
  ai_generated: boolean | null;
  rating: number | null;
  occasion: string | null;
  image_url: string | null;
  day_of_week: string | null;
  created_at: string;
};

export function useOutfitHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["outfit_history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfit_history")
        .select("*")
        .order("worn_at", { ascending: false });
      if (error) throw error;
      return data as OutfitHistoryRow[];
    },
    enabled: !!user,
  });
}

export function useAddOutfitHistory() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: { item_ids: string[]; notes?: string; ai_generated?: boolean; occasion?: string }) => {
      const { data, error } = await supabase
        .from("outfit_history")
        .insert({ ...entry, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outfit_history"] }),
  });
}

export function useUpdateOutfitHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; rating?: number; notes?: string; occasion?: string }) => {
      const { error } = await supabase
        .from("outfit_history")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outfit_history"] }),
  });
}
// Image upload
export function useUploadClothingImage() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("clothing-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("clothing-images").getPublicUrl(path);
      return data.publicUrl;
    },
  });
}
