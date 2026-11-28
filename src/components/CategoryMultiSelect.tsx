import { useState } from "react";
import { Check, Star, X, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  id: string;
  name_en: string;
  name_hi: string;
  slug?: string;
}

interface CategoryMultiSelectProps {
  categories: CategoryOption[];
  selectedIds: string[];
  primaryId?: string | null;
  onChange: (ids: string[], primaryId: string | null) => void;
  label?: string;
  className?: string;
}

export function CategoryMultiSelect({
  categories,
  selectedIds,
  primaryId,
  onChange,
  label = "Categories (Multi-Select)",
  className,
}: CategoryMultiSelectProps) {
  const [filterText, setFilterText] = useState("");

  const toggleCategory = (id: string) => {
    let next: string[];
    let nextPrimary = primaryId;

    if (selectedIds.includes(id)) {
      next = selectedIds.filter((item) => item !== id);
      if (nextPrimary === id) {
        nextPrimary = next.length > 0 ? next[0] : null;
      }
    } else {
      next = [...selectedIds, id];
      if (!nextPrimary) {
        nextPrimary = id;
      }
    }
    onChange(next, nextPrimary);
  };

  const setPrimary = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!selectedIds.includes(id)) {
      onChange([...selectedIds, id], id);
    } else {
      onChange(selectedIds, id);
    }
  };

  const removeCategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = selectedIds.filter((item) => item !== id);
    const nextPrimary = primaryId === id ? (next.length > 0 ? next[0] : null) : primaryId;
    onChange(next, nextPrimary);
  };

  const clearAll = () => {
    onChange([], null);
  };

  const filteredCategories = categories.filter((c) => {
    if (!filterText.trim()) return true;
    const query = filterText.toLowerCase();
    return (
      c.name_en.toLowerCase().includes(query) ||
      c.name_hi.toLowerCase().includes(query)
    );
  });

  const selectedCategoryObjs = categories.filter((c) => selectedIds.includes(c.id));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs font-semibold">
          <Tag className="h-3.5 w-3.5 text-primary" />
          <span>{label}</span>
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-bold">
              {selectedIds.length}
            </Badge>
          )}
        </Label>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected Tags Display */}
      {selectedCategoryObjs.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/30 min-h-[42px] items-center">
          {selectedCategoryObjs.map((c) => {
            const isPrimary = c.id === primaryId || (selectedCategoryObjs.length > 0 && selectedCategoryObjs[0].id === c.id && !primaryId);
            return (
              <span
                key={c.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all shadow-2xs",
                  isPrimary
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-background border border-border text-foreground hover:bg-muted"
                )}
              >
                <span>{c.name_en}</span>
                <span className="text-[10px] opacity-75">({c.name_hi})</span>
                {isPrimary ? (
                  <span className="ml-1 rounded-sm bg-primary-foreground/20 px-1 py-0.2 text-[9px] uppercase tracking-wider font-bold">
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => setPrimary(e, c.id)}
                    title="Make primary category"
                    className="ml-0.5 rounded-full p-0.5 opacity-60 hover:opacity-100 hover:text-amber-500 transition-opacity"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => removeCategory(e, c.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic px-1">
          No categories selected yet. Click from the list below to assign one or more categories.
        </div>
      )}

      {/* Quick Category Selector Chips */}
      <div className="space-y-1.5 pt-1">
        {categories.length > 8 && (
          <input
            type="text"
            placeholder="Quick search categories..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring mb-1.5"
          />
        )}
        <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
          {filteredCategories.map((c) => {
            const isSelected = selectedIds.includes(c.id);
            const isPrimary = c.id === primaryId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-primary/15 text-primary border border-primary/40 font-semibold"
                    : "bg-muted/70 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px]",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-transparent"
                  )}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </div>
                <span>{c.name_en}</span>
                <span className="text-[10px] text-muted-foreground">({c.name_hi})</span>
                {isSelected && isPrimary && (
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500 ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
