import { ClothingItem, CleanlinessStatus } from "@/lib/types";
import { Shirt, Footprints, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const categoryIcons: Record<string, React.ReactNode> = {
  top: <Shirt className="h-8 w-8" />,
  bottom: <span className="text-2xl">👖</span>,
  dress: <span className="text-2xl">👗</span>,
  footwear: <Footprints className="h-8 w-8" />,
  outerwear: <span className="text-2xl">🧥</span>,
  accessory: <Star className="h-8 w-8" />,
};

const cleanlinessColors: Record<CleanlinessStatus, string> = {
  clean: "bg-clean",
  worn: "bg-worn",
  dirty: "bg-dirty",
};

interface Props {
  item: ClothingItem;
  onClick?: () => void;
  compact?: boolean;
}

export default function ClothingCard({ item, onClick, compact }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "bg-card rounded-lg border cursor-pointer transition-shadow hover:shadow-lg group overflow-hidden",
        compact && "flex items-center gap-3 p-3"
      )}
    >
      {!compact && (
        <div className="aspect-[3/4] bg-secondary flex items-center justify-center text-muted-foreground relative overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              {categoryIcons[item.category]}
              <span className="text-xs font-body">{item.category}</span>
            </div>
          )}
          <div className={cn("absolute top-2 right-2 w-3 h-3 rounded-full ring-2 ring-card", cleanlinessColors[item.cleanliness])} />
        </div>
      )}
      {compact && (
        <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center text-muted-foreground shrink-0 relative">
          {categoryIcons[item.category]}
          <div className={cn("absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-card", cleanlinessColors[item.cleanliness])} />
        </div>
      )}
      <div className={cn("p-3", compact && "p-0 flex-1 min-w-0")}>
        <h3 className="font-medium text-sm truncate">{item.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.color} · {item.fabric}
        </p>
        {!compact && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{item.usageCount} wears</span>
            <span className="text-xs capitalize text-muted-foreground">{item.season}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
