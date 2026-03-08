export type Category = "top" | "bottom" | "dress" | "footwear" | "outerwear" | "accessory";
export type Season = "spring" | "summer" | "fall" | "winter" | "all";
export type Occasion = "casual" | "formal" | "smart-casual" | "sportswear" | "party";
export type CleanlinessStatus = "clean" | "worn" | "dirty";

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  color: string;
  fabric: string;
  season: Season;
  occasion: Occasion;
  usageCount: number;
  careInstructions: string;
  cleanliness: CleanlinessStatus;
  imageUrl: string;
  dateAdded: string;
}

export interface OutfitPlan {
  day: string;
  itemIds: string[];
}

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "dress", label: "Dress" },
  { value: "footwear", label: "Footwear" },
  { value: "outerwear", label: "Outerwear" },
  { value: "accessory", label: "Accessory" },
];

export const SEASONS: { value: Season; label: string }[] = [
  { value: "all", label: "All Seasons" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
];

export const OCCASIONS: { value: Occasion; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "smart-casual", label: "Smart Casual" },
  { value: "sportswear", label: "Sportswear" },
  { value: "party", label: "Party" },
];

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
