import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, MapPin, Phone, Search, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Abhi Tak CMS" }, { name: "robots", content: "noindex" }] }),
  component: UsersAdmin,
});

function UsersAdmin() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("*, town:towns(name_en)").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;
      const roles = new Map<string, string[]>();
      rolesResult.data.forEach((row) => roles.set(row.user_id, [...(roles.get(row.user_id) ?? []), row.role]));
      return profilesResult.data.map((profile) => ({ ...profile, roles: roles.get(profile.id) ?? ["user"] }));
    },
  });
  const normalized = query.trim().toLowerCase();
  const users = data?.filter((user) => `${user.full_name ?? ""} ${user.email ?? ""} ${user.phone ?? ""} ${user.town?.name_en ?? ""}`.toLowerCase().includes(normalized));
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Users</h1><p className="mt-1 text-sm text-muted-foreground">All registered Abhi Tak accounts and their current roles.</p></div>
        <div className="text-sm font-semibold">{data?.length ?? 0} total</div>
      </div>
      <div className="relative mt-5 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone or town" className="pl-9" />
      </div>
      <div className="mt-4 overflow-hidden rounded-md border bg-card">
        {isLoading && <div className="p-6 text-sm text-muted-foreground">Loading users…</div>}
        {!isLoading && !users?.length && <div className="p-8 text-center text-sm text-muted-foreground">No users found.</div>}
        <div className="divide-y">
          {users?.map((user) => (
            <article key={user.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] md:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted"><UserRound className="h-5 w-5" /></span>
                <div className="min-w-0"><h2 className="truncate font-semibold">{user.full_name || "Unnamed user"}</h2><div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{user.email || "No email"}</span></div></div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{user.phone || "No phone"}</div>
                <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{user.town?.name_en || "Town not set"}</div>
                <div className="text-xs">Joined {new Date(user.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</div>
              </div>
              <div className="flex flex-wrap gap-1 md:max-w-44 md:justify-end">{user.roles.map((role) => <Badge key={role} variant={role === "user" ? "secondary" : "default"}>{role.replace("_", " ")}</Badge>)}</div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}