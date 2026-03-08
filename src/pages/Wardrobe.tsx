import { useState, useMemo, useRef } from "react";
import { useClothingItems, useAddClothingItem, useUpdateClothingItem, useDeleteClothingItem, useUploadClothingImage, ClothingItemRow } from "@/hooks/useWardrobe";
import { CATEGORIES, Category } from "@/lib/types";
import ClothingCard from "@/components/ClothingCard";
import ClothingForm from "@/components/ClothingForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Wardrobe() {
  const { data: items = [], isLoading } = useClothingItems();
  const addItem = useAddClothingItem();
  const updateItem = useUpdateClothingItem();
  const deleteItemMut = useDeleteClothingItem();

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ClothingItemRow | null>(null);
  const [detailItem, setDetailItem] = useState<ClothingItemRow | null>(null);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.color.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === "all" || i.category === filterCat;
      return matchSearch && matchCat;
    });
  }, [items, search, filterCat]);

  const handleAdd = (data: any) => {
    addItem.mutate(data, {
      onSuccess: () => { setShowForm(false); toast.success("Item added!"); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleEdit = (data: any) => {
    if (editItem) {
      updateItem.mutate({ id: editItem.id, ...data }, {
        onSuccess: () => { setEditItem(null); toast.success("Item updated!"); },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteItemMut.mutate(id, {
      onSuccess: () => { setDetailItem(null); toast.success("Item removed"); },
      onError: (e) => toast.error(e.message),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-pulse font-display text-lg text-muted-foreground">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-semibold tracking-tight">Wardrobe</h1>
        <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCat("all")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filterCat === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setFilterCat(c.value)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filterCat === c.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>{c.label}</button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-muted-foreground">
            <p className="font-display text-lg">No items found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new item.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((item) => <ClothingCard key={item.id} item={item} onClick={() => setDetailItem(item)} />)}
          </div>
        )}
      </AnimatePresence>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="font-display">Add New Item</DialogTitle></DialogHeader>
          <ClothingForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="font-display">Edit Item</DialogTitle></DialogHeader>
          {editItem && <ClothingForm item={editItem} onSave={handleEdit} onCancel={() => setEditItem(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-sm">
          {detailItem && (
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-secondary rounded-lg flex items-center justify-center text-muted-foreground overflow-hidden">
                {detailItem.image_url ? (
                  <img src={detailItem.image_url} alt={detailItem.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-4xl">{detailItem.category === "top" ? "👔" : detailItem.category === "bottom" ? "👖" : detailItem.category === "dress" ? "👗" : detailItem.category === "footwear" ? "👟" : "🧥"}</span>
                )}
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold">{detailItem.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{detailItem.color} · {detailItem.fabric} · {detailItem.season}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Occasion:</span> <span className="capitalize">{detailItem.occasion}</span></div>
                <div><span className="text-muted-foreground">Wears:</span> {detailItem.usage_count}</div>
                <div><span className="text-muted-foreground">Status:</span> <span className="capitalize">{detailItem.cleanliness}</span></div>
                {detailItem.last_worn_at && <div><span className="text-muted-foreground">Last worn:</span> {new Date(detailItem.last_worn_at).toLocaleDateString()}</div>}
              </div>
              {detailItem.care_instructions && <p className="text-xs text-muted-foreground border-t pt-3">{detailItem.care_instructions}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { setEditItem(detailItem); setDetailItem(null); }}><Edit2 className="h-4 w-4" /> Edit</Button>
                <Button variant="destructive" className="gap-2" onClick={() => handleDelete(detailItem.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
