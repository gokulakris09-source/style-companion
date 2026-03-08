import { useState } from "react";
import { useClothingItems, useUpdateClothingItem, useAddOutfitHistory, ClothingItemRow } from "@/hooks/useWardrobe";
import ClothingCard from "@/components/ClothingCard";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Suggestions() {
  const { data: items = [] } = useClothingItems();
  const updateItem = useUpdateClothingItem();
  const addHistory = useAddOutfitHistory();
  const [suggestion, setSuggestion] = useState<ClothingItemRow[]>([]);

  const generate = () => {
    const available = items.filter((i) => i.cleanliness !== "dirty");
    const pick = (cat: string) => {
      const pool = available.filter((i) => i.category === cat);
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    };
    const result = [pick("top"), pick("bottom"), pick("footwear"), pick("outerwear")].filter(Boolean) as ClothingItemRow[];
    if (result.length === 0) { toast.error("No clean items available!"); return; }
    setSuggestion(result);
  };

  const accept = () => {
    suggestion.forEach((s) => {
      updateItem.mutate({ id: s.id, usage_count: s.usage_count + 1, cleanliness: "worn", last_worn_at: new Date().toISOString() });
    });
    addHistory.mutate({ item_ids: suggestion.map((s) => s.id), notes: "AI suggestion" });
    toast.success("Outfit logged!");
    setSuggestion([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Outfit Suggestions</h1>
        <p className="text-muted-foreground mt-1">Get smart outfit combinations from your wardrobe.</p>
      </div>

      <div className="flex gap-3">
        <Button onClick={generate} className="gap-2">
          {suggestion.length ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {suggestion.length ? "Regenerate" : "Generate Outfit"}
        </Button>
        {suggestion.length > 0 && (
          <Button onClick={accept} variant="outline" className="gap-2"><Check className="h-4 w-4" /> Wear This</Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {suggestion.length > 0 && (
          <motion.div key="suggestion" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card border rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Today's Pick</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {suggestion.map((item) => <ClothingCard key={item.id} item={item} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {suggestion.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="h-12 w-12 text-accent mx-auto mb-4" />
          <p className="font-display text-lg text-muted-foreground">Click generate to get outfit ideas</p>
          <p className="text-sm text-muted-foreground mt-1">Based on your clean, available items</p>
        </div>
      )}
    </div>
  );
}
