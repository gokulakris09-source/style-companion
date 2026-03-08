import { useState, useMemo } from "react";
import { useOutfitHistory, useClothingItems, useUpdateOutfitHistory, OutfitHistoryRow } from "@/hooks/useWardrobe";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { History as HistoryIcon, Star, BarChart3, PieChart, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend } from "recharts";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, format, subWeeks, subMonths } from "date-fns";
import { toast } from "sonner";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(25, 70%, 55%)",
  "hsl(45, 80%, 55%)",
  "hsl(160, 50%, 45%)",
  "hsl(200, 60%, 50%)",
  "hsl(280, 50%, 55%)",
  "hsl(340, 60%, 55%)",
];

export default function History() {
  const { data: history = [], isLoading } = useOutfitHistory();
  const { data: items = [] } = useClothingItems();
  const updateHistory = useUpdateOutfitHistory();
  const [timePeriod, setTimePeriod] = useState<"week" | "month">("week");

  const getItem = (id: string) => items.find((i) => i.id === id);
  const getItemName = (id: string) => getItem(id)?.name || "Unknown";

  // Filter history by time period
  const now = new Date();
  const filteredHistory = useMemo(() => {
    const interval = timePeriod === "week"
      ? { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
      : { start: startOfMonth(now), end: endOfMonth(now) };
    return history.filter((h) => isWithinInterval(new Date(h.worn_at), interval));
  }, [history, timePeriod]);

  // Item usage frequency
  const itemUsageData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredHistory.forEach((h) => {
      h.item_ids.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([id, count]) => ({ id, name: getItemName(id), count, category: getItem(id)?.category || "unknown" }))
      .sort((a, b) => b.count - a.count);
  }, [filteredHistory, items]);

  // Category distribution
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredHistory.forEach((h) => {
      h.item_ids.forEach((id) => {
        const cat = getItem(id)?.category || "unknown";
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [filteredHistory, items]);

  // Daily usage for bar chart
  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    filteredHistory.forEach((h) => {
      const day = format(new Date(h.worn_at), timePeriod === "week" ? "EEE" : "MMM d");
      days[day] = (days[day] || 0) + 1;
    });
    return Object.entries(days).map(([day, outfits]) => ({ day, outfits }));
  }, [filteredHistory, timePeriod]);

  // Most & least worn
  const mostWorn = itemUsageData.slice(0, 5);
  const leastWorn = useMemo(() => {
    const wornIds = new Set(filteredHistory.flatMap((h) => h.item_ids));
    const neverWorn = items.filter((i) => !wornIds.has(i.id));
    return neverWorn.slice(0, 5);
  }, [filteredHistory, items]);

  // Average rating
  const avgRating = useMemo(() => {
    const rated = filteredHistory.filter((h) => h.rating != null);
    if (rated.length === 0) return null;
    return (rated.reduce((sum, h) => sum + (h.rating || 0), 0) / rated.length).toFixed(1);
  }, [filteredHistory]);

  const handleRate = (id: string, rating: number) => {
    updateHistory.mutate({ id, rating }, {
      onSuccess: () => toast.success(`Rated ${rating} stars`),
    });
  };

  const periodLabel = timePeriod === "week"
    ? `${format(startOfWeek(now, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(now, { weekStartsOn: 1 }), "MMM d")}`
    : format(now, "MMMM yyyy");

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-pulse font-display text-lg text-muted-foreground">Loading...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight">Outfit History & Analytics</h1>
          <p className="text-muted-foreground mt-1">Track usage patterns and make smarter fashion decisions.</p>
        </div>
        <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as "week" | "month")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Outfits Worn" value={filteredHistory.length.toString()} sub={periodLabel} />
        <SummaryCard label="Items Used" value={itemUsageData.length.toString()} sub={`of ${items.length} total`} />
        <SummaryCard label="Avg Rating" value={avgRating || "—"} sub={avgRating ? "out of 5" : "No ratings yet"} />
        <SummaryCard label="Unused Items" value={leastWorn.length.toString()} sub="not worn this period" />
      </div>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="timeline">Timeline ({history.length})</TabsTrigger>
        </TabsList>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics" className="space-y-6 mt-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-display text-lg text-muted-foreground">No data for this period</p>
              <p className="text-sm text-muted-foreground mt-1">Wear outfits to see analytics here.</p>
            </div>
          ) : (
            <>
              {/* Outfits per day bar chart */}
              <div className="bg-card border rounded-xl p-6">
                <h2 className="font-display font-semibold mb-4">Outfits Per Day</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="outfits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Most worn items bar chart */}
                <div className="bg-card border rounded-xl p-6">
                  <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" /> Most Worn Items
                  </h2>
                  {mostWorn.length > 0 ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mostWorn} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data</p>
                  )}
                </div>

                {/* Category pie chart */}
                <div className="bg-card border rounded-xl p-6">
                  <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-accent" /> Category Distribution
                  </h2>
                  {categoryData.length > 0 ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                          <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {categoryData.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data</p>
                  )}
                </div>
              </div>

              {/* Least worn / unused items */}
              {leastWorn.length > 0 && (
                <div className="bg-card border rounded-xl p-6">
                  <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-muted-foreground" /> Unused This {timePeriod === "week" ? "Week" : "Month"}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">Consider wearing these to improve wardrobe rotation.</p>
                  <div className="flex gap-2 flex-wrap">
                    {leastWorn.map((item) => (
                      <Badge key={item.id} variant="outline" className="py-1.5 px-3">
                        {item.name}
                        <span className="ml-1 text-muted-foreground text-[10px]">({item.category})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Timeline Tab ── */}
        <TabsContent value="timeline" className="mt-4">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-display text-lg text-muted-foreground">No outfit history yet</p>
              <p className="text-sm text-muted-foreground mt-1">Wear outfits from Suggestions to build your history.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, i) => (
                <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-card border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {new Date(entry.worn_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                      </span>
                      {entry.ai_generated && <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">AI Suggested</span>}
                      {entry.occasion && <Badge variant="outline" className="text-[10px] py-0">{entry.occasion}</Badge>}
                    </div>
                    {/* Star rating */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRate(entry.id, star)}
                          className="p-0.5 transition-colors"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              entry.rating != null && star <= entry.rating
                                ? "fill-accent text-accent"
                                : "text-muted-foreground/30 hover:text-accent/50"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-display font-semibold mt-1">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
