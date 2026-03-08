import { useState } from "react";
import { useClothingItems, useUpdateClothingItem, useAddOutfitHistory, ClothingItemRow } from "@/hooks/useWardrobe";
import { supabase } from "@/integrations/supabase/client";
import ClothingCard from "@/components/ClothingCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, RefreshCw, Check, Image as ImageIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { OCCASIONS, SEASONS } from "@/lib/types";

export default function Suggestions() {
  const { data: items = [] } = useClothingItems();
  const updateItem = useUpdateClothingItem();
  const addHistory = useAddOutfitHistory();
  const [suggestion, setSuggestion] = useState<ClothingItemRow[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [styleTips, setStyleTips] = useState("");
  const [loading, setLoading] = useState(false);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [occasion, setOccasion] = useState<string>("");
  const [season, setSeason] = useState<string>("");

  const generateAI = async () => {
    if (items.length === 0) { toast.error("Add items to your wardrobe first"); return; }
    setLoading(true);
    setTryOnImage(null);
    setReasoning("");
    setStyleTips("");
    try {
      const { data, error } = await supabase.functions.invoke("outfit-recommend", {
        body: {
          items: items.map((i) => ({
            name: i.name, category: i.category, color: i.color, fabric: i.fabric,
            season: i.season, occasion: i.occasion, usage_count: i.usage_count, cleanliness: i.cleanliness,
          })),
          occasion: occasion || undefined,
          season: season || undefined,
        },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); setLoading(false); return; }

      const outfitNames: string[] = data.outfit || [];
      const matched = outfitNames.map((name: string) =>
        items.find((i) => i.name.toLowerCase() === name.toLowerCase())
      ).filter(Boolean) as ClothingItemRow[];

      if (matched.length === 0) {
        // Fallback: random
        const available = items.filter((i) => i.cleanliness !== "dirty");
        const pick = (cat: string) => { const p = available.filter((i) => i.category === cat); return p.length ? p[Math.floor(Math.random() * p.length)] : null; };
        const fallback = [pick("top"), pick("bottom"), pick("footwear")].filter(Boolean) as ClothingItemRow[];
        setSuggestion(fallback);
      } else {
        setSuggestion(matched);
      }
      setReasoning(data.reasoning || "");
      setStyleTips(data.style_tips || "");
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI suggestion");
      // Fallback to random
      const available = items.filter((i) => i.cleanliness !== "dirty");
      const pick = (cat: string) => { const p = available.filter((i) => i.category === cat); return p.length ? p[Math.floor(Math.random() * p.length)] : null; };
      setSuggestion([pick("top"), pick("bottom"), pick("footwear")].filter(Boolean) as ClothingItemRow[]);
    } finally {
      setLoading(false);
    }
  };

  const virtualTryOn = async () => {
    if (suggestion.length === 0) return;
    setTryOnLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("virtual-tryon", {
        body: {
          items: suggestion.map((i) => ({
            name: i.name, category: i.category, color: i.color, fabric: i.fabric,
          })),
        },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }
      setTryOnImage(data.imageUrl);
    } catch (err: any) {
      toast.error(err.message || "Virtual try-on failed");
    } finally {
      setTryOnLoading(false);
    }
  };

  const accept = () => {
    suggestion.forEach((s) => {
      updateItem.mutate({ id: s.id, usage_count: s.usage_count + 1, cleanliness: "worn", last_worn_at: new Date().toISOString() });
    });
    addHistory.mutate({ item_ids: suggestion.map((s) => s.id), notes: reasoning, ai_generated: true });
    toast.success("Outfit logged!");
    setSuggestion([]);
    setTryOnImage(null);
    setReasoning("");
    setStyleTips("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">AI Outfit Suggestions</h1>
        <p className="text-muted-foreground mt-1">Get personalized outfit recommendations powered by AI.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-40">
          <Select value={occasion} onValueChange={setOccasion}>
            <SelectTrigger><SelectValue placeholder="Any occasion" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any occasion</SelectItem>
              {OCCASIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger><SelectValue placeholder="Any season" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any season</SelectItem>
              {SEASONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={generateAI} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : suggestion.length ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Thinking..." : suggestion.length ? "Regenerate" : "Generate Outfit"}
        </Button>
        {suggestion.length > 0 && (
          <>
            <Button onClick={virtualTryOn} disabled={tryOnLoading} variant="outline" className="gap-2">
              {tryOnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {tryOnLoading ? "Generating..." : "Virtual Try-On"}
            </Button>
            <Button onClick={accept} variant="outline" className="gap-2"><Check className="h-4 w-4" /> Wear This</Button>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {suggestion.length > 0 && (
          <motion.div key="suggestion" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
            <div className="bg-card border rounded-xl p-6">
              <h2 className="font-display text-lg font-semibold mb-4">AI's Pick</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {suggestion.map((item) => <ClothingCard key={item.id} item={item} />)}
              </div>
              {reasoning && (
                <div className="mt-4 p-4 bg-secondary rounded-lg">
                  <p className="text-sm"><strong>Why this works:</strong> {reasoning}</p>
                  {styleTips && <p className="text-sm mt-2 text-muted-foreground"><strong>Style tip:</strong> {styleTips}</p>}
                </div>
              )}
            </div>

            {/* Virtual Try-On result */}
            {tryOnImage && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border rounded-xl p-6">
                <h2 className="font-display text-lg font-semibold mb-4">Virtual Try-On</h2>
                <div className="max-w-md mx-auto">
                  <img src={tryOnImage} alt="Virtual try-on" className="w-full rounded-lg shadow-lg" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {suggestion.length === 0 && !loading && (
        <div className="text-center py-16">
          <Sparkles className="h-12 w-12 text-accent mx-auto mb-4" />
          <p className="font-display text-lg text-muted-foreground">Click generate for AI-powered outfit ideas</p>
          <p className="text-sm text-muted-foreground mt-1">Our AI considers color coordination, fabric matching, and your usage patterns</p>
        </div>
      )}
    </div>
  );
}
