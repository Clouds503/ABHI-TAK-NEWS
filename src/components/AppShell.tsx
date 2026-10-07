import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";
import {
  Bell,
  Clapperboard,
  Home,
  Loader2,
  Menu,
  Megaphone,
  PlayCircle,
  Radio,
  MapPin,
  Newspaper,
  Bookmark,
  FileText,
  Info,
  Shield,
  LogIn,
  LogOut,
  Moon,
  Sun,
  Languages,
  Phone,
  MessageCircle,
  Search,
  X,
  CalendarDays,
  SlidersHorizontal,
  ChevronDown,
  User,
} from "lucide-react";

export const CONTACT_PHONE = "+91-8445829007";
export const WHATSAPP_URL = "https://wa.me/918445829007";
export const YOUTUBE_CHANNEL = "https://www.youtube.com/@AbhitakNewsChannel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { townsQuery, citiesQuery, villagesQuery, categoriesQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/pwa-192.png"
      alt="Abhi Tak"
      width={48}
      height={48}
      decoding="sync"
      fetchPriority="high"
      className={cn("rounded-[6px] object-contain", className)}
    />
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { lang, pick } = useI18n();
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedVillage, setSelectedVillage] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const { data: cities } = useQuery(citiesQuery);
  const { data: villages } = useQuery(villagesQuery());

  // Close search on Escape key
  useEffect(() => {
    if (!searchOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setTerm("");
        setDebouncedTerm("");
        setSelectedCity("");
        setSelectedVillage("");
        setFilterOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  // 300 ms debounce — avoids a Supabase round-trip on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["search", debouncedTerm, selectedCity, selectedVillage],
    queryFn: async () => {
      if (debouncedTerm.length < 2) return [];
      let q = supabase
        .from("articles")
        .select(
          "id, slug, title_hi, title_en, town:towns(name_hi, name_en), category:categories(name_hi, name_en)",
        )
        .eq("status", "published")
        .or(`title_hi.ilike.%${debouncedTerm}%,title_en.ilike.%${debouncedTerm}%`)
        .order("published_at", { ascending: false })
        .limit(8);
      if (selectedCity) q = q.eq("city_id", selectedCity);
      if (selectedVillage) q = q.eq("village_id", selectedVillage);
      const { data } = await q;
      return (data ?? []) as {
        id: string;
        slug: string;
        title_hi: string;
        title_en: string | null;
        town: { name_hi: string; name_en: string } | null;
        category: { name_hi: string; name_en: string } | null;
      }[];
    },
    enabled: searchOpen && debouncedTerm.length >= 2,
    staleTime: 30_000,
  });

  const close = () => {
    setSearchOpen(false);
    setTerm("");
    setDebouncedTerm("");
    setSelectedCity("");
    setSelectedVillage("");
    setFilterOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background pt-safe lg:hidden">
      <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3">
        <Button
          onClick={onMenu}
          aria-label="Menu"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <Logo className="h-9 w-9 shrink-0" />
          <div className="min-w-0 leading-none">
            <div className="truncate font-serif text-lg font-bold">
              {lang === "en" ? "Abhi Tak" : "अभी तक"}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3 w-3 text-primary" />{" "}
              {lang === "en" ? "District Bijnor" : "जनपद बिजनौर"}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={lang === "en" ? "Search" : "खोजें"}
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>
          {!user ? (
            <Button
              asChild
              size="sm"
              className="h-8 shrink-0 rounded-full px-3 text-xs font-semibold shadow-sm"
            >
              <Link to="/auth" search={{ redirect: path }}>
                <LogIn className="mr-1 h-3.5 w-3.5" />
                {lang === "en" ? "Sign In" : "लॉग इन"}
              </Link>
            </Button>
          ) : (
            <Button
              aria-label="Notifications"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
            >
              <Bell className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className="border-t bg-background p-2.5 shadow-lg">
          {/* Search input with filter button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              {isFetching ? (
                <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : (
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <Input
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={lang === "en" ? "Search news" : "खबरें खोजें"}
                className="h-11 rounded-md bg-card pl-9 pr-8 shadow-none focus-visible:ring-1"
              />
              {term && (
                <button
                  type="button"
                  onClick={() => setTerm("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter button inside the search bar */}
            <Button
              type="button"
              variant={filterOpen || selectedCity || selectedVillage ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(
                "h-11 shrink-0 gap-1.5 rounded-md px-3 text-xs font-semibold shadow-xs",
                (selectedCity || selectedVillage) && !filterOpen
                  ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                  : "",
              )}
              aria-label={lang === "en" ? "Filter search" : "खोज फ़िल्टर करें"}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{lang === "en" ? "Filter" : "फ़िल्टर"}</span>
              {(selectedCity || selectedVillage) && (
                <span className="flex h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>

          {/* City & Village filter dropdowns */}
          {(filterOpen || selectedCity || selectedVillage) && (
            <div className="mt-2 rounded-md border border-border/60 bg-muted/30 p-2.5">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {lang === "en" ? "Filter by Location" : "स्थान अनुसार फ़िल्टर"}
                </span>
                {(selectedCity || selectedVillage) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity("");
                      setSelectedVillage("");
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    {lang === "en" ? "Reset" : "रीसेट"}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{lang === "en" ? "All Cities" : "सभी शहर"}</option>
                  {cities?.map((city) => (
                    <option key={city.id} value={city.id}>
                      {pick(city.name_hi, city.name_en)}
                    </option>
                  ))}
                </select>
                {villages && villages.length > 0 && (
                  <select
                    value={selectedVillage}
                    onChange={(e) => setSelectedVillage(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">{lang === "en" ? "All Villages" : "सभी गांव"}</option>
                    {villages?.map((village) => (
                      <option key={village.id} value={village.id}>
                        {pick(village.name_hi, village.name_en)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {debouncedTerm.length >= 2 && !isFetching && results?.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {lang === "en" ? "No results found" : "कोई परिणाम नहीं मिला"}
            </p>
          )}

          {/* Results */}
          {results && results.length > 0 && (
            <div className="mt-1 divide-y rounded-md border">
              {results.map((article) => (
                <Link
                  key={article.id}
                  to="/news/$slug"
                  params={{ slug: article.slug }}
                  onClick={close}
                  className="flex flex-col px-3 py-2.5 active:bg-muted"
                >
                  <span className="text-[15px] font-semibold leading-snug">
                    {pick(article.title_hi, article.title_en)}
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      article.category && pick(article.category.name_hi, article.category.name_en),
                      article.town && pick(article.town.name_hi, article.town.name_en),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
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
    {
      to: "/",
      label: t("home"),
      icon: Home,
      match: (p: string) => p === "/" || p.startsWith("/news") || p.startsWith("/town"),
    },
    {
      to: "/videos",
      label: t("videos"),
      icon: PlayCircle,
      match: (p: string) => p.startsWith("/videos"),
    },
    {
      to: "/reels",
      label: t("reels"),
      icon: Clapperboard,
      match: (p: string) => p.startsWith("/reels"),
    },
    { to: "/live", label: t("live"), icon: Radio, match: (p: string) => p.startsWith("/live") },
    {
      to: "/jan-ki-awaaz",
      label: t("jka"),
      icon: Megaphone,
      match: (p: string) => p.startsWith("/jan-ki-awaaz"),
    },
  ] as const;
  return (
    <nav className="bottom-safe fixed left-1/2 z-40 w-[calc(100%-1rem)] max-w-[30rem] -translate-x-1/2 lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((it) => {
          const active = it.match(path);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "liquid-nav-button relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-[1.1rem] text-[11px] font-semibold transition-colors active:opacity-90",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
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
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: towns } = useQuery(townsQuery);
  const { data: categories } = useQuery(categoriesQuery);
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
            <div className="font-serif text-xl font-bold">
              {lang === "en" ? "Abhi Tak" : "अभी तक"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {user ? user.email : lang === "en" ? "Your news network" : "आपका समाचार नेटवर्क"}
            </div>
          </div>
        </div>

        {!user && (
          <div className="mx-4 my-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground">
              {lang === "en" ? "Welcome to Abhi Tak" : "अभी तक में आपका स्वागत है"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "en"
                ? "Sign in to raise public issues, bookmark news and more."
                : "जन की आवाज़ उठाने, खबरें सहेजने और अधिक के लिए साइन इन करें।"}
            </p>
            <Button asChild size="sm" className="mt-3 w-full font-semibold">
              <Link to="/auth" search={{ redirect: path }} onClick={close}>
                <LogIn className="mr-1.5 h-4 w-4" />
                {lang === "en" ? "Sign In / Sign Up" : "साइन इन / साइन अप करें"}
              </Link>
            </Button>
          </div>
        )}

        <div className="py-2">
          <div className="px-5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-widest text-primary">
            {t("districtNews")}
          </div>
          <div className="grid grid-cols-2 px-3">
            {towns?.map((tw) => (
              <Link
                key={tw.id}
                to="/town/$slug"
                params={{ slug: tw.slug }}
                onClick={close}
                className="rounded px-2 py-2 text-[15px] hover:bg-muted"
              >
                {pick(tw.name_hi, tw.name_en)}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t py-2">
          <div className="px-5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-widest text-primary">
            {lang === "en" ? "Categories" : "श्रेणियाँ"}
          </div>
          <div className="grid grid-cols-2 px-3">
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                to="/news"
                search={{ category: cat.slug }}
                onClick={close}
                className="rounded px-2 py-2 text-[15px] hover:bg-muted"
              >
                {pick(cat.name_hi, cat.name_en)}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t py-2">
          <Link to="/news" onClick={close} className={row}>
            <Newspaper className="h-4 w-4" />
            {lang === "en" ? "All News" : "सभी ख़बरें"}
          </Link>
          <Link to="/epaper" onClick={close} className={row}>
            <Newspaper className="h-4 w-4" />
            {t("epaper")}
          </Link>
          <Link to="/videos" onClick={close} className={row}>
            <PlayCircle className="h-4 w-4" />
            {t("videoGalaxy")}
          </Link>
          <Link to="/reels" onClick={close} className={row}>
            <Clapperboard className="h-4 w-4" />
            {t("reels")}
          </Link>
          <Link to="/live" onClick={close} className={row}>
            <Radio className="h-4 w-4" />
            {t("live")}
          </Link>
          <Link to="/jan-ki-awaaz" onClick={close} className={row}>
            <Megaphone className="h-4 w-4" />
            {t("jka")}
          </Link>
          <Link to="/events" onClick={close} className={row}>
            <CalendarDays className="h-4 w-4" />
            {lang === "en" ? "Updates & Events" : "अपडेट और कार्यक्रम"}
          </Link>
          <Link to="/saved" onClick={close} className={row}>
            <Bookmark className="h-4 w-4" />
            {t("saved")}
          </Link>
          <Link to="/my-issues" onClick={close} className={row}>
            <FileText className="h-4 w-4" />
            {t("myIssues")}
          </Link>
          {isStaff && (
            <Link to="/admin" onClick={close} className={cn(row, "text-primary")}>
              <Shield className="h-4 w-4" />
              {t("admin")}
            </Link>
          )}
        </div>

        <div className="border-t px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            {lang === "en" ? "Contact us" : "संपर्क करें"}
          </div>
          <a
            href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`}
            className="mt-2 flex h-11 items-center gap-3 rounded-md border bg-card px-3 text-[15px]"
          >
            <Phone className="h-4 w-4 text-primary" /> {CONTACT_PHONE}
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-whatsapp px-3 text-[15px] font-semibold text-primary-foreground active:opacity-90"
          >
            <MessageCircle className="h-4 w-4" />{" "}
            {lang === "en" ? "Chat on WhatsApp" : "व्हाट्सऐप पर बात करें"}
          </a>
        </div>

        <div className="border-t py-2">
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className={cn(row, "w-full")}
          >
            <Languages className="h-4 w-4" />
            {t("language")}:{" "}
            <span className="ml-auto text-sm text-muted-foreground">
              {lang === "en" ? "English" : "हिन्दी"}
            </span>
          </button>
          <button onClick={toggleDark} className={cn(row, "w-full")}>
            <Moon className="h-4 w-4 dark:hidden" />
            <Sun className="hidden h-4 w-4 dark:block" />
            {t("appearance")}
          </button>
          <Link to="/about" onClick={close} className={row}>
            <Info className="h-4 w-4" />
            {t("about")}
          </Link>
          <Link to="/privacy" onClick={close} className={row}>
            <Shield className="h-4 w-4" />
            {t("privacy")}
          </Link>
          {user ? (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                close();
              }}
              className={cn(row, "w-full")}
            >
              <LogOut className="h-4 w-4" />
              {t("signOut")}
            </button>
          ) : (
            <Link
              to="/auth"
              search={{ redirect: path }}
              onClick={close}
              className={cn(row, "font-medium text-primary")}
            >
              <LogIn className="h-4 w-4 text-primary" />
              {lang === "en" ? "Sign In / Sign Up" : "लॉग इन / साइन अप"}
            </Link>
          )}
        </div>
        <div className="px-5 pb-8 pt-2 text-[11px] text-muted-foreground">
          © Abhi Tak · District Bijnor, U.P.
        </div>
      </SheetContent>
    </Sheet>
  );
}

function WeatherWidget() {
  const { lang } = useI18n();
  const { data: temp } = useQuery({
    queryKey: ["bijnor-weather"],
    queryFn: async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=29.37&longitude=78.13&current=temperature_2m,weather_code",
        );
        if (!res.ok) return null;
        const data = await res.json();
        return typeof data?.current?.temperature_2m === "number"
          ? `${Math.round(data.current.temperature_2m)}°C`
          : null;
      } catch {
        return null;
      }
    },
    staleTime: 15 * 60 * 1000,
  });

  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span>{lang === "en" ? "Bijnor" : "बिजनौर"}</span>
      <span className="font-semibold text-foreground">{temp ?? "28°C"}</span>
      <span aria-hidden="true">☀️</span>
    </span>
  );
}

function DesktopHeader() {
  const { lang, setLang, t, pick } = useI18n();
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: towns } = useQuery(townsQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const { data: cities } = useQuery(citiesQuery);

  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ["desktop-search", debouncedTerm, selectedCity],
    queryFn: async () => {
      if (debouncedTerm.length < 2) return [];
      let q = supabase
        .from("articles")
        .select(
          "id, slug, title_hi, title_en, town:towns(name_hi, name_en), category:categories(name_hi, name_en)",
        )
        .eq("status", "published")
        .or(`title_hi.ilike.%${debouncedTerm}%,title_en.ilike.%${debouncedTerm}%`)
        .order("published_at", { ascending: false })
        .limit(6);
      if (selectedCity) q = q.eq("city_id", selectedCity);
      const { data } = await q;
      return data ?? [];
    },
    enabled: debouncedTerm.length >= 2,
    staleTime: 30_000,
  });

  const toggleTheme = () => {
    const d = document.documentElement.classList.toggle("dark");
    localStorage.setItem("abhitak.theme", d ? "dark" : "light");
  };

  const todayDate = new Date().toLocaleDateString(lang === "en" ? "en-IN" : "hi-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const navLinks = [
    { to: "/", label: t("home"), icon: Home, match: (p: string) => p === "/" },
    {
      to: "/news",
      label: lang === "en" ? "Latest News" : "ताज़ा ख़बरें",
      icon: Newspaper,
      match: (p: string) => p.startsWith("/news"),
    },
    {
      to: "/videos",
      label: t("videoGalaxy"),
      icon: PlayCircle,
      match: (p: string) => p.startsWith("/videos"),
    },
    {
      to: "/reels",
      label: t("reels"),
      icon: Clapperboard,
      match: (p: string) => p.startsWith("/reels"),
    },
    {
      to: "/jan-ki-awaaz",
      label: t("jka"),
      icon: Megaphone,
      match: (p: string) => p.startsWith("/jan-ki-awaaz"),
    },
    {
      to: "/live",
      label: t("live"),
      icon: Radio,
      badge: true,
      match: (p: string) => p.startsWith("/live"),
    },
    {
      to: "/epaper",
      label: t("epaper"),
      icon: Newspaper,
      match: (p: string) => p.startsWith("/epaper"),
    },
    {
      to: "/events",
      label: lang === "en" ? "Events" : "कार्यक्रम",
      icon: CalendarDays,
      match: (p: string) => p.startsWith("/events"),
    },
  ];

  return (
    <>
      <header className="hidden lg:block w-full bg-background border-b select-none">
        {/* 1. Utility TopBar */}
        <div className="w-full border-b bg-muted/30 text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between">
            {/* Left: Date, Weather, District tagline */}
            <div className="flex items-center gap-4">
              <span className="font-medium text-foreground/80">{todayDate}</span>
              <span className="h-3 w-px bg-border" />
              <WeatherWidget />
              <span className="h-3 w-px bg-border" />
              <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                <MapPin className="h-3.5 w-3.5" />
                {lang === "en" ? "District Bijnor Digital Network" : "जनपद बिजनौर डिजिटल नेटवर्क"}
              </span>
            </div>

            {/* Right: Quick actions, Theme, Lang */}
            <div className="flex items-center gap-5">
              <Link
                to="/epaper"
                className="inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors"
              >
                <Newspaper className="h-3.5 w-3.5 text-primary" />
                <span>{t("epaper")}</span>
              </Link>
              <Link
                to="/live"
                className="inline-flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400 hover:opacity-90 transition-opacity"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                </span>
                <span>{t("live")}</span>
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{lang === "en" ? "Helpline" : "हेल्पलाइन"}</span>
              </a>
              <span className="h-3 w-px bg-border" />
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Moon className="h-3.5 w-3.5 dark:hidden" />
                <Sun className="hidden h-3.5 w-3.5 dark:block" />
                <span>{t("appearance")}</span>
              </button>
              <button
                type="button"
                onClick={() => setLang(lang === "en" ? "hi" : "en")}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <Languages className="h-3.5 w-3.5" />
                <span>{lang === "en" ? "हिन्दी" : "English"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Grand Devanagari Masthead */}
        <div className="w-full py-5 border-b bg-background">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-12 items-center gap-6">
            {/* Left: District Town Quick Pills */}
            <div className="col-span-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {lang === "en" ? "Town Quick Links" : "कस्बा नेटवर्क"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {towns?.slice(0, 7).map((tw) => (
                  <Link
                    key={tw.id}
                    to="/town/$slug"
                    params={{ slug: tw.slug }}
                    className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-0.5 text-xs font-medium hover:border-primary hover:text-primary transition-colors"
                  >
                    {pick(tw.name_hi, tw.name_en)}
                  </Link>
                ))}
              </div>
            </div>

            {/* Center: Grand Logo & Masthead Title */}
            <div className="col-span-6 flex flex-col items-center text-center">
              <Link to="/" className="group flex flex-col items-center">
                <div className="flex items-center gap-3">
                  <Logo className="h-12 w-12 drop-shadow-sm transition-transform group-hover:scale-105" />
                  <span className="font-serif text-4xl xl:text-5xl font-black tracking-tight text-foreground">
                    {lang === "en" ? "ABHI TAK" : "अभी तक"}
                  </span>
                </div>
                <div className="mt-1 font-serif text-xs font-bold uppercase tracking-[0.25em] text-primary">
                  {lang === "en" ? "Truth · Timely · Foremost" : "सच, समय पर, सबसे पहले"}
                </div>
                <div className="text-[11px] text-muted-foreground tracking-wide mt-0.5">
                  {lang === "en"
                    ? "District Bijnor's Premier Digital Broadsheet & News Network"
                    : "जनपद बिजनौर का अग्रणी डिजिटल ब्रॉडशीट व समाचार नेटवर्क"}
                </div>
              </Link>
            </div>

            {/* Right: Inline Search Bar & User / Sign-in */}
            <div className="col-span-3 flex items-center justify-end gap-3">
              <div className="relative w-full max-w-[240px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && term.trim()) {
                        void navigate({ to: "/news", search: { q: term.trim() } });
                        setIsSearchFocused(false);
                      }
                    }}
                    placeholder={lang === "en" ? "Search news…" : "खबरें खोजें…"}
                    className="h-9 pl-8 pr-7 text-xs rounded-full bg-muted/40 border-border focus-visible:ring-1"
                  />
                  {term && (
                    <button
                      type="button"
                      onClick={() => setTerm("")}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Desktop Live Search Dropdown */}
                {isSearchFocused && debouncedTerm.length >= 2 && (
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-popover p-2 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95"
                  >
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {lang === "en" ? "Search Results" : "खोज परिणाम"}
                    </div>
                    {isFetching ? (
                      <div className="p-4 text-center">
                        <Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : !searchResults?.length ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        {lang === "en" ? "No stories found" : "कोई ख़बर नहीं मिली"}
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {searchResults.map((art) => (
                          <Link
                            key={art.id}
                            to="/news/$slug"
                            params={{ slug: art.slug }}
                            onClick={() => {
                              setIsSearchFocused(false);
                              setTerm("");
                            }}
                            className="block px-2.5 py-2 hover:bg-muted rounded-md transition-colors"
                          >
                            <div className="text-xs font-semibold line-clamp-2 leading-snug">
                              {pick(art.title_hi, art.title_en)}
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {[
                                art.category && pick(art.category.name_hi, art.category.name_en),
                                art.town && pick(art.town.name_hi, art.town.name_en),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Profile or Sign-In button */}
              {!user ? (
                <Button
                  asChild
                  size="sm"
                  className="h-9 shrink-0 rounded-full px-4 text-xs font-semibold shadow-xs"
                >
                  <Link to="/auth" search={{ redirect: path }}>
                    <LogIn className="mr-1.5 h-3.5 w-3.5" />
                    {lang === "en" ? "Sign In" : "साइन इन"}
                  </Link>
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 rounded-full px-3 text-xs font-semibold"
                    >
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span className="max-w-[100px] truncate">{user.email?.split("@")[0]}</span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground truncate border-b">
                      {user.email}
                    </div>
                    <DropdownMenuItem asChild>
                      <Link to="/saved" className="flex items-center gap-2 cursor-pointer">
                        <Bookmark className="h-3.5 w-3.5 text-primary" />
                        <span>{t("saved")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-issues" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span>{t("myIssues")}</span>
                      </Link>
                    </DropdownMenuItem>
                    {isStaff && (
                      <DropdownMenuItem asChild>
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 cursor-pointer font-semibold text-primary"
                        >
                          <Shield className="h-3.5 w-3.5" />
                          <span>{t("admin")}</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        await supabase.auth.signOut();
                      }}
                      className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>{t("signOut")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 3. Sticky Horizontal Navigation Bar */}
      <nav className="hidden lg:block sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur-md shadow-xs select-none">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const active = link.match(path);
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold transition-colors",
                    active
                      ? "text-primary bg-primary/10"
                      : "text-foreground/80 hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.3 : 1.8} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="flex h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse ml-0.5" />
                  )}
                </Link>
              );
            })}

            {/* Towns Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 rounded-md text-[13px] font-semibold transition-colors",
                    path.startsWith("/town")
                      ? "text-primary bg-primary/10"
                      : "text-foreground/80 hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <span>{lang === "en" ? "Towns" : "कस्बे"}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-1.5">
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                  {lang === "en" ? "District Towns" : "जनपद के प्रमुख कस्बे"}
                </div>
                {towns?.map((tw) => (
                  <DropdownMenuItem key={tw.id} asChild>
                    <Link
                      to="/town/$slug"
                      params={{ slug: tw.slug }}
                      className="cursor-pointer text-xs font-medium py-1.5"
                    >
                      {pick(tw.name_hi, tw.name_en)}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Categories Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 px-3 py-2 rounded-md text-[13px] font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <span>{lang === "en" ? "Categories" : "श्रेणियाँ"}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-1.5">
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                  {lang === "en" ? "News Categories" : "समाचार श्रेणियाँ"}
                </div>
                {categories?.map((cat) => (
                  <DropdownMenuItem key={cat.id} asChild>
                    <Link
                      to="/news"
                      search={{ category: cat.slug }}
                      className="cursor-pointer text-xs font-medium py-1.5"
                    >
                      {pick(cat.name_hi, cat.name_en)}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Action: Report Public Issue CTA */}
          <div className="flex items-center gap-3">
            <Link
              to="/saved"
              aria-label={t("saved")}
              className="p-2 rounded-full text-muted-foreground hover:text-primary transition-colors"
            >
              <Bookmark className="h-4 w-4" />
            </Link>
            <Button
              asChild
              size="sm"
              className="h-8 rounded-full px-3.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Link to="/report">
                <Megaphone className="h-3.5 w-3.5 mr-1" />
                <span>{t("reportIssue")}</span>
              </Link>
            </Button>
          </div>
        </div>
      </nav>
    </>
  );
}

function DesktopFooter() {
  const { lang, t, pick } = useI18n();
  const { data: towns } = useQuery(townsQuery);
  const { data: categories } = useQuery(categoriesQuery);

  return (
    <footer className="hidden lg:block w-full border-t border-ink-foreground/15 bg-ink text-ink-foreground pt-14 pb-8 mt-16 select-none">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-12 gap-8 pb-12 border-b border-ink-foreground/15">
          {/* Column 1: Brand & Bureau */}
          <div className="col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <Logo className="h-10 w-10 shrink-0" />
              <div>
                <div className="font-serif text-2xl font-bold tracking-tight text-white">
                  {lang === "en" ? "Abhi Tak News" : "अभी तक"}
                </div>
                <div className="text-xs text-primary font-serif font-semibold tracking-widest">
                  {lang === "en" ? "Truth · Timely · Foremost" : "सच, समय पर, सबसे पहले"}
                </div>
              </div>
            </div>
            <p className="text-sm text-ink-foreground/75 leading-relaxed pr-4">
              {lang === "en"
                ? "District Bijnor's premier hyper-local digital news network. Providing fearless, verified journalism, breaking ground updates, civic grievance tracking, and multimedia reports across Western UP."
                : "जनपद बिजनौर (उत्तर प्रदेश) का अग्रणी स्वतंत्र डिजिटल समाचार नेटवर्क। निष्पक्ष, सटीक व तेज़ क्षेत्रीय पत्रकारिता, जन की आवाज़ और वीडियो बुलेटिन।"}
            </p>
            <div className="pt-2 space-y-2 text-xs text-ink-foreground/80">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>जनपद बिजनौर, उत्तर प्रदेश — 246701</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <a href={`tel:${CONTACT_PHONE.replace(/-/g, "")}`} className="hover:underline">
                  {CONTACT_PHONE}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  व्हाट्सऐप हेल्पलाइन
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Towns Directory */}
          <div className="col-span-3">
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
              {lang === "en" ? "Towns Directory" : "कस्बों की ख़बरें"}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-ink-foreground/75">
              {towns?.map((tw) => (
                <Link
                  key={tw.id}
                  to="/town/$slug"
                  params={{ slug: tw.slug }}
                  className="hover:text-white hover:underline transition-colors"
                >
                  {pick(tw.name_hi, tw.name_en)}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 3: Categories Directory */}
          <div className="col-span-2">
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
              {lang === "en" ? "Categories" : "प्रमुख श्रेणियाँ"}
            </div>
            <div className="flex flex-col space-y-2 text-sm text-ink-foreground/75">
              {categories?.slice(0, 8).map((cat) => (
                <Link
                  key={cat.id}
                  to="/news"
                  search={{ category: cat.slug }}
                  className="hover:text-white hover:underline transition-colors"
                >
                  {pick(cat.name_hi, cat.name_en)}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 4: Civic Platforms & Quick Links */}
          <div className="col-span-3">
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
              {lang === "en" ? "Platforms & Policies" : "नागरिक मंच व सेवाएँ"}
            </div>
            <div className="flex flex-col space-y-2 text-sm text-ink-foreground/75">
              <Link
                to="/jan-ki-awaaz"
                className="hover:text-white hover:underline transition-colors"
              >
                {t("jka")} — नागरिक शिकायत मंच
              </Link>
              <Link
                to="/report"
                className="hover:text-white hover:underline transition-colors text-primary font-medium"
              >
                + {t("reportIssue")} (समस्या दर्ज करें)
              </Link>
              <Link to="/live" className="hover:text-white hover:underline transition-colors">
                {t("live")} (सीधा प्रसारण)
              </Link>
              <Link to="/videos" className="hover:text-white hover:underline transition-colors">
                {t("videoGalaxy")}
              </Link>
              <Link to="/epaper" className="hover:text-white hover:underline transition-colors">
                {t("epaper")} (डिजिटल संस्करण)
              </Link>
              <Link to="/about" className="hover:text-white hover:underline transition-colors">
                {t("about")}
              </Link>
              <Link to="/privacy" className="hover:text-white hover:underline transition-colors">
                {t("privacy")}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-ink-foreground/60 gap-4">
          <div>© {new Date().getFullYear()} Abhi Tak News Network · All Rights Reserved.</div>
          <div className="font-serif">सत्यमेव जयते · जनपद बिजनौर (उ.प्र.)</div>
        </div>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const isReels = path === "/reels";

  if (isReels) {
    return (
      <div className="mx-auto h-[100dvh] w-full max-w-lg lg:max-w-none overflow-hidden bg-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-lg lg:max-w-none lg:shadow-none bg-background shadow-[0_0_0_1px_var(--color-border)]">
      <Header onMenu={() => setOpen(true)} />
      <DesktopHeader />
      <main className="pb-28 lg:pb-0">{children}</main>
      <BottomNav />
      <DesktopFooter />
      <SideMenu open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function SectionHead({
  title,
  to,
  action,
}: {
  title: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="flex items-end justify-between px-4 pb-3 pt-7">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <span className="h-5 w-1 bg-primary" />
        {title}
      </h2>
      {to && action && (
        <Link to={to} className="text-sm font-medium text-primary">
          {action} →
        </Link>
      )}
    </div>
  );
}
