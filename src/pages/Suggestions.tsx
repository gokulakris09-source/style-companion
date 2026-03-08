import { useState } from "react";
import { getItems, getOutfitSuggestion, incrementUsage } from "@/lib/wardrobe-store";
import { ClothingItem } from "@/lib/types";
import ClothingCard from "@/components/ClothingCard";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function Suggestions() {
  const [items] = useState(getItems);
  const [suggestion, setSuggestion] = useState<ClothingItem[]>([]);
  const [history, setHistory] = useState<ClothingItem[][]>([]);

  const generate = () => {
    const result = getOutfitSuggestion(items);
    if (result.length === 0) {
      toast.error("No clean items available. Check your laundry!");
      return;
    }
    setSuggestion(result);
  };

  const accept = () => {
    suggestion.forEach((s) => incrementUsage(s.id));
    setHistory((prev) => [suggestion, ...prev]);
    setSuggestion([]);
    toast.success("Outfit logged! Usage counts updated.");
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
          <Button onClick={accept} variant="outline" className="gap-2">
            <Check className="h-4 w-4" /> Wear This
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {suggestion.length > 0 && (
          <motion.div
            key="suggestion"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border rounded-xl p-6"
          >
            <h2 className="font-display text-lg font-semibold mb-4">Today's Pick</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {suggestion.map((item) => (
                <ClothingCard key={item.id} item={item} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {history.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Previous Suggestions</h2>
          <div className="space-y-4">
            {history.map((outfit, i) => (
              <div key={i} className="bg-secondary/50 rounded-lg p-4">
                <div className="flex gap-3 flex-wrap">
                  {outfit.map((item) => (
                    <div key={item.id} className="bg-card rounded-lg px-3 py-2 text-sm border">
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestion.length === 0 && history.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="h-12 w-12 text-accent mx-auto mb-4" />
          <p className="font-display text-lg text-muted-foreground">Click generate to get outfit ideas</p>
          <p className="text-sm text-muted-foreground mt-1">Based on your clean, available items</p>
        </div>
      )}
    </div>
  );
}
