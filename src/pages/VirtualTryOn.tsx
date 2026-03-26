import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClothingItems, useUpsertOutfitPlan, ClothingItemRow } from "@/hooks/useWardrobe";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Image as ImageIcon, Loader2, X, Shirt, RotateCcw,
  Heart, Share2, Trash2, Globe, Lock, Copy, Check,
  Camera, UserCircle, CalendarPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CATEGORIES, DAYS } from "@/lib/types";
import { startOfWeek, format } from "date-fns";
import { cn } from "@/lib/utils";

const STYLE_OPTIONS = [
  { value: "modern editorial", label: "Editorial" },
  { value: "street style urban", label: "Street Style" },
  { value: "classic elegant", label: "Classic" },
  { value: "relaxed casual", label: "Casual" },
  { value: "bold avant-garde fashion", label: "Avant-Garde" },
];

const BG_OPTIONS = [
  { value: "clean studio with soft lighting", label: "Studio" },
  { value: "urban city street with natural light", label: "City Street" },
  { value: "minimalist white background", label: "Minimal White" },
  { value: "warm sunset outdoor setting", label: "Sunset" },
  { value: "modern loft interior", label: "Loft Interior" },
];

type GalleryItem = {
  id: string;
  user_id: string;
  image_url: string;
  item_names: string[];
  style: string | null;
  background: string | null;
  description: string | null;
  is_public: boolean;
  created_at: string;
};

const ANON_USER_ID = "00000000-0000-0000-0000-000000000000";

function useGallery() {
  return useQuery({
    queryKey: ["tryon_gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tryon_gallery")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GalleryItem[];
    },
  });
}

function useSaveToGallery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ base64Image, itemNames, style, background, description }: {
      base64Image: string; itemNames: string[]; style: string; background: string; description: string;
    }) => {
      const base64Data = base64Image.split(",")[1];
      const byteString = atob(base64Data);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
      const path = `${ANON_USER_ID}/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage.from("tryon-images").upload(path, blob);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("tryon-images").getPublicUrl(path);
      const { data, error } = await supabase
        .from("tryon_gallery")
        .insert({ user_id: ANON_USER_ID, image_url: urlData.publicUrl, item_names: itemNames, style, background, description })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tryon_gallery"] }),
  });
}

function useTogglePublic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await supabase.from("tryon_gallery").update({ is_public }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tryon_gallery"] }),
  });
}

function useDeleteGalleryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tryon_gallery").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tryon_gallery"] }),
  });
}

function useUploadUserPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${ANON_USER_ID}/user-photo-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("tryon-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("tryon-images").getPublicUrl(path);
      return data.publicUrl;
    },
  });
}

/** Small clothing thumbnail for selected items */
function ClothingThumb({ item, onRemove }: { item: ClothingItemRow; onRemove: () => void }) {
  return (
    <div className="relative group w-20 shrink-0">
      <div className="aspect-square rounded-lg overflow-hidden bg-secondary border-2 border-primary/20">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
            {item.category === "top" ? "👔" : item.category === "bottom" ? "👖" : item.category === "dress" ? "👗" : item.category === "footwear" ? "👟" : item.category === "outerwear" ? "🧥" : "💍"}
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
      <p className="text-[10px] text-center mt-1 truncate">{item.name}</p>
    </div>
  );
}

export default function VirtualTryOn() {
  
  const { data: items = [] } = useClothingItems();
  const { data: gallery = [] } = useGallery();
  const saveToGallery = useSaveToGallery();
  const togglePublic = useTogglePublic();
  const deleteGalleryItem = useDeleteGalleryItem();
  const uploadPhoto = useUploadUserPhoto();
  const upsertPlan = useUpsertOutfitPlan();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [style, setStyle] = useState("modern editorial");
  const [background, setBackground] = useState("clean studio with soft lighting");
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [shareDialogItem, setShareDialogItem] = useState<GalleryItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPlannerPicker, setShowPlannerPicker] = useState(false);
  const [addingToPlanner, setAddingToPlanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setTryOnImage(null);
    setDescription("");
  };

  const filteredItems = filterCategory === "all" ? items : items.filter((i) => i.category === filterCategory);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setUserPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploadingPhoto(true);
    try {
      const url = await uploadPhoto.mutateAsync(file);
      setUserPhotoUrl(url);
      toast.success("Photo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
      setUserPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    setUserPhotoUrl(null);
    setUserPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generateTryOn = async () => {
    if (selectedItems.length === 0) { toast.error("Select at least one item to try on"); return; }
    setLoading(true);
    setTryOnImage(null);
    setDescription("");
    try {
      const { data, error } = await supabase.functions.invoke("virtual-tryon", {
        body: {
          items: selectedItems.map((i) => ({ name: i.name, category: i.category, color: i.color, fabric: i.fabric, image_url: i.image_url || undefined })),
          style, background, userPhotoUrl: userPhotoUrl || undefined,
        },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }
      setTryOnImage(data.imageUrl);
      setDescription(data.description || "");
      toast.success(userPhotoUrl ? "Try-on with your photo generated!" : "Try-on visualization generated!");
    } catch (err: any) {
      toast.error(err.message || "Virtual try-on failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!tryOnImage) return;
    setSaving(true);
    try {
      await saveToGallery.mutateAsync({ base64Image: tryOnImage, itemNames: selectedItems.map((i) => i.name), style, background, description });
      toast.success("Saved to gallery!");
    } catch (err: any) { toast.error(err.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleAddToPlanner = async (day: string) => {
    if (!tryOnImage || selectedItems.length === 0 || !user) return;
    setAddingToPlanner(true);
    try {
      // Upload try-on image for planner preview
      const base64Data = tryOnImage.split(",")[1];
      const byteString = atob(base64Data);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });
      const path = `${user.id}/${crypto.randomUUID()}-planner.png`;
      const { error: uploadError } = await supabase.storage.from("tryon-images").upload(path, blob);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("tryon-images").getPublicUrl(path);

      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      await new Promise<void>((resolve, reject) => {
        upsertPlan.mutate(
          { day_of_week: day, week_start: weekStart, item_ids: selectedItems.map((i) => i.id), preview_image_url: urlData.publicUrl },
          { onSuccess: () => resolve(), onError: (err) => reject(err) },
        );
      });
      toast.success(`Outfit added to ${day}'s plan!`);
      setShowPlannerPicker(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add to planner");
    } finally {
      setAddingToPlanner(false);
    }
  };

  const handleShare = (item: GalleryItem) => {
    if (!item.is_public) {
      togglePublic.mutate({ id: item.id, is_public: true }, { onSuccess: () => setShareDialogItem({ ...item, is_public: true }) });
    } else {
      setShareDialogItem(item);
    }
  };

  const copyShareLink = () => {
    if (!shareDialogItem) return;
    navigator.clipboard.writeText(shareDialogItem.image_url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePublic = (item: GalleryItem) => {
    togglePublic.mutate({ id: item.id, is_public: !item.is_public }, { onSuccess: () => toast.success(item.is_public ? "Made private" : "Made public") });
  };

  const handleDelete = (id: string) => {
    deleteGalleryItem.mutate(id, { onSuccess: () => toast.success("Removed from gallery") });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Virtual Try-On</h1>
        <p className="text-muted-foreground mt-1">Upload your photo, select clothing, and see how the outfit looks on you.</p>
      </div>

      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="gallery">Gallery ({gallery.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6 mt-4">
          {/* Photo + Selected Items */}
          <div className="grid md:grid-cols-[220px_1fr] gap-4">
            {/* User photo */}
            <div className="bg-card border rounded-xl p-4 flex flex-col items-center">
              <h2 className="font-display font-semibold text-sm mb-3 self-start">Your Photo</h2>
              {userPhotoPreview ? (
                <div className="relative w-full">
                  <img src={userPhotoPreview} alt="Your photo" className="w-full aspect-[3/4] object-cover rounded-lg" />
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-background/60 rounded-lg flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <Button variant="secondary" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={removePhoto}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-[3/4] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors cursor-pointer">
                  <UserCircle className="h-10 w-10" />
                  <span className="text-xs font-medium">Upload your photo</span>
                  <span className="text-[10px]">for personalized try-on</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              {!userPhotoPreview && <p className="text-[10px] text-muted-foreground mt-2 text-center">Optional — without a photo, we'll use a fashion model</p>}
              {userPhotoPreview && !uploadingPhoto && (
                <Button variant="ghost" size="sm" className="mt-2 text-xs gap-1" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-3 w-3" /> Change photo
                </Button>
              )}
            </div>

            {/* Selected items with images */}
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-sm">Selected Items ({selectedItems.length})</h2>
                {selectedItems.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs text-muted-foreground gap-1">
                    <RotateCcw className="h-3 w-3" /> Clear
                  </Button>
                )}
              </div>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Click clothing items below to build your outfit</p>
              ) : (
                <div className="flex gap-3 flex-wrap">
                  {selectedItems.map((item) => (
                    <ClothingThumb key={item.id} item={item} onRemove={() => toggleItem(item.id)} />
                  ))}
                </div>
              )}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {userPhotoUrl
                    ? "✨ Your photo will be used — the AI will dress you in the selected clothes."
                    : "💡 Upload your photo to see clothes on yourself, or generate with a fashion model."}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-3">
            <div className="w-44">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Style</label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STYLE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Background</label>
              <Select value={background} onValueChange={setBackground}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BG_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={generateTryOn} disabled={loading || selectedItems.length === 0} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                {loading ? "Generating..." : userPhotoUrl ? "Try On Me" : "Generate Try-On"}
              </Button>
            </div>
          </div>

          {/* Try-On Result */}
          <AnimatePresence mode="wait">
            {tryOnImage && (
              <motion.div key="tryon-result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="bg-card border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="font-display text-lg font-semibold">
                    {userPhotoUrl ? "You in This Outfit" : "Your Virtual Outfit"}
                  </h2>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowPlannerPicker(true)} variant="outline" size="sm" className="gap-2">
                      <CalendarPlus className="h-4 w-4" /> Add to Planner
                    </Button>
                    <Button onClick={handleSaveToGallery} disabled={saving} variant="outline" size="sm" className="gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                      {saving ? "Saving..." : "Save to Gallery"}
                    </Button>
                  </div>
                </div>
                <div className="max-w-lg mx-auto">
                  <img src={tryOnImage} alt="Virtual try-on visualization" className="w-full rounded-lg shadow-lg" />
                </div>
                {description && <p className="mt-4 text-sm text-muted-foreground text-center max-w-lg mx-auto">{description}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wardrobe grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold">Your Wardrobe</h2>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Shirt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No items found. Add clothing to your wardrobe first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 transition-all overflow-hidden bg-card",
                      selectedIds.has(item.id)
                        ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                        : "border-transparent hover:border-muted-foreground/20"
                    )}
                  >
                    <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">
                          {item.category === "top" ? "👔" : item.category === "bottom" ? "👖" : item.category === "dress" ? "👗" : item.category === "footwear" ? "👟" : item.category === "outerwear" ? "🧥" : "💍"}
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.color} · {item.fabric}</p>
                    </div>
                    {selectedIds.has(item.id) && (
                      <div className="bg-primary text-primary-foreground text-[10px] text-center py-0.5 font-medium">Selected</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="mt-4">
          {gallery.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-display text-lg text-muted-foreground">No saved try-ons yet</p>
              <p className="text-sm text-muted-foreground mt-1">Generate a try-on and save it to start your gallery</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border rounded-xl overflow-hidden group">
                  <div className="relative">
                    <img src={item.image_url} alt="Saved try-on" className="w-full aspect-[3/4] object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleTogglePublic(item)}>
                        {item.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleShare(item)}>
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8 hover:bg-destructive/20" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {item.is_public && <Badge className="absolute top-2 left-2 gap-1 text-[10px]" variant="secondary"><Globe className="h-3 w-3" /> Public</Badge>}
                  </div>
                  <div className="p-3">
                    <div className="flex gap-1 flex-wrap mb-1">
                      {item.item_names.map((name, idx) => <Badge key={idx} variant="outline" className="text-[10px] py-0">{name}</Badge>)}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}{item.style && ` · ${item.style}`}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Planner Day Picker Dialog */}
      <Dialog open={showPlannerPicker} onOpenChange={setShowPlannerPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Add to Weekly Planner</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Choose a day to add this outfit:</p>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {DAYS.map((day) => (
              <Button
                key={day}
                variant="outline"
                className="justify-start gap-2"
                disabled={addingToPlanner}
                onClick={() => handleAddToPlanner(day)}
              >
                <CalendarPlus className="h-4 w-4" />
                {day}
                {addingToPlanner && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={!!shareDialogItem} onOpenChange={() => setShareDialogItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Share Try-On</DialogTitle></DialogHeader>
          {shareDialogItem && (
            <div className="space-y-4">
              <img src={shareDialogItem.image_url} alt="Shared try-on" className="w-full rounded-lg" />
              <div className="flex gap-2">
                <input readOnly value={shareDialogItem.image_url} className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs truncate" />
                <Button size="sm" onClick={copyShareLink} className="gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {shareDialogItem.is_public ? "This image is public and can be viewed by anyone with the link." : "Make this image public first to share it."}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
