import type { ReactNode } from "react";
import { Check, Globe, Sparkles, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./AppShell";
import { Button } from "@/components/ui/button";

export function LanguageGate({ children }: { children: ReactNode }) {
  const { setLang, hasChosenLanguage, ready } = useI18n();

  // SSR or preference already chosen: render children immediately without blocking
  if (!ready || hasChosenLanguage) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-ink px-6 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),3rem)] text-ink-foreground animate-in fade-in duration-300">
      {/* Brand Header */}
      <div className="my-auto flex flex-col items-center text-center">
        <div className="relative">
          <Logo className="h-28 w-28 rounded-2xl shadow-2xl md:h-32 md:w-32" />
          <span className="absolute -bottom-2.5 -right-2.5 flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-md">
            <Sparkles className="h-3 w-3" /> Live
          </span>
        </div>

        <h1 className="mt-6 font-serif text-3xl font-extrabold tracking-wide md:text-4xl">
          ABHITAK
        </h1>
        <p className="mt-1.5 text-base font-medium text-ink-foreground/80 md:text-lg">
          आपका समाचार नेटवर्क · Your News Network
        </p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.25em] text-ink-foreground/50">
          सच, समय पर, सबसे पहले · Truth · Timely · Foremost
        </p>

        {/* Language Selection Card Area */}
        <div className="mt-8 w-full max-w-sm space-y-3">
          <div className="flex items-center justify-center gap-1.5 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-foreground/60">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span>भाषा चुनें · Choose Preferred Language</span>
          </div>

          {/* Hindi Option Card */}
          <button
            type="button"
            onClick={() => setLang("hi")}
            className="group relative flex w-full items-center justify-between rounded-xl border border-primary/50 bg-primary/10 p-4 text-left transition-all hover:bg-primary/20 active:scale-[0.98]"
          >
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-ink-foreground">
                  हिन्दी
                </span>
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  अनुशंसित · Default
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-foreground/75 leading-relaxed">
                ताज़ा ख़बरें, जन की आवाज़, लाइव बुलेटिन व स्थानीय रिपोर्ट
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-110">
              <Check className="h-4 w-4" />
            </div>
          </button>

          {/* English Option Card */}
          <button
            type="button"
            onClick={() => setLang("en")}
            className="group relative flex w-full items-center justify-between rounded-xl border border-ink-foreground/20 bg-ink-foreground/5 p-4 text-left transition-all hover:bg-ink-foreground/10 active:scale-[0.98]"
          >
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-ink-foreground">
                  English
                </span>
                <span className="rounded-full border border-ink-foreground/30 px-2 py-0.5 text-[10px] font-medium text-ink-foreground/70">
                  Regional & National
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-foreground/75 leading-relaxed">
                Breaking headlines, verified citizen issues & video gallery
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-foreground/30 text-ink-foreground/50 transition-transform group-hover:scale-110 group-hover:border-ink-foreground group-hover:text-ink-foreground">
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>

          {/* Direct Quick Action */}
          <Button
            type="button"
            size="lg"
            onClick={() => setLang("hi")}
            className="mt-2 h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-[0.99]"
          >
            <span>हिन्दी में जारी रखें · Continue</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>

          {/* Hint footnote */}
          <p className="pt-2 text-center text-[11px] text-ink-foreground/50">
            आप इसे बाद में साइड मेनू से कभी भी बदल सकते हैं।
            <br />
            You can change your language anytime from the menu.
          </p>
        </div>
      </div>
    </div>
  );
}
