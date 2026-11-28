import { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Mail,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { trackEngagement } from "@/lib/analytics";
import { img } from "@/lib/media";
import { cn } from "@/lib/utils";

export interface ShareableArticle {
  id?: string;
  title: string;
  summary?: string | null;
  slug: string;
  coverUrl?: string | null;
  url?: string;
}

export function buildArticleShareUrl(slug: string, explicitUrl?: string): string {
  if (explicitUrl) return explicitUrl;
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (
      !origin ||
      origin.includes("localhost") ||
      origin.includes("capacitor://") ||
      origin.includes("127.0.0.1")
    ) {
      return `https://abhitak.in/news/${slug}`;
    }
    return `${origin}/news/${slug}`;
  }
  return `https://abhitak.in/news/${slug}`;
}

export function shareToWhatsApp(article: ShareableArticle) {
  const url = buildArticleShareUrl(article.slug, article.url);
  const headline = article.title.trim();
  const summary = article.summary ? `${article.summary.trim()}\n\n` : "";
  const text = encodeURIComponent(`🔥 *${headline}*\n\n${summary}👉 पूरी ख़बर पढ़ें Abhitak पर:\n${url}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  if (article.id) void trackEngagement("share", "article", article.id, { platform: "whatsapp" });
}

export function shareToFacebook(article: ShareableArticle) {
  const url = buildArticleShareUrl(article.slug, article.url);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(fbUrl, "_blank", "width=600,height=500,noopener,noreferrer");
  if (article.id) void trackEngagement("share", "article", article.id, { platform: "facebook" });
}

export function shareToTwitter(article: ShareableArticle) {
  const url = buildArticleShareUrl(article.slug, article.url);
  const title = article.title.trim();
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&via=AbhitakNews`;
  window.open(twitterUrl, "_blank", "width=600,height=450,noopener,noreferrer");
  if (article.id) void trackEngagement("share", "article", article.id, { platform: "twitter" });
}

export function shareToTelegram(article: ShareableArticle) {
  const url = buildArticleShareUrl(article.slug, article.url);
  const title = article.title.trim();
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  window.open(tgUrl, "_blank", "width=600,height=450,noopener,noreferrer");
  if (article.id) void trackEngagement("share", "article", article.id, { platform: "telegram" });
}

export function shareToLinkedIn(article: ShareableArticle) {
  const url = buildArticleShareUrl(article.slug, article.url);
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  window.open(linkedInUrl, "_blank", "width=600,height=500,noopener,noreferrer");
  if (article.id) void trackEngagement("share", "article", article.id, { platform: "linkedin" });
}

export function shareToEmail(article: ShareableArticle) {
  const url = buildArticleShareUrl(article.slug, article.url);
  const subject = encodeURIComponent(article.title.trim());
  const body = encodeURIComponent(`${article.title.trim()}\n\n${article.summary || ""}\n\nRead more at: ${url}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  if (article.id) void trackEngagement("share", "article", article.id, { platform: "email" });
}

export async function shareNativeDevice(article: ShareableArticle): Promise<boolean> {
  const url = buildArticleShareUrl(article.slug, article.url);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: article.title,
        text: article.summary || article.title,
        url,
      });
      if (article.id) void trackEngagement("share", "article", article.id, { platform: "native" });
      return true;
    } catch {
      // User cancelled or share failed
      return false;
    }
  }
  return false;
}

export async function copyArticleLink(article: ShareableArticle, lang: "hi" | "en" = "hi"): Promise<boolean> {
  const url = buildArticleShareUrl(article.slug, article.url);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    toast.success(lang === "en" ? "Link copied to clipboard!" : "ख़बर का लिंक कॉपी हो गया!");
    if (article.id) void trackEngagement("share", "article", article.id, { platform: "copy_link" });
    return true;
  } catch {
    toast.error(lang === "en" ? "Failed to copy link" : "लिंक कॉपी करने में त्रुटि हुई");
    return false;
  }
}

interface NewsShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: ShareableArticle;
}

export function NewsShareDialog({ open, onOpenChange, article }: NewsShareDialogProps) {
  const { lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = buildArticleShareUrl(article.slug, article.url);
  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = async () => {
    const ok = await copyArticleLink(article, lang);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    const shared = await shareNativeDevice(article);
    if (shared) onOpenChange(false);
  };

  const platforms = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      subText: lang === "en" ? "Status & Chat" : "स्टेटस और चैट",
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-sm transition-transform group-hover:scale-105">
          <MessageCircle className="h-6 w-6 fill-current" />
        </div>
      ),
      action: () => {
        shareToWhatsApp(article);
        onOpenChange(false);
      },
    },
    {
      id: "facebook",
      name: "Facebook",
      subText: lang === "en" ? "Feed & Story" : "फ़ीड और स्टोरी",
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1877F2] text-white shadow-sm transition-transform group-hover:scale-105">
          <span className="font-sans font-bold text-xl leading-none">f</span>
        </div>
      ),
      action: () => {
        shareToFacebook(article);
        onOpenChange(false);
      },
    },
    {
      id: "twitter",
      name: "X (Twitter)",
      subText: lang === "en" ? "Post" : "पोस्ट",
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white dark:bg-zinc-800 shadow-sm transition-transform group-hover:scale-105">
          <span className="font-serif font-black text-base leading-none">𝕏</span>
        </div>
      ),
      action: () => {
        shareToTwitter(article);
        onOpenChange(false);
      },
    },
    {
      id: "telegram",
      name: "Telegram",
      subText: lang === "en" ? "Channels & Groups" : "चैनल और ग्रुप",
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#229ED9] text-white shadow-sm transition-transform group-hover:scale-105">
          <Send className="h-5 w-5 fill-current -rotate-12 translate-x-0.5" />
        </div>
      ),
      action: () => {
        shareToTelegram(article);
        onOpenChange(false);
      },
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      subText: lang === "en" ? "Network" : "नेटवर्क",
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A66C2] text-white shadow-sm transition-transform group-hover:scale-105">
          <span className="font-sans font-bold text-base leading-none">in</span>
        </div>
      ),
      action: () => {
        shareToLinkedIn(article);
        onOpenChange(false);
      },
    },
    {
      id: "email",
      name: "Email",
      subText: lang === "en" ? "Send to contact" : "ईमेल भेजें",
      icon: (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground border border-border/80 shadow-xs transition-transform group-hover:scale-105">
          <Mail className="h-5 w-5" />
        </div>
      ),
      action: () => {
        shareToEmail(article);
        onOpenChange(false);
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-md p-5 rounded-2xl sm:p-6 overflow-hidden">
        <DialogHeader className="text-left pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold sm:text-lg">
            <Share2 className="h-5 w-5 text-primary" />
            <span>{lang === "en" ? "Share This Story" : "ख़बर साझा करें"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {lang === "en"
              ? "Share this regional news across your community and contacts."
              : "इस क्षेत्रीय समाचार को अपने मित्रों व समाज के साथ साझा करें।"}
          </DialogDescription>
        </DialogHeader>

        {/* Article Preview Card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
          {article.coverUrl ? (
            <img
              src={img(article.coverUrl) ?? "/pwa-192.png"}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-lg object-cover bg-muted"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
              NEWS
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
              {article.title}
            </h4>
            <span className="mt-1 block text-[10px] text-muted-foreground truncate">
              {url}
            </span>
          </div>
        </div>

        {/* Social Platforms Grid */}
        <div className="grid grid-cols-3 gap-3 py-2">
          {platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={p.action}
              className="group flex flex-col items-center gap-1.5 p-2 rounded-xl text-center hover:bg-muted/50 transition-colors cursor-pointer"
            >
              {p.icon}
              <span className="text-xs font-bold leading-tight text-foreground">
                {p.name}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
                {p.subText}
              </span>
            </button>
          ))}
        </div>

        {/* Copy Link Strip */}
        <div className="flex items-center gap-2 pt-1 border-t">
          <div className="flex-1 truncate rounded-lg border bg-muted/30 px-3 py-2 text-xs font-mono text-muted-foreground select-all">
            {url}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleCopy}
            className={cn(
              "gap-1.5 shrink-0 font-semibold text-xs shadow-xs",
              copied ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""
            )}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>{lang === "en" ? "Copied" : "कॉपी हुआ"}</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>{lang === "en" ? "Copy Link" : "लिंक कॉपी करें"}</span>
              </>
            )}
          </Button>
        </div>

        {/* Native Web Share Button (Mobile fallback) */}
        {hasNativeShare && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNativeShare}
            className="w-full gap-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Smartphone className="h-4 w-4 text-primary" />
            <span>
              {lang === "en" ? "More Apps (System Share)" : "अन्य ऐप्स में साझा करें"}
            </span>
            <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" />
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Bottom / inline sharing banner for articles
 */
export function NewsShareBar({
  article,
  className,
}: {
  article: ShareableArticle;
  className?: string;
}) {
  const { lang } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyArticleLink(article, lang);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {lang === "en" ? "Share This Story" : "ख़बर साझा करें"}
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {lang === "en" ? "Spread the truth" : "सच्चाई आगे पहुँचाएँ"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp One-Click Share Button */}
          <Button
            type="button"
            onClick={() => shareToWhatsApp(article)}
            className="flex-1 min-w-[170px] gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-xs"
          >
            <MessageCircle className="h-4 w-4 fill-current" />
            <span>{lang === "en" ? "Share on WhatsApp" : "WhatsApp पर शेयर करें"}</span>
          </Button>

          {/* Facebook */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => shareToFacebook(article)}
            title="Share on Facebook"
            aria-label="Share on Facebook"
            className="h-9 w-9 rounded-xl border-border text-[#1877F2] hover:bg-[#1877F2]/10"
          >
            <span className="font-sans font-bold text-sm">f</span>
          </Button>

          {/* X (Twitter) */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => shareToTwitter(article)}
            title="Share on X"
            aria-label="Share on X"
            className="h-9 w-9 rounded-xl border-border text-foreground hover:bg-muted"
          >
            <span className="font-serif font-black text-xs">𝕏</span>
          </Button>

          {/* Telegram */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => shareToTelegram(article)}
            title="Share on Telegram"
            aria-label="Share on Telegram"
            className="h-9 w-9 rounded-xl border-border text-[#229ED9] hover:bg-[#229ED9]/10"
          >
            <Send className="h-3.5 w-3.5 fill-current -rotate-12" />
          </Button>

          {/* Copy Link */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopy}
            title={lang === "en" ? "Copy link" : "लिंक कॉपी करें"}
            aria-label="Copy link"
            className={cn(
              "h-9 w-9 rounded-xl border-border transition-colors",
              copied ? "text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {copied ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
          </Button>

          {/* All Options Modal Trigger */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="gap-1 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 ml-auto"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>{lang === "en" ? "All Options" : "सभी विकल्प"}</span>
          </Button>
        </div>
      </div>

      <NewsShareDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        article={article}
      />
    </>
  );
}

/**
 * Compact quick-share icon button for news cards and feeds
 */
export function QuickShareButton({
  article,
  className,
  size = "icon",
  variant = "ghost",
}: {
  article: ShareableArticle;
  className?: string;
  size?: "icon" | "sm" | "default";
  variant?: "ghost" | "outline" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Share article"
        title="Share"
        className={cn("h-7 w-7 rounded-full text-muted-foreground hover:text-foreground", className)}
      >
        <Share2 className="h-3.5 w-3.5" />
      </Button>
      <NewsShareDialog open={open} onOpenChange={setOpen} article={article} />
    </>
  );
}
