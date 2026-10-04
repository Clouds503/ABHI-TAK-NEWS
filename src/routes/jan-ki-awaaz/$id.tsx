import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Megaphone, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { townsQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { img } from "@/lib/media";
import { Empty, StatusPill } from "@/components/news";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/jan-ki-awaaz/$id")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.pathname },
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Citizen report — Jan Ki Awaaz | Abhi Tak" },
      {
        name: "description",
        content: "A public-welfare issue reported by a citizen of District Bijnor.",
      },
      { property: "og:title", content: "Jan Ki Awaaz — Abhi Tak" },
      {
        property: "og:description",
        content: "A public-welfare issue reported by a citizen of District Bijnor.",
      },
    ],
  }),
  component: IssuePage,
});

const STEPS = ["pending", "approved", "forwarded", "in_progress", "resolved"];

function IssuePage() {
  const { id } = Route.useParams();
  const { t, pick, jkaCat, status, lang } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { data: towns } = useQuery(townsQuery);
  const { data: p, isLoading } = useQuery({
    queryKey: ["jka-one", id],
    queryFn: async () =>
      (await supabase.from("jka_public").select("*").eq("id", id).maybeSingle()).data,
    enabled: !!user,
  });

  if (!authLoading && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Megaphone className="h-16 w-16 text-primary/40" />
        <h2 className="mt-4 text-2xl font-bold">
          {lang === "en"
            ? "Sign In to View Issue Details"
            : "समस्या विवरण देखने के लिए साइन इन करें"}
        </h2>
        <Button asChild size="lg" className="mt-6 font-semibold">
          <Link to="/auth" search={{ redirect: `/jan-ki-awaaz/${id}` }}>
            <LogIn className="mr-2 h-4 w-4" />
            {lang === "en" ? "Sign In / Sign Up" : "साइन इन / साइन अप करें"}
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading) return null;
  if (!p) return <Empty text={t("noContent")} />;
  const tw = towns?.find((x) => x.id === p.town_id);
  const idx = STEPS.indexOf(p.status!);
  return (
    <article>
      <Link to="/jan-ki-awaaz" className="grid h-11 w-11 place-items-center px-2" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="px-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-primary">
            {jkaCat(p.category!)}
          </span>
          <StatusPill status={p.status!} />
        </div>
        <h1 className="mt-2 text-[26px] font-bold leading-snug">{p.title}</h1>
        <div className="mt-2 text-[13px] text-muted-foreground">
          {[p.area, tw && pick(tw.name_hi, tw.name_en)].filter(Boolean).join(", ")} ·{" "}
          {t("reportedBy")}: {p.reporter_name ?? t("anonymous")}
        </div>
      </div>
      {p.photo_url && (
        <img
          src={img(p.photo_url)}
          alt=""
          width={800}
          height={500}
          decoding="async"
          className="mt-4 aspect-[16/10] w-full object-cover"
        />
      )}
      {p.video_url && (
        <video src={p.video_url} controls playsInline className="mt-4 w-full bg-ink" />
      )}
      <p className="whitespace-pre-line px-4 py-5 text-[17px] leading-relaxed">{p.description}</p>
      <div className="mx-4 mb-8 rounded-sm border bg-card p-4">
        <div className="text-sm font-bold">{t("statusHistory")}</div>
        <ol className="mt-3 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full border text-[11px]",
                  i <= idx
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {i <= idx ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn("text-[15px]", i <= idx ? "font-semibold" : "text-muted-foreground")}
              >
                {status(s)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
