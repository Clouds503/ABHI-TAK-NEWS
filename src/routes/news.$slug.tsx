import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Bookmark, Share2, ArrowLeft, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { articleQuery, articlesQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { img } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import { ArticleRow, Meta, Empty } from "@/components/news";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDoubleTap } from "@/lib/useDoubleTap";
import { HeartPop } from "@/components/HeartPop";
import { hasGuestLiked, toggleGuestLike } from "@/lib/guest-likes";
import { trackArticleView, trackEngagement } from "@/lib/analytics";

export const Route = createFileRoute("/news/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(articleQuery(params.slug)),
  head: ({ loaderData }) => {
    if (!loaderData)
      return { meta: [{ title: "Abhi Tak" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.title_hi} — Abhi Tak`;
    const desc = loaderData.summary_hi ?? loaderData.title_en ?? "";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
      ],
    };
  },
  errorComponent: () => <Empty text="Could not load this story." />,
  notFoundComponent: () => <Empty text="Story not found." />,
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { pick, t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: a } = useSuspenseQuery(articleQuery(slug));
  const { data: related } = useQuery({
    ...articlesQuery({ category: a?.category?.slug, limit: 5 }),
    enabled: !!a?.category,
  });

  const [guestLiked, setGuestLiked] = useState(() => (a?.id ? hasGuestLiked(a.id) : false));
  const [heartPop, setHeartPop] = useState<{ show: boolean; x?: number; y?: number }>({
    show: false,
  });

  // Track article telemetry view on mount
  useEffect(() => {
    if (a?.id) {
      setGuestLiked(hasGuestLiked(a.id));
      void trackArticleView(a.id);
    }
  }, [a?.id]);

  // Bookmark state
  const { data: saved } = useQuery({
    queryKey: ["bookmark", a?.id, user?.id],
    enabled: !!user && !!a,
    queryFn: async () =>
      (await supabase.from("bookmarks").select("id").eq("article_id", a!.id).maybeSingle()).data,
  });

  // Like count — public, shown to all visitors
  const { data: likeCount } = useQuery({
    queryKey: ["likeCount", a?.id],
    enabled: !!a,
    queryFn: async () => {
      const { count } = await supabase
        .from("article_likes")
        .select("id", { count: "exact", head: true })
        .eq("article_id", a!.id);
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  // Whether current user has already liked — auth-gated
  const { data: authLiked } = useQuery({
    queryKey: ["liked", a?.id, user?.id],
    enabled: !!user && !!a,
    queryFn: async () =>
      (
        await supabase
          .from("article_likes")
          .select("id")
          .eq("article_id", a!.id)
          .eq("user_id", user!.id)
          .maybeSingle()
      ).data,
  });

  const isLiked = user ? !!authLiked : guestLiked;
  const effectiveCount = (likeCount ?? 0) + (!user && guestLiked ? 1 : 0);

  const toggleLike = async () => {
    if (!a) return;
    if (!user) {
      const nowLiked = toggleGuestLike(a.id);
      setGuestLiked(nowLiked);
      if (nowLiked) {
        toast.success(
          lang === "en"
            ? "Liked! Sign in to sync your likes."
            : "पसंद किया गया! सहेजने के लिए साइन इन करें।",
        );
        void trackEngagement("like", "article", a.id);
      }
      return;
    }
    if (authLiked) {
      await supabase.from("article_likes").delete().eq("id", authLiked.id);
    } else {
      await supabase.from("article_likes").insert({ article_id: a.id, user_id: user.id });
      void trackEngagement("like", "article", a.id);
    }
    qc.invalidateQueries({ queryKey: ["liked"] });
    qc.invalidateQueries({ queryKey: ["likeCount"] });
  };

  const handleDoubleTap = (
    _e: React.MouseEvent | React.TouchEvent,
    point: { x: number; y: number },
  ) => {
    setHeartPop({ show: true, x: point.x, y: point.y });
    if (!isLiked) {
      void toggleLike();
    }
    if (a?.id) {
      void trackEngagement("double_tap", "article", a.id);
    }
  };

  const doubleTapGesture = useDoubleTap(handleDoubleTap, { latency: 300 });

  if (!a) return <Empty text={t("noContent")} />;

  const share = async () => {
    const url = window.location.href;
    if (navigator.share)
      await navigator.share({ title: pick(a.title_hi, a.title_en), url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
    void trackEngagement("share", "article", a.id);
  };

  const toggleSave = async () => {
    if (!user) {
      toast(t("signIn"), { description: "Sign in to save stories" });
      return;
    }
    if (saved) await supabase.from("bookmarks").delete().eq("id", saved.id);
    else {
      await supabase.from("bookmarks").insert({ article_id: a.id, user_id: user.id });
      void trackEngagement("bookmark", "article", a.id);
    }
    qc.invalidateQueries({ queryKey: ["bookmark"] });
  };

  const body = pick(a.body_hi, a.body_en);

  return (
    <article className="relative">
      <HeartPop
        show={heartPop.show}
        x={heartPop.x}
        y={heartPop.y}
        onAnimationEnd={() => setHeartPop({ show: false })}
      />

      <div className="flex items-center justify-between px-4 py-3">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          aria-label="Back"
        >
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        {/* Action bar: Like + Bookmark + Share */}
        <div className="flex rounded-full border bg-card p-1 shadow-sm">
          {/* Like button */}
          <Button
            onClick={toggleLike}
            variant="ghost"
            size="icon"
            className={cn(
              "flex h-9 items-center gap-1 rounded-full px-2.5",
              isLiked
                ? "text-rose-500 hover:text-rose-500"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Like"
          >
            <Heart
              className="h-[18px] w-[18px]"
              fill={isLiked ? "currentColor" : "none"}
              strokeWidth={isLiked ? 0 : 1.8}
            />
            {effectiveCount > 0 && (
              <span className="text-xs font-semibold leading-none tabular-nums">
                {effectiveCount}
              </span>
            )}
          </Button>

          {/* Bookmark button */}
          <Button
            onClick={toggleSave}
            variant="ghost"
            size="icon"
            className={cn("h-9 w-9 rounded-full", saved && "text-primary")}
            aria-label={t("save")}
          >
            <Bookmark className="h-5 w-5" fill={saved ? "currentColor" : "none"} />
          </Button>

          {/* Share button */}
          <Button
            onClick={share}
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label={t("share")}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="px-4">
        <Meta a={a} />
        <h1 className="mt-3 text-[28px] font-bold leading-[1.25]">
          {pick(a.title_hi, a.title_en)}
        </h1>
        {pick(a.summary_hi, a.summary_en) && (
          <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">
            {pick(a.summary_hi, a.summary_en)}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2 border-y py-3 text-[13px]">
          <span className="h-6 w-1 bg-primary" />
          <span className="font-semibold">{a.author_name}</span>
          <span className="text-muted-foreground">
            ·{" "}
            {a.published_at &&
              new Date(a.published_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
          </span>
        </div>
      </div>

      {a.cover_url && (
        <div
          {...doubleTapGesture}
          className="relative mt-4 aspect-[16/9] w-full cursor-pointer select-none overflow-hidden bg-muted"
        >
          <img
            src={img(a.cover_url) ?? "/pwa-512.png"}
            alt=""
            width={1200}
            height={675}
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = "/pwa-512.png";
              e.currentTarget.classList.add("object-contain");
            }}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div
        {...doubleTapGesture}
        className="space-y-5 px-4 py-6 text-[18px] leading-[1.8] prose prose-p:my-2 prose-a:text-primary max-w-none dark:prose-invert cursor-pointer select-text"
        dangerouslySetInnerHTML={{ __html: body }}
      />

      {related && related.filter((r) => r.id !== a.id).length > 0 && (
        <div className="border-t pt-4">
          <h2 className="px-4 text-lg font-bold">{t("related")}</h2>
          {related
            .filter((r) => r.id !== a.id)
            .map((r) => (
              <ArticleRow key={r.id} a={r} />
            ))}
        </div>
      )}
    </article>
  );
}
