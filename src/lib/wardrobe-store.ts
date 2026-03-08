import { ClothingItem, OutfitPlan, CleanlinessStatus } from "./types";

const STORAGE_KEY = "wardrobe_items";
const PLANNER_KEY = "outfit_planner";

// Sample data for first launch
const sampleItems: ClothingItem[] = [
  {
    id: "1",
    name: "White Oxford Shirt",
    category: "top",
    color: "White",
    fabric: "Cotton",
    season: "all",
    occasion: "casual",
    usageCount: 5,
    careInstructions: "Machine wash cold, tumble dry low",
    cleanliness: "clean",
    imageUrl: "",
    dateAdded: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Dark Indigo Jeans",
    category: "bottom",
    color: "Indigo",
    fabric: "Denim",
    season: "all",
    occasion: "casual",
    usageCount: 8,
    careInstructions: "Machine wash cold, hang dry",
    cleanliness: "worn",
    imageUrl: "",
    dateAdded: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Black Leather Chelsea Boots",
    category: "footwear",
    color: "Black",
    fabric: "Leather",
    season: "fall",
    occasion: "smart-casual",
    usageCount: 12,
    careInstructions: "Polish regularly, use shoe trees",
    cleanliness: "clean",
    imageUrl: "",
    dateAdded: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Navy Blazer",
    category: "outerwear",
    color: "Navy",
    fabric: "Wool",
    season: "fall",
    occasion: "formal",
    usageCount: 3,
    careInstructions: "Dry clean only",
    cleanliness: "clean",
    imageUrl: "",
    dateAdded: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Floral Summer Dress",
    category: "dress",
    color: "Multicolor",
    fabric: "Linen",
    season: "summer",
    occasion: "casual",
    usageCount: 2,
    careInstructions: "Hand wash, air dry",
    cleanliness: "clean",
    imageUrl: "",
    dateAdded: new Date().toISOString(),
  },
];

export function getItems(): ClothingItem[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleItems));
    return sampleItems;
  }
  return JSON.parse(stored);
}

export function saveItems(items: ClothingItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addItem(item: Omit<ClothingItem, "id" | "dateAdded" | "usageCount">) {
  const items = getItems();
  const newItem: ClothingItem = {
    ...item,
    id: crypto.randomUUID(),
    dateAdded: new Date().toISOString(),
    usageCount: 0,
  };
  items.push(newItem);
  saveItems(items);
  return newItem;
}

export function updateItem(id: string, updates: Partial<ClothingItem>) {
  const items = getItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates };
    saveItems(items);
  }
  return items[idx];
}

export function deleteItem(id: string) {
  const items = getItems().filter((i) => i.id !== id);
  saveItems(items);
}

export function updateCleanliness(id: string, status: CleanlinessStatus) {
  return updateItem(id, { cleanliness: status });
}

export function incrementUsage(id: string) {
  const items = getItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    return updateItem(id, { usageCount: item.usageCount + 1, cleanliness: "worn" });
  }
}

// Planner
export function getWeeklyPlan(): OutfitPlan[] {
  const stored = localStorage.getItem(PLANNER_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveWeeklyPlan(plan: OutfitPlan[]) {
  localStorage.setItem(PLANNER_KEY, JSON.stringify(plan));
}

export function getOutfitSuggestion(items: ClothingItem[], exclude: string[] = []): ClothingItem[] {
  const available = items.filter(
    (i) => i.cleanliness !== "dirty" && !exclude.includes(i.id)
  );
  const top = available.filter((i) => i.category === "top");
  const bottom = available.filter((i) => i.category === "bottom");
  const footwear = available.filter((i) => i.category === "footwear");

  const pick = (arr: ClothingItem[]) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;

  return [pick(top), pick(bottom), pick(footwear)].filter(Boolean) as ClothingItem[];
}
