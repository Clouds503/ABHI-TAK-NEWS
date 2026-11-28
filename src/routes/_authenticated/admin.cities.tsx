import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Radar,
  Edit3,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Building2,
  MapPin,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Radio,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Town = Database["public"]["Tables"]["towns"]["Row"];
type City = Database["public"]["Tables"]["cities"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/cities")({
  head: () => ({
    meta: [
      { title: "City Radar & Locations — Abhitak CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CityRadarAdmin,
});

const emptyItem = {
  id: "",
  name_hi: "",
  name_en: "",
  slug: "",
  sort_order: 0,
  is_active: true,
  targetType: "town" as "town" | "city",
};

const schema = z.object({
  name_hi: z.string().trim().min(1, "Hindi name required"),
  name_en: z.string().trim().min(1, "English name required"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, dashes only")
    .min(1),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function CityRadarAdmin() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"radar" | "cities">("radar");
  const [searchQuery, setSearchQuery] = useState("");
  const [f, setF] = useState(emptyItem);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name_en: string;
    name_hi: string;
    type: "town" | "city";
  } | null>(null);

  // 1. Fetch City Radar Towns (powers the home page City Radar)
  const { data: towns = [], isLoading: townsLoading } = useQuery({
    queryKey: ["admin-towns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("towns")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name_en", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 2. Fetch Municipal Cities
  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["admin-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name_en", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Fetch story counts for towns & cities
  const { data: storyCounts } = useQuery({
    queryKey: ["admin-city-story-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("town_id, city_id")
        .eq("status", "published");
      if (error) throw error;
      const townMap = new Map<string, number>();
      const cityMap = new Map<string, number>();
      data?.forEach((a) => {
        if (a.town_id) townMap.set(a.town_id, (townMap.get(a.town_id) ?? 0) + 1);
        if (a.city_id) cityMap.set(a.city_id, (cityMap.get(a.city_id) ?? 0) + 1);
      });
      return { townMap, cityMap };
    },
    staleTime: 60_000,
  });

  // Filtered lists
  const filteredTowns = useMemo(() => {
    if (!searchQuery.trim()) return towns;
    const q = searchQuery.toLowerCase().trim();
    return towns.filter(
      (t) =>
        t.name_hi?.toLowerCase().includes(q) ||
        t.name_en?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q),
    );
  }, [towns, searchQuery]);

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cities;
    const q = searchQuery.toLowerCase().trim();
    return cities.filter(
      (c) =>
        c.name_hi?.toLowerCase().includes(q) ||
        c.name_en?.toLowerCase().includes(q) ||
        c.slug?.toLowerCase().includes(q),
    );
  }, [cities, searchQuery]);

  // Open edit modal for an existing or new town/city
  const openEdit = (item?: Town | City, type: "town" | "city" = activeTab === "radar" ? "town" : "city") => {
    if (item) {
      setF({
        id: item.id,
        name_hi: item.name_hi,
        name_en: item.name_en,
        slug: item.slug,
        sort_order: item.sort_order,
        is_active: item.is_active,
        targetType: type,
      });
    } else {
      // Suggest next sort order
      const list = type === "town" ? towns : cities;
      const maxOrder = list.reduce((max, cur) => Math.max(max, cur.sort_order), 0);
      setF({
        ...emptyItem,
        sort_order: maxOrder + 1,
        targetType: type,
      });
    }
    setSheetOpen(true);
  };

  // Save changes
  const save = async () => {
    const slug = f.slug ? slugify(f.slug) : slugify(f.name_en);
    const parsed = schema.safeParse({ ...f, slug });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message);
      return;
    }

    const isTown = f.targetType === "town";
    const table = isTown ? "towns" : "cities";
    const row = {
      name_hi: f.name_hi.trim(),
      name_en: f.name_en.trim(),
      slug,
      sort_order: Number(f.sort_order),
      is_active: Boolean(f.is_active),
    };

    const toastId = toast.loading(
      f.id ? `Saving changes to ${f.name_en}...` : `Adding ${f.name_en}...`,
    );

    const res = f.id
      ? await supabase.from(table).update(row).eq("id", f.id).select("id").single()
      : await supabase.from(table).insert(row).select("id").single();

    if (res.error) {
      toast.error(res.error.message, { id: toastId });
      return;
    }

    if (user?.id) {
      await supabase.from("admin_activity_logs").insert({
        actor_id: user.id,
        action: f.id ? "update" : "create",
        entity: isTown ? "city_radar_town" : "city",
        entity_id: res.data.id,
      });
    }

    toast.success(
      isTown
        ? `City Radar updated: "${f.name_hi} / ${f.name_en}" saved!`
        : `City "${f.name_en}" saved!`,
      { id: toastId },
    );

    setSheetOpen(false);
    void qc.invalidateQueries({ queryKey: ["admin-towns"] });
    void qc.invalidateQueries({ queryKey: ["towns"] });
    void qc.invalidateQueries({ queryKey: ["admin-cities"] });
    void qc.invalidateQueries({ queryKey: ["cities"] });
  };

  // Quick toggle active status
  const toggleActive = async (item: Town | City, type: "town" | "city") => {
    const table = type === "town" ? "towns" : "cities";
    const nextStatus = !item.is_active;

    const { error } = await supabase
      .from(table)
      .update({ is_active: nextStatus })
      .eq("id", item.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (user?.id) {
      await supabase.from("admin_activity_logs").insert({
        actor_id: user.id,
        action: nextStatus ? "activate" : "deactivate",
        entity: type === "town" ? "city_radar_town" : "city",
        entity_id: item.id,
      });
    }

    toast.success(
      nextStatus
        ? `${item.name_en} activated on ${type === "town" ? "City Radar" : "Cities"}`
        : `${item.name_en} hidden from ${type === "town" ? "City Radar" : "Cities"}`,
    );

    void qc.invalidateQueries({ queryKey: ["admin-towns"] });
    void qc.invalidateQueries({ queryKey: ["towns"] });
    void qc.invalidateQueries({ queryKey: ["admin-cities"] });
    void qc.invalidateQueries({ queryKey: ["cities"] });
  };

  // Quick sort adjust (move up/down)
  const adjustSort = async (item: Town | City, type: "town" | "city", delta: number) => {
    const table = type === "town" ? "towns" : "cities";
    const newSort = Math.max(0, item.sort_order + delta);
    if (newSort === item.sort_order) return;

    const { error } = await supabase
      .from(table)
      .update({ sort_order: newSort })
      .eq("id", item.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Updated rank for ${item.name_en} to #${newSort}`);
    void qc.invalidateQueries({ queryKey: [type === "town" ? "admin-towns" : "admin-cities"] });
    void qc.invalidateQueries({ queryKey: [type === "town" ? "towns" : "cities"] });
  };

  // Hard delete
  const hardDelete = async () => {
    if (!deleteTarget) return;
    const table = deleteTarget.type === "town" ? "towns" : "cities";
    const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    if (user?.id) {
      await supabase.from("admin_activity_logs").insert({
        actor_id: user.id,
        action: "delete",
        entity: deleteTarget.type === "town" ? "city_radar_town" : "city",
        entity_id: deleteTarget.id,
      });
    }

    toast.success(`Deleted ${deleteTarget.name_en}`);
    setDeleteTarget(null);
    void qc.invalidateQueries({ queryKey: ["admin-towns"] });
    void qc.invalidateQueries({ queryKey: ["towns"] });
    void qc.invalidateQueries({ queryKey: ["admin-cities"] });
    void qc.invalidateQueries({ queryKey: ["cities"] });
  };

  const activeTownsCount = towns.filter((t) => t.is_active).length;
  const activeCitiesCount = cities.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Radar className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">City Radar & Regional Locations</h1>
              <p className="text-xs text-muted-foreground">
                Manage the cities & towns featured in the homepage City Radar (सिटीज रडार) strip and desktop grid.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to="/" target="_blank">
              <ExternalLink className="h-4 w-4" />
              View Live Radar
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={() => openEdit(undefined, activeTab === "radar" ? "town" : "city")}
            className="gap-2 bg-primary font-semibold"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "radar" ? "Add City to Radar" : "Add Regional City"}
          </Button>
        </div>
      </div>

      {/* Live City Radar Preview Strip */}
      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b mb-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary animate-pulse" />
            <h2 className="text-sm font-bold text-foreground">
              Live City Radar Preview (सिटीज रडार)
            </h2>
            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary">
              {activeTownsCount} Active Towns
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Top 7 appear highlighted on desktop screen
          </span>
        </div>

        <div className="no-scrollbar flex snap-x gap-2.5 overflow-x-auto py-1">
          {towns
            ?.filter((t) => t.is_active)
            .map((tw, idx) => {
              const count = storyCounts?.townMap.get(tw.id) ?? 0;
              const isDesktopTop7 = idx < 7;
              return (
                <div
                  key={tw.id}
                  onClick={() => openEdit(tw, "town")}
                  className={`group relative flex h-[76px] w-[124px] shrink-0 snap-start cursor-pointer flex-col justify-between rounded-lg border p-2.5 transition-all hover:border-primary hover:shadow-xs ${
                    isDesktopTop7 ? "bg-card" : "bg-muted/40"
                  }`}
                  title={`Click to edit ${tw.name_en} (${tw.name_hi})`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {tw.name_hi}
                    </span>
                    <span
                      className={`rounded px-1 text-[9px] font-mono font-bold ${
                        isDesktopTop7
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      #{tw.sort_order}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate text-[10px]">{tw.name_en}</span>
                    <span className="flex items-center gap-1 font-medium text-[10px]">
                      <span className={`h-1.5 w-1.5 rounded-full ${count > 0 ? "bg-primary" : "bg-border"}`} />
                      {count}
                    </span>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Edit3 className="h-3 w-3" /> Edit Radar
                    </span>
                  </div>
                </div>
              );
            })}

          {activeTownsCount === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground w-full">
              No active towns in City Radar yet. Click "+ Add City to Radar" to add your first.
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Radar Towns vs Municipal Cities */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "radar" | "cities")}
        className="w-full"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="bg-muted">
            <TabsTrigger value="radar" className="gap-2">
              <Radar className="h-4 w-4" />
              <span>City Radar (सिटीज रडार)</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {towns.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cities" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span>Regional Cities (नगर / शहर)</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {cities.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full max-w-xs sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Hindi, English or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>
        </div>

        {/* TAB 1: City Radar Towns */}
        <TabsContent value="radar" className="mt-4">
          <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-center w-16">Rank</th>
                  <th className="px-4 py-3 text-left">Hindi (स्थान)</th>
                  <th className="px-4 py-3 text-left">English Name</th>
                  <th className="px-4 py-3 text-left">Public Slug</th>
                  <th className="px-4 py-3 text-center">Stories</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTowns.map((tw, idx) => {
                  const count = storyCounts?.townMap.get(tw.id) ?? 0;
                  const isTop7 = tw.is_active && idx < 7;
                  return (
                    <tr
                      key={tw.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        !tw.is_active ? "opacity-60 bg-muted/10" : ""
                      }`}
                    >
                      {/* Rank & Reorder */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className={`inline-flex items-center justify-center h-6 w-6 rounded-md font-mono text-xs font-bold ${
                              isTop7
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-muted text-muted-foreground"
                            }`}
                            title={isTop7 ? "Appears in Desktop 7-Column Grid" : `Sort Order #${tw.sort_order}`}
                          >
                            {tw.sort_order}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => adjustSort(tw, "town", -1)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                              title="Move up"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustSort(tw, "town", 1)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                              title="Move down"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Hindi Name */}
                      <td className="px-4 py-3 font-semibold text-foreground text-base">
                        <div className="flex items-center gap-2">
                          <span>{tw.name_hi}</span>
                          {isTop7 && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 font-normal">
                              Desktop Top 7
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* English Name */}
                      <td className="px-4 py-3 font-medium text-foreground">
                        {tw.name_en}
                      </td>

                      {/* Slug */}
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>/town/{tw.slug}</span>
                          <Button asChild variant="ghost" size="icon" className="h-6 w-6">
                            <Link to="/town/$slug" params={{ slug: tw.slug }} target="_blank">
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Link>
                          </Button>
                        </div>
                      </td>

                      {/* Stories count */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              count > 0 ? "bg-primary" : "bg-muted-foreground"
                            }`}
                          />
                          {count} {count === 1 ? "story" : "stories"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleActive(tw, "town")}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                            tw.is_active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {tw.is_active ? (
                            <>
                              <Eye className="h-3 w-3" /> Active on Radar
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" /> Hidden
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(tw, "town")}
                            className="gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setDeleteTarget({
                                id: tw.id,
                                name_en: tw.name_en,
                                name_hi: tw.name_hi,
                                type: "town",
                              })
                            }
                            title="Delete Town"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTowns.length === 0 && !townsLoading && (
              <div className="py-12 text-center">
                <Radar className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-semibold">No towns found</p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? "Try a different search query" : "Add your first City Radar town above"}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: Municipal Cities */}
        <TabsContent value="cities" className="mt-4">
          <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-center w-16">Sort</th>
                  <th className="px-4 py-3 text-left">Hindi Name</th>
                  <th className="px-4 py-3 text-left">English Name</th>
                  <th className="px-4 py-3 text-left">Slug</th>
                  <th className="px-4 py-3 text-center">Stories</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCities.map((c) => {
                  const count = storyCounts?.cityMap.get(c.id) ?? 0;
                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        !c.is_active ? "opacity-60 bg-muted/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center font-mono text-xs text-muted-foreground">
                        {c.sort_order}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground text-base">
                        {c.name_hi}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{c.name_en}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.slug}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {count} {count === 1 ? "story" : "stories"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleActive(c, "city")}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                            c.is_active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(c, "city")}
                            className="gap-1.5 text-xs font-semibold"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setDeleteTarget({
                                id: c.id,
                                name_en: c.name_en,
                                name_hi: c.name_hi,
                                type: "city",
                              })
                            }
                            title="Delete City"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredCities.length === 0 && !citiesLoading && (
              <div className="py-12 text-center">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-semibold">No municipal cities found</p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? "Try a different search query" : "Add your first municipal city above"}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit / Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {f.targetType === "town" ? (
                  <Radar className="h-4 w-4" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
              </span>
              <div>
                <SheetTitle>
                  {f.id
                    ? f.targetType === "town"
                      ? "Edit City Radar Item"
                      : "Edit Municipal City"
                    : f.targetType === "town"
                    ? "Add City to Radar"
                    : "Add Municipal City"}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {f.targetType === "town"
                    ? "Changes here update the live City Radar cards on the home page."
                    : "Changes here update the secondary cities classification."}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Live Card Preview inside Drawer */}
          <div className="mt-4 rounded-xl border bg-muted/40 p-3">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Live Card Preview (Home Screen Pill)
            </Label>
            <div className="mt-2 flex items-center justify-center">
              <div className="flex h-[76px] w-[130px] flex-col justify-between rounded-md border bg-card p-3 shadow-xs">
                <span className="text-[15px] font-semibold leading-none text-foreground truncate">
                  {f.name_hi || "शहर का नाम"}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${f.is_active ? "bg-primary" : "bg-muted-foreground"}`} />
                  {f.name_en || "City"} · 0 stories
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="name_hi" className="text-xs font-semibold">
                Name in Hindi (हिंदी नाम) *
              </Label>
              <Input
                id="name_hi"
                value={f.name_hi}
                onChange={(e) => setF((p) => ({ ...p, name_hi: e.target.value }))}
                placeholder="e.g. बिजनौर, नगीना, लखनऊ"
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Main label displayed on the public City Radar button.
              </p>
            </div>

            <div>
              <Label htmlFor="name_en" className="text-xs font-semibold">
                Name in English *
              </Label>
              <Input
                id="name_en"
                value={f.name_en}
                onChange={(e) => {
                  const val = e.target.value;
                  setF((p) => ({
                    ...p,
                    name_en: val,
                    slug: p.slug || slugify(val),
                  }));
                }}
                placeholder="e.g. Bijnor, Nagina, Lucknow"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="slug" className="text-xs font-semibold">
                URL Slug *
              </Label>
              <Input
                id="slug"
                value={f.slug}
                onChange={(e) => setF((p) => ({ ...p, slug: slugify(e.target.value) }))}
                placeholder="e.g. bijnor"
                className="mt-1 font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Public feed URL: <span className="font-mono">/town/{f.slug || "slug"}</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sort_order" className="text-xs font-semibold">
                  Radar Sort Order / Position
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Order 1–7 = Desktop Highlight Grid
                </span>
              </div>
              <Input
                id="sort_order"
                type="number"
                min={0}
                value={f.sort_order}
                onChange={(e) => setF((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Lower numbers appear first. Ranks 1 to 7 are featured directly on the desktop home screen.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-2xs">
              <div className="space-y-0.5">
                <Label htmlFor="is_active_toggle" className="text-xs font-semibold cursor-pointer">
                  Active on Public Radar
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Display this location on the home screen City Radar strip.
                </p>
              </div>
              <Switch
                id="is_active_toggle"
                checked={f.is_active}
                onCheckedChange={(val) => setF((p) => ({ ...p, is_active: val }))}
              />
            </div>

            <div className="pt-2">
              <Button onClick={save} className="w-full gap-2 bg-primary font-semibold">
                <Sparkles className="h-4 w-4" />
                {f.id ? "Save City Radar Changes" : "Publish to City Radar"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete "{deleteTarget?.name_en}" ({deleteTarget?.name_hi})?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this location? Articles linked to this location
              will remain intact with their {deleteTarget?.type} set to null. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={hardDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
