import { useState, useRef } from "react";
import { ClothingItemRow, useUploadClothingImage } from "@/hooks/useWardrobe";
import { CATEGORIES, SEASONS, OCCASIONS, Category, Season, Occasion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface Props {
  item?: ClothingItemRow;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function ClothingForm({ item, onSave, onCancel }: Props) {
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState<Category>((item?.category as Category) || "top");
  const [color, setColor] = useState(item?.color || "");
  const [fabric, setFabric] = useState(item?.fabric || "");
  const [season, setSeason] = useState<Season>((item?.season as Season) || "all");
  const [occasion, setOccasion] = useState<Occasion>((item?.occasion as Occasion) || "casual");
  const [careInstructions, setCareInstructions] = useState(item?.care_instructions || "");
  const [imageUrl, setImageUrl] = useState(item?.image_url || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadImage = useUploadClothingImage();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage.mutateAsync(file);
      setImageUrl(url);
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      category,
      color,
      fabric,
      season,
      occasion,
      care_instructions: careInstructions,
      image_url: imageUrl,
      cleanliness: item?.cleanliness || "clean",
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
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
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
            <SelectContent>{SEASONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Occasion</Label>
          <Select value={occasion} onValueChange={(v) => setOccasion(v as Occasion)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{OCCASIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Image upload */}
      <div className="space-y-2">
        <Label>Image</Label>
        <div className="flex gap-3 items-center">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
            <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload Photo"}
          </Button>
          {imageUrl && <img src={imageUrl} alt="Preview" className="h-12 w-12 rounded-md object-cover" />}
        </div>
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
