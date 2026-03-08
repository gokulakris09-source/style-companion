import { useMemo } from "react";
import { useClothingItems } from "@/hooks/useWardrobe";
import { CATEGORIES } from "@/lib/types";
import { Shirt, TrendingUp, Droplets, CalendarDays, Sparkles, History } from "lucide-react";
import { motion } from "framer-motion";
import ClothingCard from "@/components/ClothingCard";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { data: items = [], isLoading } = useClothingItems();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const clean = items.filter((i) => i.cleanliness === "clean").length;
    const dirty = items.filter((i) => i.cleanliness === "dirty").length;
    const totalWears = items.reduce((s, i) => s + i.usage_count, 0);
    return { total: items.length, clean, dirty, totalWears };
  }, [items]);

  const recentItems = items.slice(0, 4);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-pulse font-display text-lg text-muted-foreground">Loading wardrobe...</div></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Your Wardrobe</h1>
        <p className="text-muted-foreground mt-1">Organize, plan, and wear with confidence.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: stats.total, icon: Shirt, color: "text-accent" },
          { label: "Clean", value: stats.clean, icon: Droplets, color: "text-clean" },
          { label: "Needs Wash", value: stats.dirty, icon: Droplets, color: "text-dirty" },
          { label: "Total Wears", value: stats.totalWears, icon: TrendingUp, color: "text-muted-foreground" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-display font-semibold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">By Category</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category === cat.value).length;
            return (
              <button key={cat.value} onClick={() => navigate("/wardrobe")} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                {cat.label} <span className="ml-1 text-muted-foreground">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Manage Wardrobe", desc: "Add, edit, or remove items", icon: Shirt, to: "/wardrobe" },
          { label: "Plan Your Week", desc: "Organize outfits ahead", icon: CalendarDays, to: "/planner" },
          { label: "AI Suggestions", desc: "Get smart outfit picks", icon: Sparkles, to: "/suggestions" },
        ].map((action) => (
          <motion.button key={action.to} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate(action.to)} className="bg-card border rounded-lg p-5 text-left hover:shadow-md transition-shadow">
            <action.icon className="h-6 w-6 text-accent mb-3" />
            <h3 className="font-medium text-sm">{action.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{action.desc}</p>
          </motion.button>
        ))}
      </div>

      {recentItems.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Recently Added</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentItems.map((item) => (
              <ClothingCard key={item.id} item={item} onClick={() => navigate("/wardrobe")} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
