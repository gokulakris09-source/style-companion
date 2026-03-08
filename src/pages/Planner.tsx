import { useState } from "react";
import { useClothingItems, useOutfitPlans, useUpsertOutfitPlan, useAddOutfitHistory, ClothingItemRow } from "@/hooks/useWardrobe";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { DAYS } from "@/lib/types";
import ClothingCard from "@/components/ClothingCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, X, Plus, CalendarCheck, Loader2, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { startOfWeek, format } from "date-fns";

function getWeekStart() {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

/** Determine current season from date */
function getCurrentSeason(): string {
  const month = new Date().getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

/**
 * Smart auto-fill algorithm for the entire week.
 * - Only uses clean items
 * - Prefers items matching current season (or "all")
 * - Sorts by least-used first to promote wardrobe rotation
 * - No item is repeated across the week
 */
function generateWeekPlan(items: ClothingItemRow[]): Record<string, string[]> {
  const season = getCurrentSeason();
  const clean = items.filter((i) => i.cleanliness !== "dirty");

  // Partition by category, prefer seasonal match, sort by usage_count asc
  const byCat = (cat: string) =>
    clean
      .filter((i) => i.category === cat)
      .sort((a, b) => {
        const aSeason = a.season === season || a.season === "all" ? 0 : 1;
        const bSeason = b.season === season || b.season === "all" ? 0 : 1;
        if (aSeason !== bSeason) return aSeason - bSeason;
        return a.usage_count - b.usage_count;
      });

  const pools: Record<string, ClothingItemRow[]> = {
    top: byCat("top"),
    bottom: byCat("bottom"),
    footwear: byCat("footwear"),
    outerwear: byCat("outerwear"),
    accessory: byCat("accessory"),
    dress: byCat("dress"),
  };

  const usedIds = new Set<string>();
  const weekPlan: Record<string, string[]> = {};

  for (const day of DAYS) {
    const dayItems: string[] = [];

    const pickFrom = (cat: string): ClothingItemRow | null => {
      const pool = pools[cat];
      if (!pool) return null;
      const available = pool.filter((i) => !usedIds.has(i.id));
      return available.length > 0 ? available[0] : null;
    };

    // Try dress first; if none, pick top + bottom
    const dress = pickFrom("dress");
    if (dress) {
      dayItems.push(dress.id);
      usedIds.add(dress.id);
    } else {
      const top = pickFrom("top");
      if (top) { dayItems.push(top.id); usedIds.add(top.id); }
      const bottom = pickFrom("bottom");
      if (bottom) { dayItems.push(bottom.id); usedIds.add(bottom.id); }
    }

    // Always try footwear
    const shoes = pickFrom("footwear");
    if (shoes) { dayItems.push(shoes.id); usedIds.add(shoes.id); }

    // Add outerwear in cold seasons
    if (season === "winter" || season === "fall") {
      const outer = pickFrom("outerwear");
      if (outer) { dayItems.push(outer.id); usedIds.add(outer.id); }
    }

    // Optionally add an accessory
    const acc = pickFrom("accessory");
    if (acc) { dayItems.push(acc.id); usedIds.add(acc.id); }

    weekPlan[day] = dayItems;
  }

  return weekPlan;
}

export default function Planner() {
  const weekStart = getWeekStart();
  const { data: items = [] } = useClothingItems();
  const { data: plans = [] } = useOutfitPlans(weekStart);
  const upsertPlan = useUpsertOutfitPlan();
  const addHistory = useAddOutfitHistory();
  const { user } = useAuth();
  const [pickingDay, setPickingDay] = useState<string | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [confirmedDays, setConfirmedDays] = useState<Set<string>>(new Set());

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

  const autoFillWeek = async () => {
    if (items.length === 0) { toast.error("Add items to your wardrobe first"); return; }
    setAutoFilling(true);
    try {
      const weekPlan = generateWeekPlan(items);
      let filledDays = 0;
      for (const day of DAYS) {
        const dayItems = weekPlan[day];
        if (dayItems.length > 0) {
          await new Promise<void>((resolve, reject) => {
            upsertPlan.mutate(
              { day_of_week: day, week_start: weekStart, item_ids: dayItems },
              { onSuccess: () => resolve(), onError: (err) => reject(err) }
            );
          });
          filledDays++;
        }
      }
      if (filledDays === 0) {
        toast.error("Not enough clean items to fill the week");
      } else {
        toast.success(`Auto-filled ${filledDays} days with unique outfits!`);
      }
    } catch {
      toast.error("Failed to auto-fill week");
    } finally {
      setAutoFilling(false);
    }
  };

  const clearWeek = () => {
    DAYS.forEach((day) => {
      upsertPlan.mutate({ day_of_week: day, week_start: weekStart, item_ids: [] });
    });
    toast.success("Week cleared");
  };

  const confirmWorn = (day: string) => {
    const plan = plans.find((p) => p.day_of_week === day);
    if (!plan || plan.item_ids.length === 0) { toast.error("No outfit to confirm"); return; }
    // Calculate the actual date for this day of the week
    const weekStartDate = new Date(weekStart + "T00:00:00");
    const dayIndex = DAYS.indexOf(day);
    const wornDate = new Date(weekStartDate);
    wornDate.setDate(wornDate.getDate() + dayIndex);

    addHistory.mutate({
      item_ids: plan.item_ids,
      image_url: plan.preview_image_url || undefined,
      day_of_week: day,
      worn_at: wornDate.toISOString(),
    }, {
      onSuccess: () => {
        setConfirmedDays((prev) => new Set([...prev, day]));
        toast.success(`${day}'s outfit saved to history!`);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const availableItems = items.filter((i) => i.cleanliness !== "dirty");
  const hasAnyPlans = plans.some((p) => p.item_ids.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Weekly Planner</h1>
          <p className="text-muted-foreground mt-1">Week of {weekStart}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={autoFillWeek} disabled={autoFilling} className="gap-2">
            {autoFilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
            {autoFilling ? "Planning..." : "Auto-Fill Week"}
          </Button>
          {hasAnyPlans && (
            <Button variant="outline" onClick={clearWeek} className="text-sm">Clear Week</Button>
          )}
        </div>
      </div>

      <div className="bg-muted/50 border rounded-lg p-3 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 inline mr-1.5 text-accent" />
        Auto-fill considers season ({getCurrentSeason()}), cleanliness, and usage history — no item repeats within the week.
      </div>

      <div className="space-y-4">
        {DAYS.map((day, i) => {
          const dayItems = getDayItems(day);
          const plan = plans.find((p) => p.day_of_week === day);
          const previewImage = plan?.preview_image_url;
          return (
            <motion.div key={day} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">{day}</h3>
                <div className="flex gap-2">
                  <Link to="/try-on">
                    <Button variant="outline" size="sm" className="gap-1 text-xs"><ImageIcon className="h-3 w-3" /> Try-On</Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => autoFillDay(day)} className="gap-1 text-xs"><Sparkles className="h-3 w-3" /> Suggest</Button>
                  <Button variant="outline" size="sm" onClick={() => setPickingDay(day)} className="gap-1 text-xs"><Plus className="h-3 w-3" /> Add</Button>
                  {dayItems.length > 0 && <Button variant="ghost" size="sm" onClick={() => clearDay(day)} className="text-xs text-muted-foreground">Clear</Button>}
                  {dayItems.length > 0 && !confirmedDays.has(day) && (
                    <Button size="sm" onClick={() => confirmWorn(day)} className="gap-1 text-xs"><CheckCircle2 className="h-3 w-3" /> Worn</Button>
                  )}
                  {confirmedDays.has(day) && (
                    <span className="text-xs text-accent flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Saved</span>
                  )}
              {dayItems.length === 0 && !previewImage ? (
                <p className="text-sm text-muted-foreground italic">No outfit planned</p>
              ) : (
                <div className="flex gap-3 items-start">
                  {/* Preview image from try-on */}
                  {previewImage && (
                    <div className="w-24 h-32 rounded-lg overflow-hidden bg-secondary shrink-0 shadow-md">
                      <img src={previewImage} alt={`${day} outfit preview`} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex gap-3 flex-wrap flex-1">
                    {dayItems.map((item) => (
                      <div key={item.id} className="relative group w-16">
                        <div className="w-16 h-20 rounded-lg overflow-hidden bg-secondary shadow-sm">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {item.category === "top" ? "👔" : item.category === "bottom" ? "👖" : item.category === "dress" ? "👗" : item.category === "footwear" ? "👟" : item.category === "outerwear" ? "🧥" : "💍"}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center mt-1 truncate">{item.name}</p>
                        <button onClick={() => removeItem(day, item.id)} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"><X className="h-2.5 w-2.5" /></button>
                      </div>
                    ))}
                  </div>
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