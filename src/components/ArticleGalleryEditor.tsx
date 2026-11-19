import { useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Loader2,
  Images,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UploadNote } from "@/components/UploadNote";
import { uploadMedia } from "@/lib/upload";
import { img } from "@/lib/media";

export interface GalleryItem {
  url: string;
  caption: string;
}

export interface ArticleGalleryEditorProps {
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  bucket?: string;
  label?: string;
  hint?: string;
}

export function ArticleGalleryEditor({
  items = [],
  onChange,
  bucket = "articles",
  label = "Photo Gallery (Multiple Images & Captions)",
  hint = "Attach additional ground photos, scene angles, or documents to appear in the article gallery.",
}: ArticleGalleryEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlField, setShowUrlField] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} image${files.length > 1 ? "s" : ""}...`);
    const newItems: GalleryItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const url = await uploadMedia(file, bucket);
          newItems.push({
            url,
            caption: "",
          });
        } catch (itemErr: unknown) {
          toast.error(
            `Failed to upload ${file.name}: ${itemErr instanceof Error ? itemErr.message : "Error"}`,
          );
        }
      }

      if (newItems.length > 0) {
        onChange([...items, ...newItems]);
        toast.success(`Added ${newItems.length} image${newItems.length > 1 ? "s" : ""} to gallery!`, {
          id: toastId,
        });
      } else {
        toast.dismiss(toastId);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange([...items, { url: trimmed, caption: "" }]);
    setUrlInput("");
    setShowUrlField(false);
    toast.success("Image URL added to gallery");
  };

  const handleUpdateCaption = (index: number, caption: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], caption };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChange(updated);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-card/60 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images className="h-4 w-4 text-primary" />
          <Label className="text-sm font-semibold">{label}</Label>
        </div>
        <Badge variant="secondary" className="text-[11px] font-medium">
          {items.length} {items.length === 1 ? "photo" : "photos"}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">{hint}</p>

      {/* Upload button & file input */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer transition-colors disabled:opacity-50">
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Photos (Multiple)</span>
            </>
          )}
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={uploading}
            className="sr-only"
            onChange={(e) => {
              void handleFiles(e.target.files);
              // Reset file input value so re-selecting same files triggers change
              e.target.value = "";
            }}
          />
        </label>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setShowUrlField((s) => !s)}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add via URL</span>
        </Button>
      </div>

      {showUrlField && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
          <Input
            placeholder="https://example.com/photo.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="h-8 text-xs bg-background"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUrl();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={handleAddUrl}
            disabled={!urlInput.trim()}
          >
            Add
          </Button>
        </div>
      )}

      <UploadNote
        type="JPG, PNG, WebP"
        maxSize="10 MB per file"
        ratio="Flexible (Landscape / Portrait)"
        hint="Select multiple images simultaneously. Add descriptive captions to appear with each photo."
      />

      {/* List of uploaded gallery images */}
      {items.length > 0 && (
        <div className="space-y-2.5 pt-2">
          {items.map((item, idx) => (
            <div
              key={`${item.url}-${idx}`}
              className="flex items-start gap-3 rounded-md border bg-background/80 p-2.5 shadow-2xs transition-colors hover:border-primary/40"
            >
              {/* Thumbnail */}
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-muted">
                <img
                  src={img(item.url) ?? item.url}
                  alt={item.caption || `Gallery photo ${idx + 1}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/pwa-512.png";
                    e.currentTarget.classList.add("object-contain");
                  }}
                />
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-mono text-white">
                  #{idx + 1}
                </span>
              </div>

              {/* Caption input & controls */}
              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Photo #{idx + 1} Caption
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => handleMove(idx, "up")}
                      disabled={idx === 0}
                      title="Move up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => handleMove(idx, "down")}
                      disabled={idx === items.length - 1}
                      title="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(idx)}
                      title="Remove image"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Input
                  value={item.caption}
                  onChange={(e) => handleUpdateCaption(idx, e.target.value)}
                  placeholder="फोटो का विवरण लिखें / Photo caption (e.g. मौके पर पहुंचे जिलाधिकारी)"
                  className="h-8 text-xs bg-card"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
