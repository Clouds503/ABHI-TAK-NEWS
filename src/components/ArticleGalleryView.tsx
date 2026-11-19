import { useState } from "react";
import { Camera, Maximize2, X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { img } from "@/lib/media";
import { cn } from "@/lib/utils";

export interface GalleryItem {
  url: string;
  caption?: string;
}

export interface ArticleGalleryViewProps {
  items?: GalleryItem[] | null;
  className?: string;
  variant?: "desktop" | "mobile";
}

export function ArticleGalleryView({ items, className, variant = "mobile" }: ArticleGalleryViewProps) {
  const { lang } = useI18n();
  const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  const validItems = items.filter((item) => !!item.url);
  if (validItems.length === 0) return null;

  const isHi = lang === "hi";
  const title = isHi ? "फ़ोटो गैलरी" : "Photo Gallery";
  const countLabel = isHi
    ? `${validItems.length} तस्वीरें`
    : `${validItems.length} ${validItems.length === 1 ? "Photo" : "Photos"}`;

  const openLightbox = (idx: number) => {
    setActiveModalIndex(idx);
  };

  const closeLightbox = () => {
    setActiveModalIndex(null);
  };

  const handleNext = () => {
    if (activeModalIndex === null) return;
    setActiveModalIndex((activeModalIndex + 1) % validItems.length);
  };

  const handlePrev = () => {
    if (activeModalIndex === null) return;
    setActiveModalIndex((activeModalIndex - 1 + validItems.length) % validItems.length);
  };

  const activeItem = activeModalIndex !== null ? validItems[activeModalIndex] : null;

  return (
    <section className={cn("my-8 rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
              {title}
            </h3>
          </div>
        </div>
        <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5">
          {countLabel}
        </Badge>
      </div>

      {/* Gallery Layout */}
      {variant === "mobile" ? (
        // Mobile Layout: Stack of clean editorial cards with captions
        <div className="space-y-5">
          {validItems.map((item, idx) => (
            <figure
              key={`${item.url}-${idx}`}
              className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xs"
            >
              <div
                className="relative aspect-[16/10] w-full cursor-pointer bg-muted overflow-hidden group"
                onClick={() => openLightbox(idx)}
              >
                <img
                  src={img(item.url) ?? item.url}
                  alt={item.caption || `Photo ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                  onError={(e) => {
                    e.currentTarget.src = "/pwa-512.png";
                    e.currentTarget.classList.add("object-contain");
                  }}
                />
                <div className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-xs opacity-90 transition-opacity">
                  <Maximize2 className="h-3.5 w-3.5" />
                </div>
                <div className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-mono text-white backdrop-blur-xs">
                  {idx + 1} / {validItems.length}
                </div>
              </div>
              {item.caption && (
                <figcaption className="p-3 text-xs sm:text-sm leading-relaxed text-muted-foreground border-t border-border/40 bg-card/60">
                  <span className="font-semibold text-foreground/80 mr-1.5">▪</span>
                  {item.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      ) : (
        // Desktop Layout: 2-column responsive editorial grid
        <div
          className={cn(
            "grid gap-5",
            validItems.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
          )}
        >
          {validItems.map((item, idx) => (
            <figure
              key={`${item.url}-${idx}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs transition-shadow hover:shadow-md"
            >
              <div
                className="relative aspect-[16/10] w-full cursor-pointer overflow-hidden bg-muted"
                onClick={() => openLightbox(idx)}
              >
                <img
                  src={img(item.url) ?? item.url}
                  alt={item.caption || `Photo ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
                  onError={(e) => {
                    e.currentTarget.src = "/pwa-512.png";
                    e.currentTarget.classList.add("object-contain");
                  }}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xs">
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>{isHi ? "बड़ा देखें" : "Enlarge"}</span>
                  </span>
                </div>
                <div className="absolute top-2.5 left-2.5 rounded bg-black/70 px-2 py-0.5 text-xs font-mono font-medium text-white backdrop-blur-xs">
                  {idx + 1} / {validItems.length}
                </div>
              </div>

              {item.caption ? (
                <figcaption className="flex-1 p-3.5 text-sm leading-relaxed text-muted-foreground border-t border-border/50 bg-card">
                  <span className="font-bold text-primary mr-1.5">▪</span>
                  {item.caption}
                </figcaption>
              ) : (
                <figcaption className="p-2 text-xs italic text-muted-foreground/60 border-t border-border/40">
                  {isHi ? "चित्र सौजन्य: अभी तक न्यूज़" : "Photo: Abhi Tak News"}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={activeModalIndex !== null} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 text-white border-white/10 sm:rounded-2xl">
          {activeItem && (
            <div className="relative flex flex-col">
              {/* Top bar */}
              <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-2">
                  <Images className="h-4 w-4 text-white/80" />
                  <span className="text-xs font-mono text-white/80">
                    {(activeModalIndex ?? 0) + 1} / {validItems.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                  onClick={closeLightbox}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Main Image with Navigation Arrows */}
              <div className="relative flex items-center justify-center min-h-[50vh] max-h-[70vh] bg-black p-2">
                <img
                  src={img(activeItem.url) ?? activeItem.url}
                  alt={activeItem.caption || "Enlarged photo"}
                  className="max-h-[68vh] w-auto max-w-full object-contain"
                />

                {validItems.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/80 hover:text-white border border-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrev();
                      }}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/80 hover:text-white border border-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>

              {/* Caption Bottom Bar */}
              {activeItem.caption && (
                <div className="p-4 border-t border-white/10 bg-zinc-900/90 text-sm leading-relaxed text-zinc-200">
                  <p>{activeItem.caption}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
