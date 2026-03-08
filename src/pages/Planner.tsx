import { useState } from "react";
import { useClothingItems, useOutfitPlans, useUpsertOutfitPlan, ClothingItemRow } from "@/hooks/useWardrobe";
import { DAYS } from "@/lib/types";
import ClothingCard from "@/components/ClothingCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, X, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { startOfWeek, format } from "date-fns";

function getWeekStart() {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export default function Planner() {
  const weekStart = getWeekStart();
  const { data: items = [] } = useClothingItems();
  const { data: plans = [] } = useOutfitPlans(weekStart);
  const upsertPlan = useUpsertOutfitPlan();
  const [pickingDay, setPickingDay] = useState<string | null>(null);

  const getDayItemIds = (day: string): string[] => {
    const plan = plans.find((p) => p.day_of_week === day);
    return plan?.item_ids || [];
  };

  const getDayItems = (day: string): ClothingItemRow[] => {
    const ids = getDayItemIds(day);
    return items.filter((i) => ids.includes(i.id));
  };

  const assignItem = (day: string, itemId: string) => {
    const currentIds = getDayItemIds(day);
    if (!currentIds.includes(itemId)) {
      upsertPlan.mutate({ day_of_week: day, week_start: weekStart, item_ids: [...currentIds, itemId] });
    }
    setPickingDay(null);
  };

  const removeItem = (day: string, itemId: string) => {
    const currentIds = getDayItemIds(day).filter((id) => id !== itemId);
    upsertPlan.mutate({ day_of_week: day, week_start: weekStart, item_ids: currentIds });
  };

  const clearDay = (day: string) => {
    upsertPlan.mutate({ day_of_week: day, week_start: weekStart, item_ids: [] });
  };

  const autoFillDay = (day: string) => {
    const usedIds = plans.flatMap((p) => p.item_ids);
    const available = items.filter((i) => i.cleanliness !== "dirty" && !usedIds.includes(i.id));
    const pick = (cat: string) => {
      const pool = available.filter((i) => i.category === cat);
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    };
    const suggestion = [pick("top"), pick("bottom"), pick("footwear")].filter(Boolean) as ClothingItemRow[];
    if (suggestion.length === 0) { toast.error("No clean items available"); return; }
    const currentIds = getDayItemIds(day);
    const newIds = [...currentIds, ...suggestion.map((s) => s.id)];
    upsertPlan.mutate({ day_of_week: day, week_start: weekStart, item_ids: newIds });
    toast.success(`Added ${suggestion.length} items to ${day}`);
  };

  const availableItems = items.filter((i) => i.cleanliness !== "dirty");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Weekly Planner</h1>
        <p className="text-muted-foreground mt-1">Week of {weekStart}</p>
      </div>

      <div className="space-y-4">
        {DAYS.map((day, i) => {
          const dayItems = getDayItems(day);
          return (
            <motion.div key={day} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">{day}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => autoFillDay(day)} className="gap-1 text-xs"><Sparkles className="h-3 w-3" /> Suggest</Button>
                  <Button variant="outline" size="sm" onClick={() => setPickingDay(day)} className="gap-1 text-xs"><Plus className="h-3 w-3" /> Add</Button>
                  {dayItems.length > 0 && <Button variant="ghost" size="sm" onClick={() => clearDay(day)} className="text-xs text-muted-foreground">Clear</Button>}
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
                        <button onClick={() => removeItem(day, item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <Dialog open={!!pickingDay} onOpenChange={() => setPickingDay(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Add to {pickingDay}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {availableItems.map((item) => (
              <div key={item.id} onClick={() => assignItem(pickingDay!, item.id)}>
                <ClothingCard item={item} compact />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
