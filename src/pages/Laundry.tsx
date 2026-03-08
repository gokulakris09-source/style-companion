import { useMemo } from "react";
import { useClothingItems, useUpdateClothingItem, ClothingItemRow } from "@/hooks/useWardrobe";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Droplets, CheckCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";

const statusTabs = [
  { value: "all", label: "All", icon: null },
  { value: "clean", label: "Clean", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  { value: "worn", label: "Worn", icon: <Droplets className="h-3.5 w-3.5" /> },
  { value: "dirty", label: "Needs Wash", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
] as const;

export default function Laundry() {
  const { data: items = [], isLoading } = useClothingItems();
  const updateItem = useUpdateClothingItem();
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? items : items.filter((i) => i.cleanliness === filter);
  const dirtyCount = items.filter((i) => i.cleanliness === "dirty").length;
  const wornCount = items.filter((i) => i.cleanliness === "worn").length;

  const markAs = (id: string, status: string) => {
    updateItem.mutate({ id, cleanliness: status }, {
      onSuccess: () => toast.success(`Marked as ${status}`),
      onError: (e) => toast.error(e.message),
    });
  };

  const markAllClean = () => {
    items.filter((i) => i.cleanliness === "dirty").forEach((i) => {
      updateItem.mutate({ id: i.id, cleanliness: "clean" });
    });
    toast.success("All dirty items marked clean!");
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="animate-pulse font-display text-lg text-muted-foreground">Loading...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Laundry Tracker</h1>
          <p className="text-muted-foreground mt-1">{dirtyCount} items need washing · {wornCount} worn</p>
        </div>
        {dirtyCount > 0 && <Button onClick={markAllClean} variant="outline" className="gap-2"><CheckCircle className="h-4 w-4" /> Mark All Clean</Button>}
      </div>

      <div className="flex gap-2">
        {statusTabs.map((tab) => (
          <button key={tab.value} onClick={() => setFilter(tab.value)} className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors", filter === tab.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-card border rounded-lg overflow-hidden">
            <div className="aspect-[3/4] bg-secondary flex items-center justify-center text-muted-foreground relative overflow-hidden">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-3xl">
                  {item.category === "top" ? "👔" : item.category === "bottom" ? "👖" : item.category === "dress" ? "👗" : item.category === "footwear" ? "👟" : item.category === "outerwear" ? "🧥" : "💍"}
                </div>
              )}
              <div className={cn("absolute top-2 right-2 w-3 h-3 rounded-full ring-2 ring-card", item.cleanliness === "clean" ? "bg-clean" : item.cleanliness === "worn" ? "bg-worn" : "bg-dirty")} />
            </div>
            <div className="p-3 space-y-2">
              <h3 className="font-medium text-sm truncate">{item.name}</h3>
              <p className="text-xs text-muted-foreground">{item.color} · {item.fabric}</p>
              <div className="flex gap-1.5">
                {item.cleanliness !== "clean" && <Button size="sm" variant="outline" onClick={() => markAs(item.id, "clean")} className="text-xs flex-1 h-7">Clean</Button>}
                {item.cleanliness === "clean" && <Button size="sm" variant="outline" onClick={() => markAs(item.id, "worn")} className="text-xs flex-1 h-7">Worn</Button>}
                {item.cleanliness !== "dirty" && <Button size="sm" variant="outline" onClick={() => markAs(item.id, "dirty")} className="text-xs flex-1 h-7 text-destructive border-destructive/30">Wash</Button>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
