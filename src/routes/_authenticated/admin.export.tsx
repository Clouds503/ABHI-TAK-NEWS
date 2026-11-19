import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Download,
  FileSpreadsheet,
  FileJson,
  Database,
  Calendar,
  Filter,
  RefreshCw,
  Newspaper,
  Megaphone,
  Users,
  BadgeIndianRupee,
  Clapperboard,
  CalendarDays,
  ShieldCheck,
  Eye,
  Archive,
  Check,
  Sparkles,
  Info,
  MapPin,
  BarChart3,
  Layers,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  exportToCsv,
  exportToJson,
  fetchAllRowsInBatches,
  sanitizeExportFilename,
  type ColumnDefinition,
} from "@/lib/export-data";

export const Route = createFileRoute("/_authenticated/admin/export")({
  head: () => ({
    meta: [{ title: "Data Export Center — Newsroom CMS" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminExportPage,
});

type DateRangePreset = "all" | "today" | "7d" | "30d" | "90d" | "year" | "custom";
type ExportFormat = "csv" | "json";

interface DatasetConfig {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  table: string;
  icon: any;
  color: string;
  dateField?: string;
  defaultFilename: string;
  columns: ColumnDefinition[];
  statusFilterField?: string;
  statusOptions?: { value: string; label: string }[];
}

const DATASETS: DatasetConfig[] = [
  {
    id: "articles",
    name: "News Articles & Editorial",
    nameHi: "समाचार और लेख",
    description: "All published stories, editorial drafts, breaking alerts, view counts, and categories.",
    table: "articles",
    icon: Newspaper,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    dateField: "created_at",
    defaultFilename: "news_articles",
    statusFilterField: "status",
    statusOptions: [
      { value: "all", label: "All Statuses" },
      { value: "published", label: "Published Only" },
      { value: "draft", label: "Drafts Only" },
      { value: "archived", label: "Archived Only" },
    ],
    columns: [
      { key: "id", label: "Article ID" },
      { key: "title_hi", label: "Title (Hindi)" },
      { key: "title_en", label: "Title (English)" },
      { key: "slug", label: "Slug" },
      { key: "status", label: "Status" },
      { key: "views", label: "Views" },
      { key: "district", label: "District" },
      { key: "city", label: "City" },
      { key: "village", label: "Village" },
      { key: "is_breaking", label: "Breaking", transform: (v) => (v ? "Yes" : "No") },
      { key: "is_featured", label: "Featured", transform: (v) => (v ? "Yes" : "No") },
      { key: "summary_hi", label: "Summary (Hindi)" },
      { key: "cover_url", label: "Cover Image URL" },
      { key: "video_url", label: "Video URL" },
      { key: "published_at", label: "Published At" },
      { key: "created_at", label: "Created At" },
    ],
  },
  {
    id: "jan_ki_awaaz",
    name: "Jan Ki Awaaz (Civic Reports)",
    nameHi: "जन की आवाज़ (शिकायतें)",
    description: "Citizen grievances, local issues, verification statuses, locations, and citizen votes.",
    table: "jan_ki_awaaz_posts",
    icon: Megaphone,
    color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    dateField: "created_at",
    defaultFilename: "jan_ki_awaaz_reports",
    statusFilterField: "status",
    statusOptions: [
      { value: "all", label: "All Statuses" },
      { value: "pending", label: "Pending Review" },
      { value: "approved", label: "Approved" },
      { value: "in_progress", label: "In Progress" },
      { value: "resolved", label: "Resolved" },
      { value: "rejected", label: "Rejected" },
    ],
    columns: [
      { key: "id", label: "Report ID" },
      { key: "title", label: "Report Title" },
      { key: "category", label: "Category" },
      { key: "status", label: "Status" },
      { key: "district", label: "District" },
      { key: "city", label: "City" },
      { key: "village", label: "Village" },
      { key: "upvotes", label: "Upvotes" },
      { key: "description", label: "Description" },
      { key: "image_url", label: "Photo Evidence URL" },
      { key: "video_url", label: "Video Evidence URL" },
      { key: "created_at", label: "Reported Date" },
      { key: "updated_at", label: "Last Updated" },
    ],
  },
  {
    id: "advertisements",
    name: "Ads & Sponsorships",
    nameHi: "विज्ञापन और प्रचार",
    description: "Commercial banners, placement channels, device visibility rules, impressions, and clicks.",
    table: "advertisements",
    icon: BadgeIndianRupee,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    dateField: "created_at",
    defaultFilename: "advertisements_campaigns",
    statusFilterField: "is_active",
    statusOptions: [
      { value: "all", label: "All Campaigns" },
      { value: "true", label: "Active Campaigns Only" },
      { value: "false", label: "Paused/Inactive Only" },
    ],
    columns: [
      { key: "id", label: "Ad ID" },
      { key: "title", label: "Campaign Title" },
      { key: "client_name", label: "Advertiser / Client" },
      { key: "placement", label: "Placement Slot" },
      { key: "device_visibility", label: "Device Visibility" },
      { key: "is_active", label: "Active", transform: (v) => (v ? "Active" : "Paused") },
      { key: "impression_count", label: "Impressions" },
      { key: "click_count", label: "Clicks" },
      {
        key: "ctr",
        label: "CTR (%)",
        transform: (_, row) => {
          const imp = row.impression_count || 0;
          const clk = row.click_count || 0;
          return imp > 0 ? ((clk / imp) * 100).toFixed(2) + "%" : "0.00%";
        },
      },
      { key: "link_url", label: "Destination URL" },
      { key: "starts_at", label: "Start Date" },
      { key: "ends_at", label: "End Date" },
      { key: "created_at", label: "Created Date" },
    ],
  },
  {
    id: "profiles",
    name: "Users & Reporter Directory",
    nameHi: "उपयोगकर्ता और रिपोर्टर सूची",
    description: "Registered readers, citizen reporters, verified phone numbers, and account registration dates.",
    table: "profiles",
    icon: Users,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    dateField: "created_at",
    defaultFilename: "user_directory",
    columns: [
      { key: "id", label: "User ID" },
      { key: "full_name", label: "Full Name" },
      { key: "email", label: "Email Address" },
      { key: "phone", label: "Mobile Number" },
      { key: "bio", label: "Bio / Notes" },
      { key: "created_at", label: "Joined Date" },
      { key: "updated_at", label: "Last Profile Update" },
    ],
  },
  {
    id: "reels",
    name: "Video Reels & Shorts",
    nameHi: "वीडियो रील्स",
    description: "Vertical video catalog, play metrics, like counts, and video URLs.",
    table: "reels",
    icon: Clapperboard,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    dateField: "created_at",
    defaultFilename: "video_reels",
    columns: [
      { key: "id", label: "Reel ID" },
      { key: "title", label: "Title" },
      { key: "caption", label: "Caption" },
      { key: "video_url", label: "Video Source URL" },
      { key: "views_count", label: "Views" },
      { key: "likes_count", label: "Likes" },
      { key: "is_active", label: "Active", transform: (v) => (v ? "Yes" : "No") },
      { key: "created_at", label: "Created Date" },
    ],
  },
  {
    id: "events",
    name: "Events & Calendar",
    nameHi: "कार्यक्रम और कैलेंडर",
    description: "Community updates, scheduled conferences, local fairs, dates, and locations.",
    table: "events",
    icon: CalendarDays,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    dateField: "event_date",
    defaultFilename: "community_events",
    columns: [
      { key: "id", label: "Event ID" },
      { key: "title_hi", label: "Title (Hindi)" },
      { key: "title_en", label: "Title (English)" },
      { key: "event_date", label: "Event Date & Time" },
      { key: "location", label: "Venue / Location" },
      { key: "status", label: "Status" },
      { key: "description_hi", label: "Description" },
      { key: "created_at", label: "Created Date" },
    ],
  },
  {
    id: "admin_activity_logs",
    name: "CMS Audit & Activity Logs",
    nameHi: "ऑडिट और गतिविधि लॉग",
    description: "Staff audit trails, editorial modifications, moderation decisions, and system events.",
    table: "admin_activity_logs",
    icon: ShieldCheck,
    color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    dateField: "created_at",
    defaultFilename: "cms_audit_logs",
    columns: [
      { key: "id", label: "Log ID" },
      { key: "action", label: "Action Taken" },
      { key: "entity", label: "Entity Target" },
      { key: "entity_id", label: "Entity Record ID" },
      { key: "actor_id", label: "Admin / Staff ID" },
      { key: "details", label: "Parameters / Metadata", transform: (v) => (v ? JSON.stringify(v) : "") },
      { key: "created_at", label: "Timestamp" },
    ],
  },
  {
    id: "taxonomies",
    name: "Geographies & Taxonomies",
    nameHi: "जिले, शहर, कस्बे और श्रेणियां",
    description: "Hierarchical location records (districts, towns, cities, villages) and news categories.",
    table: "categories",
    icon: MapPin,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    defaultFilename: "taxonomy_categories",
    columns: [
      { key: "id", label: "Category ID" },
      { key: "name_hi", label: "Name (Hindi)" },
      { key: "name_en", label: "Name (English)" },
      { key: "slug", label: "Slug" },
      { key: "display_order", label: "Display Order" },
      { key: "created_at", label: "Created Date" },
    ],
  },
];

function AdminExportPage() {
  const { user } = useAuth();
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("articles");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [dateRange, setDateRange] = useState<DateRangePreset>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [maxRowsLimit, setMaxRowsLimit] = useState<string>("all");

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number | null } | null>(null);

  // Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Backup Full State
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Selected Dataset Config
  const currentDataset = useMemo(
    () => DATASETS.find((d) => d.id === selectedDatasetId) || DATASETS[0],
    [selectedDatasetId]
  );

  // Live record counts for overview
  const { data: counts, refetch: refetchCounts } = useQuery({
    queryKey: ["admin-export-counts"],
    queryFn: async () => {
      const results: Record<string, number> = {};
      await Promise.all(
        DATASETS.map(async (ds) => {
          try {
            const { count } = await supabase
              .from(ds.table as any)
              .select("id", { count: "exact", head: true });
            results[ds.id] = count ?? 0;
          } catch {
            results[ds.id] = 0;
          }
        })
      );
      return results;
    },
    staleTime: 60_000,
  });

  // Calculate Date bounds for filtering
  const getDateBounds = () => {
    const now = new Date();
    if (dateRange === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { start, end: now.toISOString() };
    }
    if (dateRange === "7d") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { start, end: now.toISOString() };
    }
    if (dateRange === "30d") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { start, end: now.toISOString() };
    }
    if (dateRange === "90d") {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      return { start, end: now.toISOString() };
    }
    if (dateRange === "year") {
      const start = new Date(now.getFullYear(), 0, 1).toISOString();
      return { start, end: now.toISOString() };
    }
    if (dateRange === "custom" && customStartDate) {
      const start = new Date(customStartDate).toISOString();
      const end = customEndDate ? new Date(customEndDate).toISOString() : now.toISOString();
      return { start, end };
    }
    return null;
  };

  // Build query modifier for fetching
  const buildQueryModifier = (ds: DatasetConfig) => {
    return (q: any) => {
      let query = q;

      // Status filter
      if (ds.statusFilterField && statusFilter !== "all") {
        if (ds.statusFilterField === "is_active") {
          query = query.eq("is_active", statusFilter === "true");
        } else {
          query = query.eq(ds.statusFilterField, statusFilter);
        }
      }

      // Date range filter
      if (ds.dateField && dateRange !== "all") {
        const bounds = getDateBounds();
        if (bounds) {
          query = query.gte(ds.dateField, bounds.start).lte(ds.dateField, bounds.end);
        }
      }

      // Sort newest first
      const sortField = ds.dateField || "created_at";
      query = query.order(sortField, { ascending: false });

      return query;
    };
  };

  // Trigger preview of first 5 rows
  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const modifier = buildQueryModifier(currentDataset);
      let q = supabase.from(currentDataset.table as any).select("*").limit(5);
      q = modifier(q);
      const { data, error } = await q;
      if (error) throw error;
      setPreviewData(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load sample data");
      setPreviewData([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Trigger Single Dataset Export
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress({ current: 0, total: null });
    const toastId = toast.loading(`Preparing ${currentDataset.name} export...`);

    try {
      const maxRows = maxRowsLimit === "all" ? undefined : parseInt(maxRowsLimit, 10);
      const modifier = buildQueryModifier(currentDataset);

      const rows = await fetchAllRowsInBatches(
        currentDataset.table,
        modifier,
        1000,
        maxRows,
        (current, total) => {
          setExportProgress({ current, total });
          toast.loading(`Fetching records (${current} retrieved)...`, { id: toastId });
        }
      );

      if (!rows || rows.length === 0) {
        toast.info("No records matched the selected filters.", { id: toastId });
        setIsExporting(false);
        setExportProgress(null);
        return;
      }

      const filename = sanitizeExportFilename(currentDataset.defaultFilename, format);

      if (format === "csv") {
        exportToCsv(filename, rows, currentDataset.columns);
      } else {
        exportToJson(filename, {
          dataset: currentDataset.id,
          exported_at: new Date().toISOString(),
          record_count: rows.length,
          filters: {
            dateRange,
            status: statusFilter,
            maxRows: maxRowsLimit,
          },
          records: rows,
        });
      }

      // Log in audit trail
      if (user?.id) {
        await supabase.from("admin_activity_logs").insert({
          actor_id: user.id,
          action: "export",
          entity: currentDataset.table,
          details: {
            dataset: currentDataset.id,
            format,
            records_count: rows.length,
            filename,
          },
        });
      }

      toast.success(
        `Successfully exported ${rows.length.toLocaleString()} records to ${filename}!`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err.message || "Export failed. Please check connection and try again.", {
        id: toastId,
      });
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // Export Complete System Snapshot (JSON archive of all main collections)
  const handleFullBackup = async () => {
    setIsBackingUp(true);
    const toastId = toast.loading("Generating full system snapshot archive...");

    try {
      const snapshot: Record<string, any> = {
        system: "Newsroom CMS",
        snapshot_generated_at: new Date().toISOString(),
        exported_by: user?.email || "Admin",
        tables: {},
      };

      for (const ds of DATASETS) {
        toast.loading(`Archiving ${ds.name}...`, { id: toastId });
        const rows = await fetchAllRowsInBatches(ds.table, undefined, 1000, 3000);
        snapshot.tables[ds.id] = {
          table_name: ds.table,
          count: rows.length,
          data: rows,
        };
      }

      // Also grab location tables
      const [towns, cities, villages] = await Promise.all([
        supabase.from("towns").select("*"),
        supabase.from("cities").select("*"),
        supabase.from("villages").select("*"),
      ]);

      snapshot.tables.towns = { count: towns.data?.length || 0, data: towns.data || [] };
      snapshot.tables.cities = { count: cities.data?.length || 0, data: cities.data || [] };
      snapshot.tables.villages = { count: villages.data?.length || 0, data: villages.data || [] };

      const filename = sanitizeExportFilename("full_newsroom_snapshot", "json");
      exportToJson(filename, snapshot);

      // Audit log
      if (user?.id) {
        await supabase.from("admin_activity_logs").insert({
          actor_id: user.id,
          action: "full_backup_export",
          entity: "all",
          details: { filename },
        });
      }

      toast.success("Full system backup exported successfully!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Full backup failed", { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Data Export Center</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Export news articles, civic reports, user accounts, ad campaigns, and audit logs to Excel/CSV or JSON format.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCounts()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Counts</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleFullBackup}
            disabled={isBackingUp || isExporting}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs text-xs font-semibold"
          >
            <Archive className="h-4 w-4" />
            <span>{isBackingUp ? "Creating Archive..." : "Full System Backup"}</span>
          </Button>
        </div>
      </div>

      {/* Dataset Selection Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {DATASETS.map((ds) => {
          const isSelected = ds.id === selectedDatasetId;
          const count = counts?.[ds.id];
          const Icon = ds.icon;

          return (
            <button
              key={ds.id}
              type="button"
              onClick={() => {
                setSelectedDatasetId(ds.id);
                setStatusFilter("all");
              }}
              className={`relative flex flex-col text-left p-3.5 rounded-xl border transition-all text-xs ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                  : "border-border/80 bg-card hover:bg-muted/40 hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-start justify-between w-full mb-2">
                <span className={`p-2 rounded-lg border ${ds.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </div>

              <div className="font-semibold text-foreground truncate">{ds.name}</div>
              <div className="text-[11px] text-muted-foreground font-serif">{ds.nameHi}</div>

              <div className="mt-2.5 flex items-baseline justify-between pt-2 border-t border-border/40">
                <span className="text-[11px] text-muted-foreground">Total Records:</span>
                <span className="font-mono font-bold text-foreground">
                  {count !== undefined ? count.toLocaleString() : "..."}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Export Configuration Workspace */}
      <Card className="border-border shadow-xs">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`p-2.5 rounded-xl border ${currentDataset.color}`}>
                <currentDataset.icon className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>Export: {currentDataset.name}</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    table: {currentDataset.table}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {currentDataset.description}
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              className="gap-1.5 text-xs shrink-0"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview Sample Data</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Format Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                <span>Export Format</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("csv")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                    format === "csv"
                      ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold ring-1 ring-emerald-500/40"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <FileSpreadsheet className="h-5 w-5 mb-1 text-emerald-600" />
                  <span>CSV (Excel)</span>
                  <span className="text-[10px] text-muted-foreground/80 mt-0.5 font-normal">
                    UTF-8 BOM (Hindi OK)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("json")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                    format === "json"
                      ? "border-blue-600 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold ring-1 ring-blue-500/40"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <FileJson className="h-5 w-5 mb-1 text-blue-600" />
                  <span>JSON File</span>
                  <span className="text-[10px] text-muted-foreground/80 mt-0.5 font-normal">
                    Full Raw Objects
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Date Range Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Date Range ({currentDataset.dateField || "Created Date"})</span>
              </Label>
              <Select value={dateRange} onValueChange={(val: DateRangePreset) => setDateRange(val)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time (Entire Database)</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="year">This Calendar Year</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>

              {dateRange === "custom" && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-muted-foreground">From:</span>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">To:</span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Status Filter (if applicable) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-primary" />
                <span>Status Scope</span>
              </Label>
              {currentDataset.statusOptions ? (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentDataset.statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 px-3 border rounded-md flex items-center text-xs text-muted-foreground bg-muted/20">
                  All Records Included
                </div>
              )}
            </div>

            {/* 4. Maximum Rows Limit */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Max Rows Limit</span>
              </Label>
              <Select value={maxRowsLimit} onValueChange={setMaxRowsLimit}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Row limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records (No limit, auto-batched)</SelectItem>
                  <SelectItem value="500">First 500 Records</SelectItem>
                  <SelectItem value="1000">First 1,000 Records</SelectItem>
                  <SelectItem value="5000">First 5,000 Records</SelectItem>
                  <SelectItem value="10000">First 10,000 Records</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Fields Included Summary */}
          <div className="rounded-lg border bg-muted/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Included Columns in Export ({currentDataset.columns.length})</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {currentDataset.columns.map((c) => c.key).join(", ")}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentDataset.columns.map((col) => (
                <Badge
                  key={col.key}
                  variant="secondary"
                  className="text-[11px] font-normal px-2 py-0.5 bg-background border"
                >
                  {col.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Encoding Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
            <div>
              <span className="font-semibold">Microsoft Excel & Hindi Unicode Support:</span> CSV
              exports automatically include the standard UTF-8 Byte Order Mark (<code className="text-[11px] font-mono bg-blue-500/10 px-1 py-0.5 rounded">\uFEFF</code>).
              This guarantees that Hindi (Devanagari) script, regional locations, and special characters will open cleanly in Excel without garbled text or encoding artifacts.
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t bg-muted/10 py-4">
          <div className="text-xs text-muted-foreground">
            {exportProgress ? (
              <span className="flex items-center gap-2 font-medium text-primary">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Fetching records: {exportProgress.current.toLocaleString()}{" "}
                {exportProgress.total ? `/ ${exportProgress.total.toLocaleString()}` : "..."}
              </span>
            ) : (
              <span>
                Target file: <code className="font-mono text-foreground font-semibold">{sanitizeExportFilename(currentDataset.defaultFilename, format)}</code>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreview}
              className="w-full sm:w-auto text-xs"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Preview First 5 Rows
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full sm:w-auto gap-2 text-xs font-semibold shadow-xs"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download {format.toUpperCase()}</span>
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Preview Sample Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" />
              <span>Sample Data Preview ({currentDataset.name})</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              First 5 rows matching the selected filters. This allows you to verify column values and Hindi text encoding.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-md my-2">
            {previewLoading ? (
              <div className="flex items-center justify-center p-12 text-xs text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Loading preview records...
              </div>
            ) : previewData.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No records found matching current criteria.
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    {currentDataset.columns.slice(0, 7).map((col) => (
                      <TableHead key={col.key} className="whitespace-nowrap font-semibold">
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, idx) => (
                    <TableRow key={row.id || idx}>
                      {currentDataset.columns.slice(0, 7).map((col) => {
                        let val = row[col.key];
                        if (col.transform) val = col.transform(val, row);
                        return (
                          <TableCell key={col.key} className="max-w-[200px] truncate">
                            {val !== null && val !== undefined ? String(val) : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-muted-foreground">
              Showing sample of 7 columns out of {currentDataset.columns.length} total export columns.
            </span>
            <Button size="sm" onClick={() => setPreviewOpen(false)} className="text-xs">
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
