import { FileType, HardDrive, Ratio, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export interface UploadNoteProps {
  type: string;
  maxSize: string;
  ratio: string;
  hint?: string;
  className?: string;
}

/**
 * Standardized helper note rendered below upload inputs displaying
 * supported file types, maximum allowed file size, and recommended aspect ratio.
 */
export function UploadNote({ type, maxSize, ratio, hint, className }: UploadNoteProps) {
  let lang = "en";
  try {
    const i18n = useI18n();
    lang = i18n?.lang ?? "en";
  } catch {
    lang = "en";
  }

  const isHi = lang === "hi";

  return (
    <div
      className={cn(
        "mt-1.5 rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground shadow-2xs",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="inline-flex items-center gap-1.5">
          <FileType className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
          <span className="font-semibold text-foreground">{isHi ? "प्रकार (Type):" : "Type:"}</span>
          <span className="text-foreground/90">{type}</span>
        </div>

        <div className="inline-flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
          <span className="font-semibold text-foreground">
            {isHi ? "अधिकतम साइज़ (Max size):" : "Max size:"}
          </span>
          <span className="text-foreground/90">{maxSize}</span>
        </div>

        <div className="inline-flex items-center gap-1.5">
          <Ratio className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
          <span className="font-semibold text-foreground">
            {isHi ? "अनुपात (Ratio):" : "Ratio:"}
          </span>
          <span className="font-semibold text-primary">{ratio}</span>
        </div>
      </div>

      {hint && (
        <div className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground/85">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
}
