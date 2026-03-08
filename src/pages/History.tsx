import { useOutfitHistory, useClothingItems } from "@/hooks/useWardrobe";
import { motion } from "framer-motion";
import { History as HistoryIcon } from "lucide-react";

export default function History() {
  const { data: history = [], isLoading } = useOutfitHistory();
  const { data: items = [] } = useClothingItems();

  const getItemName = (id: string) => items.find((i) => i.id === id)?.name || "Unknown item";

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="animate-pulse font-display text-lg text-muted-foreground">Loading...</div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight">Outfit History</h1>
        <p className="text-muted-foreground mt-1">Track your previously worn combinations.</p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16">
          <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-display text-lg text-muted-foreground">No outfit history yet</p>
          <p className="text-sm text-muted-foreground mt-1">Wear outfits from Suggestions to build your history.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry, i) => (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{new Date(entry.worn_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
                {entry.ai_generated && <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">AI Suggested</span>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {entry.item_ids.map((id) => (
                  <span key={id} className="bg-secondary rounded-lg px-3 py-1.5 text-sm">{getItemName(id)}</span>
                ))}
              </div>
              {entry.notes && <p className="text-xs text-muted-foreground mt-2">{entry.notes}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
