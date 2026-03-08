import { useState } from "react";
import { useClothingItems, ClothingItemRow } from "@/hooks/useWardrobe";
import { supabase } from "@/integrations/supabase/client";
import ClothingCard from "@/components/ClothingCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Loader2, X, Shirt, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CATEGORIES } from "@/lib/types";

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

export default function VirtualTryOn() {
  const { data: items = [] } = useClothingItems();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [style, setStyle] = useState("modern editorial");
  const [background, setBackground] = useState("clean studio with soft lighting");
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

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

  const filteredItems = filterCategory === "all"
    ? items
    : items.filter((i) => i.category === filterCategory);

  const generateTryOn = async () => {
    if (selectedItems.length === 0) {
      toast.error("Select at least one item to try on");
      return;
    }
    setLoading(true);
    setTryOnImage(null);
    setDescription("");
    try {
      const { data, error } = await supabase.functions.invoke("virtual-tryon", {
        body: {
          items: selectedItems.map((i) => ({
            name: i.name,
            category: i.category,
            color: i.color,
            fabric: i.fabric,
          })),
          style,
          background,
        },
      });
      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setTryOnImage(data.imageUrl);
      setDescription(data.description || "");
      toast.success("Try-on visualization generated!");
    } catch (err: any) {
      toast.error(err.message || "Virtual try-on failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Virtual Try-On</h1>
        <p className="text-muted-foreground mt-1">
          Select items from your wardrobe and see how they look together with AI visualization.
        </p>
      </div>

      {/* Selected items bar */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm">
            Selected Items ({selectedItems.length})
          </h2>
          {selectedItems.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs text-muted-foreground gap-1">
              <RotateCcw className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
        {selectedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Click items below to add them to your try-on outfit
          </p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {selectedItems.map((item) => (
              <Badge
                key={item.id}
                variant="secondary"
                className="gap-1.5 py-1.5 px-3 cursor-pointer hover:bg-destructive/10 transition-colors"
                onClick={() => toggleItem(item.id)}
              >
                {item.name}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Style & Background controls */}
      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Style</label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STYLE_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Background</label>
          <Select value={background} onValueChange={setBackground}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BG_OPTIONS.map((b) => (
                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={generateTryOn} disabled={loading || selectedItems.length === 0} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {loading ? "Generating..." : "Generate Try-On"}
          </Button>
        </div>
      </div>

      {/* Try-On Result */}
      <AnimatePresence mode="wait">
        {tryOnImage && (
          <motion.div
            key="tryon-result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="bg-card border rounded-xl p-6"
          >
            <h2 className="font-display text-lg font-semibold mb-4">Your Virtual Outfit</h2>
            <div className="max-w-lg mx-auto">
              <img
                src={tryOnImage}
                alt="Virtual try-on visualization"
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            {description && (
              <p className="mt-4 text-sm text-muted-foreground text-center max-w-lg mx-auto">
                {description}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wardrobe grid for selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold">Your Wardrobe</h2>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
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
                className={`cursor-pointer rounded-xl border-2 transition-all ${
                  selectedIds.has(item.id)
                    ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                    : "border-transparent hover:border-muted-foreground/20"
                }`}
              >
                <ClothingCard item={item} compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
