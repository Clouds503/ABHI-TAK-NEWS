import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Mail,
  MapPin,
  Phone,
  Search,
  UserRound,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  MoreVertical,
  Pencil,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Check,
  Users,
  Calendar,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AppRole,
  ALL_ROLES,
  ROLE_CONFIG,
  createAdminUser,
  assignUserRole,
  removeUserRole,
  updateUserProfile,
  deleteUserAccount,
} from "@/lib/admin-users";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User & Admin Management — Abhitak CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersAdmin,
});

interface UserProfileWithRoles {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  town_id: string | null;
  created_at: string;
  town?: { id: string; name_en: string; name_hi: string } | null;
  roles: AppRole[];
}

function generateRandomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let pwd = "Abhi#";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function UsersAdmin() {
  const { user: currentAuthUser } = useAuth();
  const qc = useQueryClient();

  // Filters
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "staff" | "users">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState<UserProfileWithRoles | null>(null);
  const [editProfileUser, setEditProfileUser] = useState<UserProfileWithRoles | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserProfileWithRoles | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    townId: "",
    role: "admin" as AppRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit profile form state
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    townId: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Role management state
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  // Fetch users & roles
  const {
    data: usersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesResult, rolesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*, town:towns(id, name_en, name_hi)")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;

      const rolesMap = new Map<string, AppRole[]>();
      rolesResult.data.forEach((row) => {
        const current = rolesMap.get(row.user_id) ?? [];
        if (!current.includes(row.role as AppRole)) {
          rolesMap.set(row.user_id, [...current, row.role as AppRole]);
        }
      });

      return (profilesResult.data as unknown as UserProfileWithRoles[]).map((profile) => ({
        ...profile,
        roles: rolesMap.get(profile.id) ?? ["user"],
      }));
    },
  });

  // Fetch towns for dropdowns
  const { data: townsData } = useQuery({
    queryKey: ["admin-towns-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("towns")
        .select("id, name_en, name_hi")
        .eq("is_active", true)
        .order("name_en");
      return data ?? [];
    },
  });

  // Calculate overview counts
  const stats = useMemo(() => {
    if (!usersData) return { total: 0, staff: 0, admins: 0, regular: 0 };
    let staffCount = 0;
    let adminCount = 0;
    let regularCount = 0;

    usersData.forEach((u) => {
      const isStaff = u.roles.some((r) =>
        ["super_admin", "admin", "editor", "moderator", "reporter"].includes(r),
      );
      const isAdmin = u.roles.some((r) => ["super_admin", "admin"].includes(r));
      if (isStaff) staffCount++;
      if (isAdmin) adminCount++;
      if (!isStaff || u.roles.includes("user")) regularCount++;
    });

    return {
      total: usersData.length,
      staff: staffCount,
      admins: adminCount,
      regular: regularCount,
    };
  }, [usersData]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!usersData) return [];
    const normalized = query.trim().toLowerCase();

    return usersData.filter((user) => {
      // Tab filter
      const isStaff = user.roles.some((r) =>
        ["super_admin", "admin", "editor", "moderator", "reporter"].includes(r),
      );
      if (activeTab === "staff" && !isStaff) return false;
      if (activeTab === "users" && isStaff) return false;

      // Role filter dropdown
      if (roleFilter !== "all" && !user.roles.includes(roleFilter as AppRole)) {
        return false;
      }

      // Search query
      if (normalized) {
        const matchString =
          `${user.full_name ?? ""} ${user.email ?? ""} ${user.phone ?? ""} ${user.town?.name_en ?? ""} ${user.town?.name_hi ?? ""}`.toLowerCase();
        if (!matchString.includes(normalized)) return false;
      }

      return true;
    });
  }, [usersData, query, activeTab, roleFilter]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setCreateForm({
      fullName: "",
      email: "",
      password: generateRandomPassword(),
      phone: "",
      townId: "",
      role: "admin",
    });
    setShowPassword(true);
    setCreateOpen(true);
  };

  // Submit Create New Admin / Staff
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName.trim()) {
      toast.error("Please enter a full name.");
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsCreating(true);
    try {
      await createAdminUser({
        fullName: createForm.fullName,
        email: createForm.email,
        password: createForm.password,
        phone: createForm.phone,
        townId: createForm.townId || null,
        role: createForm.role,
      });

      toast.success(
        `User ${createForm.fullName} created with ${ROLE_CONFIG[createForm.role].label} access!`,
      );
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to create user.";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Open Manage Roles Dialog
  const handleOpenRoles = (user: UserProfileWithRoles) => {
    setRoleModalUser(user);
    setSelectedRoles([...user.roles]);
  };

  // Save Managed Roles
  const handleSaveRoles = async () => {
    if (!roleModalUser) return;
    setIsSavingRoles(true);

    try {
      const originalRoles = new Set(roleModalUser.roles);
      const newRoles = new Set(selectedRoles);

      // Roles to add
      const toAdd = selectedRoles.filter((r) => !originalRoles.has(r));
      // Roles to remove
      const toRemove = roleModalUser.roles.filter((r) => !newRoles.has(r));

      for (const role of toAdd) {
        await assignUserRole(roleModalUser.id, role);
      }
      for (const role of toRemove) {
        await removeUserRole(roleModalUser.id, role);
      }

      toast.success("User roles updated successfully.");
      setRoleModalUser(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to update roles.";
      toast.error(msg);
    } finally {
      setIsSavingRoles(false);
    }
  };

  // Open Edit Profile Dialog
  const handleOpenEditProfile = (user: UserProfileWithRoles) => {
    setEditProfileUser(user);
    setEditForm({
      fullName: user.full_name || "",
      phone: user.phone || "",
      townId: user.town_id || "",
    });
  };

  // Save Edit Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileUser) return;

    setIsSavingProfile(true);
    try {
      await updateUserProfile(editProfileUser.id, {
        full_name: editForm.fullName.trim() || null,
        phone: editForm.phone.trim() || null,
        town_id: editForm.townId || null,
      });

      toast.success("User profile updated successfully.");
      setEditProfileUser(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Delete User Confirmation
  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    try {
      await deleteUserAccount(deleteTargetUser.id);
      toast.success(`User ${deleteTargetUser.full_name || deleteTargetUser.email} was removed.`);
      setDeleteTargetUser(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to delete user.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Users & Staff</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {stats.total} total
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Provision new administrators, assign newsroom roles, and manage app accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2 shadow-sm">
            <UserPlus className="h-4 w-4" />
            Create Admin / Staff
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">All Accounts</span>
            <Users className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.total}</div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-xs font-medium uppercase tracking-wider">Admins</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.admins}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-medium uppercase tracking-wider">Newsroom Staff</span>
            <Shield className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.staff}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Public Users</span>
            <UserRound className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold">{stats.regular}</div>
        </div>
      </div>

      {/* Filter Bar & Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Segmented Filter Buttons */}
          <div className="flex rounded-lg bg-muted p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "rounded-md px-3 py-1.5 transition-all",
                activeTab === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All Users ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("staff")}
              className={cn(
                "rounded-md px-3 py-1.5 transition-all",
                activeTab === "staff"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Admins & Staff ({stats.staff})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={cn(
                "rounded-md px-3 py-1.5 transition-all",
                activeTab === "users"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Regular Users ({stats.regular})
            </button>
          </div>

          {/* Role Filter Dropdown */}
          <div className="w-full sm:w-48">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_CONFIG[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone number, or town..."
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Users List Container */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="mt-2">Loading user accounts…</span>
          </div>
        )}

        {!isLoading && filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <UserRound className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-3 text-base font-semibold">No users matched your search</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search terms or filters, or create a new user.
            </p>
            <Button onClick={handleOpenCreate} variant="outline" size="sm" className="mt-4 gap-1.5">
              <UserPlus className="h-4 w-4" /> Create New User
            </Button>
          </div>
        )}

        {!isLoading && filteredUsers.length > 0 && (
          <div className="divide-y">
            {filteredUsers.map((user) => {
              const isCurrentUser = currentAuthUser?.id === user.id;
              const isStaffUser = user.roles.some((r) =>
                ["super_admin", "admin", "editor", "moderator", "reporter"].includes(r),
              );

              return (
                <article
                  key={user.id}
                  className="grid gap-4 p-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_auto] md:items-center"
                >
                  {/* User Profile */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        "relative grid h-11 w-11 shrink-0 place-items-center rounded-full font-semibold",
                        isStaffUser
                          ? "bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {user.full_name ? (
                        user.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      ) : (
                        <UserRound className="h-5 w-5" />
                      )}
                      {isStaffUser && (
                        <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] text-primary-foreground shadow-xs">
                          <Shield className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-semibold text-foreground">
                          {user.full_name || "Unnamed user"}
                        </h2>
                        {isCurrentUser && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] py-0 px-1.5 font-normal"
                          >
                            You
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{user.email || "No email assigned"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{user.phone || "No phone number"}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {user.town?.name_en || user.town?.name_hi || "All regions / Not set"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Joined{" "}
                        {new Date(user.created_at).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Badges & Action Menu */}
                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => {
                        const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.user;
                        return (
                          <Badge
                            key={role}
                            variant="outline"
                            className={cn(
                              "text-[11px] font-medium border px-2 py-0.5 shadow-2xs",
                              cfg.colorClasses,
                            )}
                          >
                            {cfg.label}
                          </Badge>
                        );
                      })}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleOpenRoles(user)}
                          className="gap-2 cursor-pointer"
                        >
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Manage Roles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenEditProfile(user)}
                          className="gap-2 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit Profile Info
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTargetUser(user)}
                          disabled={isCurrentUser}
                          className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* DIALOG 1: Create New Admin / Staff */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="h-5 w-5 text-primary" />
              Create New Admin or Staff
            </DialogTitle>
            <DialogDescription>
              Provision a new newsroom account with administrative privileges. The user can
              immediately sign in with these credentials.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="e.g. Vikram Sharma"
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. vikram@abhitak.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 text-xs text-primary"
                  onClick={() =>
                    setCreateForm({ ...createForm, password: generateRandomPassword() })
                  }
                >
                  <Sparkles className="h-3 w-3" /> Generate Password
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="pr-10 font-mono text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Save or share this password securely with the new team member.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+91 9876543210"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="townId">Assigned Town</Label>
                <Select
                  value={createForm.townId || "none"}
                  onValueChange={(val) =>
                    setCreateForm({ ...createForm, townId: val === "none" ? "" : val })
                  }
                >
                  <SelectTrigger id="townId">
                    <SelectValue placeholder="Select town" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific town</SelectItem>
                    {townsData?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name_en} ({t.name_hi})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Role Selection */}
            <div className="grid gap-2">
              <Label htmlFor="role">Initial Access Role *</Label>
              <Select
                value={createForm.role}
                onValueChange={(val) => setCreateForm({ ...createForm, role: val as AppRole })}
              >
                <SelectTrigger id="role" className="h-auto py-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">Admin</div>
                    <div className="text-xs text-muted-foreground">
                      Full newsroom, ads, moderation & user controls
                    </div>
                  </SelectItem>
                  <SelectItem value="super_admin">
                    <div className="font-semibold text-purple-600 dark:text-purple-400">
                      Super Admin
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Complete root privileges and role administration
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="font-semibold text-amber-600 dark:text-amber-400">Editor</div>
                    <div className="text-xs text-muted-foreground">
                      Publish and review news articles, videos & reels
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Moderator
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Moderate Jan Ki Awaaz posts and comments
                    </div>
                  </SelectItem>
                  <SelectItem value="reporter">
                    <div className="font-semibold text-cyan-600 dark:text-cyan-400">Reporter</div>
                    <div className="text-xs text-muted-foreground">
                      Submit local news drafts and field updates
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Note:</span> Your current admin
              session will not be disrupted when creating this user.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="gap-2">
                {isCreating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {isCreating ? "Creating User…" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Manage Roles */}
      <Dialog open={!!roleModalUser} onOpenChange={(open) => !open && setRoleModalUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Manage Roles & Permissions
            </DialogTitle>
            <DialogDescription>
              Assign or revoke roles for{" "}
              <strong className="text-foreground">
                {roleModalUser?.full_name || roleModalUser?.email}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              {ALL_ROLES.map((role) => {
                const config = ROLE_CONFIG[role];
                const isSelected = selectedRoles.includes(role);
                const isSelf = currentAuthUser?.id === roleModalUser?.id;
                const isSelfAdmin = isSelf && (role === "admin" || role === "super_admin");

                return (
                  <label
                    key={role}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:bg-muted/50",
                      isSelfAdmin && "opacity-80 cursor-not-allowed",
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isSelfAdmin}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, role]);
                        } else {
                          setSelectedRoles(selectedRoles.filter((r) => r !== role));
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{config.label}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", config.colorClasses)}
                        >
                          {role}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{config.description}</p>
                      {isSelfAdmin && (
                        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                          (Cannot remove your own admin access)
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleModalUser(null)}
                disabled={isSavingRoles}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveRoles} disabled={isSavingRoles} className="gap-2">
                {isSavingRoles ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isSavingRoles ? "Saving Roles…" : "Save Roles"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Edit Profile */}
      <Dialog open={!!editProfileUser} onOpenChange={(open) => !open && setEditProfileUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Profile Information
            </DialogTitle>
            <DialogDescription>
              Update name, phone number, and location for{" "}
              <strong className="text-foreground">{editProfileUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label htmlFor="editFullName">Full Name</Label>
              <Input
                id="editFullName"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                placeholder="Full Name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editPhone">Phone Number</Label>
              <Input
                id="editPhone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editTown">Assigned Town / Region</Label>
              <Select
                value={editForm.townId || "none"}
                onValueChange={(val) =>
                  setEditForm({ ...editForm, townId: val === "none" ? "" : val })
                }
              >
                <SelectTrigger id="editTown">
                  <SelectValue placeholder="Select town" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific town</SelectItem>
                  {townsData?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name_en} ({t.name_hi})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditProfileUser(null)}
                disabled={isSavingProfile}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingProfile} className="gap-2">
                {isSavingProfile ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isSavingProfile ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Delete User Confirmation */}
      <AlertDialog
        open={!!deleteTargetUser}
        onOpenChange={(open) => !open && setDeleteTargetUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the account for{" "}
              <strong className="text-foreground">
                {deleteTargetUser?.full_name || deleteTargetUser?.email}
              </strong>
              ? This will revoke all permissions and delete their user profile. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
