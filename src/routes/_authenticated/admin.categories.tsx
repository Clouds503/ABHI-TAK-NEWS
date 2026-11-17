import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

const empty = { id: "", name_hi: "", name_en: "", slug: "", sort_order: 0, is_active: true };

const schema = z.object({
  name_hi: z.string().trim().min(1, "Hindi name required"),
  name_en: z.string().trim().min(1, "English name required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and dashes only"),
  sort_order: z.number().int(),
});

function CategoriesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState(empty);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const edit = (c?: Category) => {
    setF(
      c
        ? {
            id: c.id,
            name_hi: c.name_hi,
            name_en: c.name_en,
            slug: c.slug,
            sort_order: c.sort_order,
            is_active: c.is_active,
          }
        : empty,
    );
    setOpen(true);
  };

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({
      ...p,
      [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value,
    }));

  const save = async () => {
    const parsed = schema.safeParse(f);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message);
      return;
    }
    const row = {
      name_hi: f.name_hi,
      name_en: f.name_en,
      slug: f.slug,
      sort_order: f.sort_order,
      is_active: f.is_active,
    };
    const res = f.id
      ? await supabase.from("categories").update(row).eq("id", f.id).select("id").single()
      : await supabase.from("categories").insert(row).select("id").single();
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    await supabase.from("admin_activity_logs").insert({
      actor_id: user!.id,
      action: f.id ? "update" : "create",
      entity: "category",
      entity_id: res.data.id,
    });
    toast.success("Saved");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const toggleActive = async (c: Category) => {
    await supabase.from("categories").update({ is_active: !c.is_active }).eq("id", c.id);
    await supabase.from("admin_activity_logs").insert({
      actor_id: user!.id,
      action: c.is_active ? "deactivate" : "activate",
      entity: "category",
      entity_id: c.id,
    });
    toast.success(c.is_active ? "Category deactivated" : "Category activated");
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const hardDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("categories").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("admin_activity_logs").insert({
      actor_id: user!.id,
      action: "delete",
      entity: "category",
      entity_id: deleteTarget.id,
    });
    toast.success("Category deleted");
    setDeleteTarget(null);
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const inp =
    "mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={() => edit()}>+ New Category</Button>
      </div>
      <div className="mt-5 overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 text-left">Hindi</th>
              <th className="px-3 py-2.5 text-left">English</th>
              <th className="px-3 py-2.5 text-left">Slug</th>
              <th className="px-3 py-2.5 text-center">Order</th>
              <th className="px-3 py-2.5 text-center">Active</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 font-medium">{c.name_hi}</td>
                <td className="px-3 py-2.5">{c.name_en}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.slug}</td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">{c.sort_order}</td>
                <td className="px-3 py-2.5 text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}
                  >
                    {c.is_active ? "Active" : "Off"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => edit(c)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => toggleActive(c)}
                    >
                      {c.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(c)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!data || data.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No categories found.
          </p>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{f.id ? "Edit Category" : "New Category"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 p-4">
            <div>
              <Label>Name (Hindi) *</Label>
              <input className={inp} value={f.name_hi} onChange={set("name_hi")} />
            </div>
            <div>
              <Label>Name (English) *</Label>
              <input className={inp} value={f.name_en} onChange={set("name_en")} />
            </div>
            <div>
              <Label>Slug *</Label>
              <input
                className={inp}
                value={f.slug}
                onChange={set("slug")}
                placeholder="e.g. politics"
              />
            </div>
            <div>
              <Label>Sort Order</Label>
              <input
                type="number"
                className={inp}
                value={f.sort_order}
                onChange={set("sort_order")}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="cat_active"
                checked={f.is_active}
                onChange={(e) => setF((p) => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="cat_active" className="cursor-pointer">
                Active (visible to public)
              </Label>
            </div>
            <Button onClick={save} className="w-full">
              Save Category
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name_en}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category. Any articles in this category will have
              their category set to null. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={hardDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
