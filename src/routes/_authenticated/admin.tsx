import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Megaphone,
  Newspaper,
  ArrowLeft,
  BadgeIndianRupee,
  ShieldAlert,
  Users,
  Clapperboard,
  CalendarDays,
  MapPin,
  Building2,
  FolderTree,
  BarChart3,
  Download,
  Settings,
  LogOut,
  PenTool,
  Mic,
  Shield,
  Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/AppShell";
import { useSiteSettings } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_CONFIG, type AppRole } from "@/lib/admin-users";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Newsroom CMS" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const {
    user,
    profile,
    isStaff,
    isAdmin,
    isEditor,
    isModerator,
    isReporter,
    primaryRole,
    loading,
  } = useAuth();
  const { settings } = useSiteSettings();
  const location = useLocation();

  if (loading) return null;
  if (!isStaff)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-xl font-bold">Staff access only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account doesn't have an active newsroom role yet. Contact the editor or administrator.
          </p>
          <Link to="/" className="mt-4 inline-block text-primary">
            ← Back to public app
          </Link>
        </div>
      </div>
    );

  // Role-specific navigation groups
  const desks = [
    ...(isAdmin ? [{ to: "/admin", label: "Admin Panel", icon: LayoutDashboard, exact: true }] : []),
    ...(isEditor ? [{ to: "/admin/editor", label: "Editorial Desk", icon: PenTool }] : []),
    ...(isModerator ? [{ to: "/admin/moderator", label: "Moderation Desk", icon: Megaphone }] : []),
    ...(isReporter ? [{ to: "/admin/reporter", label: "Reporter Desk", icon: Mic }] : []),
  ];

  const contentItems = [
    ...(isEditor || isAdmin
      ? [
          { to: "/admin/articles", label: "News Stories", icon: Newspaper },
          { to: "/admin/reels", label: "Video Reels", icon: Clapperboard },
          { to: "/admin/events", label: "Events & Updates", icon: CalendarDays },
        ]
      : []),
    ...(isModerator || isAdmin
      ? [{ to: "/admin/moderation", label: "Jan Ki Awaaz Queue", icon: Megaphone }]
      : []),
  ];

  const adminItems = isAdmin
    ? [
        { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { to: "/admin/export", label: "Export Data", icon: Download },
        { to: "/admin/settings", label: "Site Identity & Logo", icon: Settings },
        { to: "/admin/users", label: "Users & Staff Roles", icon: Users },
        { to: "/admin/ads", label: "Ads & Promotions", icon: BadgeIndianRupee },
        { to: "/admin/categories", label: "Categories", icon: FolderTree },
        { to: "/admin/cities", label: "Cities & Towns", icon: Building2 },
      ]
    : [];

  const roleMeta = ROLE_CONFIG[primaryRole as AppRole] || ROLE_CONFIG.user;

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:min-h-screen md:border-b-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 p-4 border-b border-sidebar-border/60">
            <Logo className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <div className="truncate font-serif text-base font-bold leading-tight">
                {settings?.site_title || "News"} CMS
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span className="text-[11px] text-muted-foreground capitalize font-medium truncate">
                  {roleMeta.label}
                </span>
              </div>
            </div>
          </div>

          <nav className="no-scrollbar flex gap-1 overflow-x-auto p-2 md:flex-col space-y-3">
            {/* Dedicated Role Desks */}
            <div>
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 hidden md:block">
                Role Workspaces
              </div>
              <div className="flex gap-1 md:flex-col">
                {desks.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    activeOptions={{ exact: "exact" in n ? n.exact : false }}
                    className="flex h-9 shrink-0 items-center gap-2.5 rounded-md px-3 text-xs font-semibold hover:bg-sidebar-accent transition-colors"
                    activeProps={{
                      className:
                        "bg-sidebar-primary text-sidebar-primary-foreground font-bold hover:bg-sidebar-primary shadow-xs",
                    }}
                  >
                    <n.icon className="h-4 w-4 shrink-0" /> {n.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Content Desk Tools */}
            {contentItems.length > 0 && (
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 hidden md:block">
                  Content Management
                </div>
                <div className="flex gap-1 md:flex-col">
                  {contentItems.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      className="flex h-9 shrink-0 items-center gap-2.5 rounded-md px-3 text-xs font-medium hover:bg-sidebar-accent transition-colors"
                      activeProps={{
                        className:
                          "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
                      }}
                    >
                      <n.icon className="h-4 w-4 shrink-0" /> {n.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Management Tools */}
            {adminItems.length > 0 && (
              <div>
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 hidden md:block">
                  Administration
                </div>
                <div className="flex gap-1 md:flex-col">
                  {adminItems.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      className="flex h-9 shrink-0 items-center gap-2.5 rounded-md px-3 text-xs font-medium hover:bg-sidebar-accent transition-colors"
                      activeProps={{
                        className:
                          "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
                      }}
                    >
                      <n.icon className="h-4 w-4 shrink-0" /> {n.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-sidebar-border/60 hidden md:block">
          <Link
            to="/"
            className="flex h-9 items-center gap-2 rounded-md px-3 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Public news app
          </Link>
        </div>
      </aside>

      <div className="flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/95 px-4 backdrop-blur-sm md:px-8">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
            <span className="font-serif text-sm font-semibold text-muted-foreground hidden sm:inline">
              Workspace:
            </span>

            {/* Quick Panel Switcher Pills for multi-role or admin users */}
            {desks.length > 1 && (
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border">
                {desks.map((d) => {
                  const isActive = location.pathname === d.to;
                  return (
                    <Link
                      key={d.to}
                      to={d.to}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        isActive
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <d.icon className="h-3.5 w-3.5" />
                      <span>{d.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Signed in as:</span>
              <span className="font-semibold text-foreground truncate max-w-[140px]">
                {profile?.full_name || user?.email}
              </span>
              <Badge variant="outline" className={`text-[10px] ${roleMeta.colorClasses}`}>
                {roleMeta.label}
              </Badge>
            </div>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Link to="/">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exit to Normal App</span>
                <span className="sm:hidden">Exit</span>
              </Link>
            </Button>
          </div>
        </header>

        <main className="min-w-0 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
