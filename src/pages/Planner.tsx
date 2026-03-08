import { useState } from "react";
import { getItems, getWeeklyPlan, saveWeeklyPlan, getOutfitSuggestion } from "@/lib/wardrobe-store";
import { DAYS, OutfitPlan, ClothingItem } from "@/lib/types";
import ClothingCard from "@/components/ClothingCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, X, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Planner() {
  const [items] = useState(getItems);
  const [plan, setPlan] = useState<OutfitPlan[]>(getWeeklyPlan);
  const [pickingDay, setPickingDay] = useState<string | null>(null);

  const getDayPlan = (day: string) => plan.find((p) => p.day === day);
  const getDayItems = (day: string) => {
    const p = getDayPlan(day);
    return p ? items.filter((i) => p.itemIds.includes(i.id)) : [];
  };

  const assignItem = (day: string, itemId: string) => {
    const newPlan = [...plan];
    const existing = newPlan.find((p) => p.day === day);
    if (existing) {
      if (!existing.itemIds.includes(itemId)) existing.itemIds.push(itemId);
    } else {
      newPlan.push({ day, itemIds: [itemId] });
    }
    setPlan(newPlan);
    saveWeeklyPlan(newPlan);
  };

  const removeItem = (day: string, itemId: string) => {
    const newPlan = plan.map((p) =>
      p.day === day ? { ...p, itemIds: p.itemIds.filter((id) => id !== itemId) } : p
    );
    setPlan(newPlan);
    saveWeeklyPlan(newPlan);
  };

  const autoFillDay = (day: string) => {
    const usedIds = plan.flatMap((p) => p.itemIds);
    const suggestion = getOutfitSuggestion(items, usedIds);
    if (suggestion.length === 0) {
      toast.error("No clean items available for suggestion");
      return;
    }
    suggestion.forEach((s) => assignItem(day, s.id));
    toast.success(`Added ${suggestion.length} items to ${day}`);
  };

  const clearDay = (day: string) => {
    const newPlan = plan.filter((p) => p.day !== day);
    setPlan(newPlan);
    saveWeeklyPlan(newPlan);
  };

  const availableItems = items.filter((i) => i.cleanliness !== "dirty");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Weekly Planner</h1>
        <p className="text-muted-foreground mt-1">Plan your outfits for the week ahead.</p>
      </div>

      <div className="space-y-4">
        {DAYS.map((day, i) => {
          const dayItems = getDayItems(day);
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">{day}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => autoFillDay(day)} className="gap-1 text-xs">
                    <Sparkles className="h-3 w-3" /> Suggest
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPickingDay(day)} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                  {dayItems.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => clearDay(day)} className="text-xs text-muted-foreground">Clear</Button>
                  )}
                </div>
              </div>
              {dayItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No outfit planned</p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {dayItems.map((item) => (
                    <div key={item.id} className="relative group">
                      <div className="bg-secondary rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                        <span>{item.name}</span>
                        <button onClick={() => removeItem(day, item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Item picker */}
      <Dialog open={!!pickingDay} onOpenChange={() => setPickingDay(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Add to {pickingDay}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {availableItems.map((item) => (
              <div key={item.id} onClick={() => { assignItem(pickingDay!, item.id); setPickingDay(null); }}>
                <ClothingCard item={item} compact />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
