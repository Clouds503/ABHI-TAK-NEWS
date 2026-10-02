import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Bell, Clapperboard, Home, Menu, Megaphone, PlayCircle, Radio, MapPin, Newspaper, Bookmark, FileText, Info, Shield, LogIn, LogOut, Moon, Sun, Languages, Phone, MessageCircle, Search, X, CalendarDays } from "lucide-react";

export const CONTACT_PHONE = "+91-8445829007";
export const WHATSAPP_URL = "https://wa.me/918445829007";
export const YOUTUBE_CHANNEL = "https://www.youtube.com/@AbhitakNewsChannel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import logo from "@/assets/abhi-tak-logo-256.webp.asset.json";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { articlesQuery, townsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="Abhi Tak"
      width={48}
      height={48}
      decoding="sync"
      fetchPriority="high"
      onError={(e) => {
        e.currentTarget.src = "/pwa-192.png";
      }}
      className={cn("rounded-[6px] object-contain", className)}
    />
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { lang, pick } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { data: articles } = useQuery({ ...articlesQuery(), enabled: searchOpen });
  const results = term.trim().length > 1
    ? articles?.filter((article) => `${article.title_hi} ${article.title_en ?? ""}`.toLocaleLowerCase().includes(term.trim().toLocaleLowerCase())).slice(0, 5)
    : [];
  return (
    <header className="sticky top-0 z-40 border-b bg-background pt-safe">
      <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3">
        <Button onClick={onMenu} aria-label="Menu" variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          <Menu className="h-5 w-5" />
        </Button>
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <Logo className="h-9 w-9 shrink-0" />
          <div className="min-w-0 leading-none">
            <div className="truncate font-serif text-lg font-bold">{lang === "en" ? "Abhi Tak" : "अभी तक"}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3 w-3 text-primary" /> {lang === "en" ? "District Bijnor" : "जनपद बिजनौर"}
            </div>
          </div>
        </Link>
        <div className="flex items-center">
          <Button onClick={() => setSearchOpen((value) => !value)} aria-label={lang === "en" ? "Search" : "खोजें"} variant="ghost" size="icon" className="h-10 w-10 rounded-full">
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>
          <Button aria-label="Notifications" variant="ghost" size="icon" className="h-10 w-10 rounded-full">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {searchOpen && (
        <div className="border-t bg-background p-2 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder={lang === "en" ? "Search Bijnor news" : "बिजनौर की खबरें खोजें"} className="h-11 rounded-md bg-card pl-9 shadow-none focus-visible:ring-1" />
          </div>
          {results && results.length > 0 && (
            <div className="mt-1 divide-y">
              {results.map((article) => (
                <Link key={article.id} to="/news/$slug" params={{ slug: article.slug }} onClick={() => { setSearchOpen(false); setTerm(""); }} className="block px-3 py-3 text-[15px] font-semibold leading-snug active:bg-muted">
                  {pick(article.title_hi, article.title_en)}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

function BottomNav() {
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/", label: t("home"), icon: Home, match: (p: string) => p === "/" || p.startsWith("/news") || p.startsWith("/town") },
    { to: "/videos", label: t("videos"), icon: PlayCircle, match: (p: string) => p.startsWith("/videos") },
    { to: "/reels", label: t("reels"), icon: Clapperboard, match: (p: string) => p.startsWith("/reels") },
    { to: "/live", label: t("live"), icon: Radio, match: (p: string) => p.startsWith("/live") },
    { to: "/jan-ki-awaaz", label: t("jka"), icon: Megaphone, match: (p: string) => p.startsWith("/jan-ki-awaaz") },
  ] as const;
  return (
    <nav className="bottom-safe fixed left-1/2 z-40 w-[calc(100%-1rem)] max-w-[30rem] -translate-x-1/2">
      <div className="grid grid-cols-5 gap-1">
        {items.map((it) => {
          const active = it.match(path);
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} className={cn("liquid-nav-button relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-[1.1rem] text-[11px] font-semibold transition-colors active:opacity-90", active ? "text-primary" : "text-muted-foreground")}> 
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.8} />
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SideMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, pick, lang, setLang } = useI18n();
  const { user, isStaff } = useAuth();
  const { data: towns } = useQuery(townsQuery);
  const close = () => onOpenChange(false);
  const toggleDark = () => {
    const d = document.documentElement.classList.toggle("dark");
    localStorage.setItem("abhitak.theme", d ? "dark" : "light");
  };
  const row = "flex h-11 items-center gap-3 px-5 text-[15px] text-foreground hover:bg-muted";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[86%] max-w-sm overflow-y-auto p-0 text-foreground">
        <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
        <div className="flex items-center gap-3 border-b px-5 pb-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
          <Logo className="h-12 w-12" />
          <div className="min-w-0">
            <div className="font-serif text-xl font-bold">{lang === "en" ? "Abhi Tak" : "अभी तक"}</div>
            <div className="truncate text-xs text-muted-foreground">{user ? user.email : lang === "en" ? "Your news network" : "आपका समाचार नेटवर्क"}</div>
          </div>
        </div>

        <div className="py-2">
          <div className="px-5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-widest text-primary">{t("districtNews")}</div>
          <div className="grid grid-cols-2 px-3">
            {towns?.map((tw) => (
              <Link key={tw.id} to="/town/$slug" params={{ slug: tw.slug }} onClick={close} className="rounded px-2 py-2 text-[15px] hover:bg-muted">
                {pick(tw.name_hi, tw.name_en)}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t py-2">
          <Link to="/epaper" onClick={close} className={row}><Newspaper className="h-4 w-4" />{t("epaper")}</Link>
          <Link to="/videos" onClick={close} className={row}><PlayCircle className="h-4 w-4" />{t("videoGalaxy")}</Link>
          <Link to="/live" onClick={close} className={row}><Radio className="h-4 w-4" />{t("live")}</Link>
          <Link to="/jan-ki-awaaz" onClick={close} className={row}><Megaphone className="h-4 w-4" />{t("jka")}</Link>
          <Link to="/events" onClick={close} className={row}><CalendarDays className="h-4 w-4" />{lang === "en" ? "Updates & Events" : "अपडेट और कार्यक्रम"}</Link>
          <Link to="/saved" onClick={close} className={row}><Bookmark className="h-4 w-4" />{t("saved")}</Link>
          <Link to="/my-issues" onClick={close} className={row}><FileText className="h-4 w-4" />{t("myIssues")}</Link>
          {isStaff && <Link to="/admin" onClick={close} className={cn(row, "text-primary")}><Shield className="h-4 w-4" />{t("admin")}</Link>}
        </div>

        <div className="border-t px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">{lang === "en" ? "Contact us" : "संपर्क करें"}</div>
          <a href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`} className="mt-2 flex h-11 items-center gap-3 rounded-md border bg-card px-3 text-[15px]">
            <Phone className="h-4 w-4 text-primary" /> {CONTACT_PHONE}
          </a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-whatsapp px-3 text-[15px] font-semibold text-primary-foreground active:opacity-90">
            <MessageCircle className="h-4 w-4" /> {lang === "en" ? "Chat on WhatsApp" : "व्हाट्सऐप पर बात करें"}
          </a>
        </div>

        <div className="border-t py-2">
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className={cn(row, "w-full")}>
            <Languages className="h-4 w-4" />{t("language")}: <span className="ml-auto text-sm text-muted-foreground">{lang === "en" ? "English" : "हिन्दी"}</span>
          </button>
          <button onClick={toggleDark} className={cn(row, "w-full")}><Moon className="h-4 w-4 dark:hidden" /><Sun className="hidden h-4 w-4 dark:block" />{t("appearance")}</button>
          <Link to="/about" onClick={close} className={row}><Info className="h-4 w-4" />{t("about")}</Link>
          {user ? (
            <button onClick={async () => { await supabase.auth.signOut(); close(); }} className={cn(row, "w-full")}><LogOut className="h-4 w-4" />{t("signOut")}</button>
          ) : (
            <Link to="/auth" onClick={close} className={row}><LogIn className="h-4 w-4" />{t("signIn")}</Link>
          )}
        </div>
        <div className="px-5 pb-8 pt-2 text-[11px] text-muted-foreground">© Abhi Tak · District Bijnor, U.P.</div>
      </SheetContent>
    </Sheet>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const isReels = path === "/reels";

  if (isReels) {
    return <div className="mx-auto h-[100dvh] max-w-lg overflow-hidden bg-foreground">{children}</div>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background shadow-[0_0_0_1px_var(--color-border)]">
      <Header onMenu={() => setOpen(true)} />
      <main className="pb-28">{children}</main>
      <BottomNav />
      <SideMenu open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function SectionHead({ title, to, action }: { title: string; to?: string; action?: string }) {
  return (
    <div className="flex items-end justify-between px-4 pb-3 pt-7">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <span className="h-5 w-1 bg-primary" />
        {title}
      </h2>
      {to && action && (
        <Link to={to} className="text-sm font-medium text-primary">{action} →</Link>
      )}
    </div>
  );
}
