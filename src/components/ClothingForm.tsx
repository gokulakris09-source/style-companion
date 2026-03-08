import { useState } from "react";
import { ClothingItem, CATEGORIES, SEASONS, OCCASIONS, Category, Season, Occasion, CleanlinessStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  item?: ClothingItem;
  onSave: (data: Omit<ClothingItem, "id" | "dateAdded" | "usageCount"> | Partial<ClothingItem>) => void;
  onCancel: () => void;
}

export default function ClothingForm({ item, onSave, onCancel }: Props) {
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState<Category>(item?.category || "top");
  const [color, setColor] = useState(item?.color || "");
  const [fabric, setFabric] = useState(item?.fabric || "");
  const [season, setSeason] = useState<Season>(item?.season || "all");
  const [occasion, setOccasion] = useState<Occasion>(item?.occasion || "casual");
  const [careInstructions, setCareInstructions] = useState(item?.careInstructions || "");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      category,
      color,
      fabric,
      season,
      occasion,
      careInstructions,
      imageUrl,
      cleanliness: item?.cleanliness || ("clean" as CleanlinessStatus),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="White Oxford Shirt" required />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Navy" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fabric">Fabric</Label>
          <Input id="fabric" value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="Cotton" required />
        </div>
        <div className="space-y-2">
          <Label>Season</Label>
          <Select value={season} onValueChange={(v) => setSeason(v as Season)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEASONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Occasion</Label>
          <Select value={occasion} onValueChange={(v) => setOccasion(v as Occasion)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OCCASIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="imageUrl">Image URL (optional)</Label>
        <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="care">Care Instructions</Label>
        <Textarea id="care" value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} placeholder="Machine wash cold..." />
      </div>
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{item ? "Update" : "Add Item"}</Button>
      </div>
    </form>
  );
}
