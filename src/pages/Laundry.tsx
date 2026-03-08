import { useState } from "react";
import { getItems, updateCleanliness } from "@/lib/wardrobe-store";
import { CleanlinessStatus } from "@/lib/types";
import ClothingCard from "@/components/ClothingCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Droplets, CheckCircle, AlertTriangle } from "lucide-react";

const statusTabs: { value: CleanlinessStatus | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: null },
  { value: "clean", label: "Clean", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  { value: "worn", label: "Worn", icon: <Droplets className="h-3.5 w-3.5" /> },
  { value: "dirty", label: "Needs Wash", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
];

export default function Laundry() {
  const [items, setItems] = useState(getItems);
  const [filter, setFilter] = useState<CleanlinessStatus | "all">("all");

  const refresh = () => setItems(getItems());

  const filtered = filter === "all" ? items : items.filter((i) => i.cleanliness === filter);

  const markAs = (id: string, status: CleanlinessStatus) => {
    updateCleanliness(id, status);
    refresh();
    toast.success(`Marked as ${status}`);
  };

  const markAllClean = () => {
    items.filter((i) => i.cleanliness === "dirty").forEach((i) => updateCleanliness(i.id, "clean"));
    refresh();
    toast.success("All dirty items marked as clean!");
  };

  const dirtyCount = items.filter((i) => i.cleanliness === "dirty").length;
  const wornCount = items.filter((i) => i.cleanliness === "worn").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Laundry Tracker</h1>
          <p className="text-muted-foreground mt-1">
            {dirtyCount} items need washing · {wornCount} worn
          </p>
        </div>
        {dirtyCount > 0 && (
          <Button onClick={markAllClean} variant="outline" className="gap-2">
            <CheckCircle className="h-4 w-4" /> Mark All Clean
          </Button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filter === tab.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card border rounded-lg p-4 flex items-center gap-4"
          >
            <div className="flex-1">
              <ClothingCard item={item} compact />
            </div>
            <div className="flex gap-2 shrink-0">
              {item.cleanliness !== "clean" && (
                <Button size="sm" variant="outline" onClick={() => markAs(item.id, "clean")} className="text-xs">Clean</Button>
              )}
              {item.cleanliness === "clean" && (
                <Button size="sm" variant="outline" onClick={() => markAs(item.id, "worn")} className="text-xs">Worn</Button>
              )}
              {item.cleanliness !== "dirty" && (
                <Button size="sm" variant="outline" onClick={() => markAs(item.id, "dirty")} className="text-xs text-destructive border-destructive/30">Wash</Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
