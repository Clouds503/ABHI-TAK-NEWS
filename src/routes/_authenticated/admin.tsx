import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Megaphone, Newspaper, ArrowLeft, BadgeIndianRupee, ShieldAlert, Users, Clapperboard, CalendarDays, MapPin, Building2, Sprout, FolderTree } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Abhi Tak CMS" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/moderation", label: "Jan Ki Awaaz", icon: Megaphone },
  { to: "/admin/articles", label: "News", icon: Newspaper },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/towns", label: "Towns", icon: MapPin },
  { to: "/admin/cities", label: "Cities", icon: Building2 },
  { to: "/admin/villages", label: "Villages", icon: Sprout },
  { to: "/admin/ads", label: "Ads & Promotions", icon: BadgeIndianRupee },
  { to: "/admin/reels", label: "Reels", icon: Clapperboard },
  { to: "/admin/events", label: "Events & Updates", icon: CalendarDays },
  { to: "/admin/users", label: "Users", icon: Users },
] as const;


function AdminLayout() {
  const { isStaff, loading } = useAuth();
  if (loading) return null;
  if (!isStaff)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-xl font-bold">Staff access only</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your account doesn't have a newsroom role yet.</p>
          <Link to="/" className="mt-4 inline-block text-primary">← Back to app</Link>
        </div>
      </div>
    );
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:min-h-screen md:border-b-0">
        <div className="flex items-center gap-3 p-4">
          <Logo className="h-9 w-9" />
          <div className="font-serif text-lg font-bold">Abhi Tak CMS</div>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }} className="flex h-10 shrink-0 items-center gap-3 rounded px-3 text-sm hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
          <Link to="/" className="flex h-10 shrink-0 items-center gap-3 rounded px-3 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent"><ArrowLeft className="h-4 w-4" /> Public app</Link>
        </nav>
      </aside>
      <main className="min-w-0 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
