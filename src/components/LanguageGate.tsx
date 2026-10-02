import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./AppShell";

export function LanguageGate({ children }: { children: ReactNode }) {
  const { lang, setLang } = useI18n();
  if (lang) return <>{children}</>;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-ink px-8 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),4rem)] text-ink-foreground">
      <div />
      <div className="flex flex-col items-center text-center">
        <Logo className="h-36 w-36 shadow-2xl" />
        <div className="mt-8 font-serif text-3xl font-bold tracking-wide">ABHI TAK</div>
        <div className="mt-2 text-lg text-ink-foreground/70">आपका समाचार नेटवर्क</div>
        <div className="mt-1 text-xs uppercase tracking-[0.3em] text-ink-foreground/40">District Bijnor · U.P.</div>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <div className="pb-1 text-center text-sm text-ink-foreground/60">भाषा चुनें · Choose language</div>
        <button onClick={() => setLang("hi")} className="h-14 w-full rounded-md bg-primary text-xl font-semibold text-primary-foreground active:scale-[0.99]">हिन्दी</button>
        <button onClick={() => setLang("en")} className="h-14 w-full rounded-md border border-ink-foreground/25 text-lg font-semibold active:scale-[0.99]">English</button>
      </div>
    </div>
  );
}
