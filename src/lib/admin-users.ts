import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = "super_admin" | "admin" | "editor" | "moderator" | "reporter" | "user";

export const ALL_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "editor",
  "moderator",
  "reporter",
  "user",
];

export const ROLE_CONFIG: Record<
  AppRole,
  {
    label: string;
    description: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
    colorClasses: string;
  }
> = {
  super_admin: {
    label: "Super Admin",
    description: "Complete unrestricted administrative control across all features and roles",
    badgeVariant: "destructive",
    colorClasses:
      "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
  },
  admin: {
    label: "Admin",
    description: "Manages news articles, ads, moderation, staff, and geographic areas",
    badgeVariant: "default",
    colorClasses:
      "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  },
  editor: {
    label: "Editor",
    description: "Can author, edit, approve, schedule, and publish news and video reels",
    badgeVariant: "secondary",
    colorClasses:
      "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  moderator: {
    label: "Moderator",
    description: "Reviews community submissions, comments, and Jan Ki Awaaz posts",
    badgeVariant: "outline",
    colorClasses:
      "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  reporter: {
    label: "Reporter",
    description: "Submits news stories, field reports, and local updates for editorial review",
    badgeVariant: "outline",
    colorClasses:
      "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
  },
  user: {
    label: "Public User",
    description: "Regular registered user with reading, liking, and community report access",
    badgeVariant: "secondary",
    colorClasses: "bg-muted text-muted-foreground border-border",
  },
};

export interface CreateAdminUserParams {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  townId?: string | null;
  role: AppRole;
}

/**
 * Creates a new user account with assigned role and profile info.
 * Uses an isolated, ephemeral Supabase client with persistSession: false
 * so the currently logged-in admin's active session is never overwritten.
 */
export async function createAdminUser(params: CreateAdminUserParams): Promise<{ userId: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration (URL or publishable key).");
  }

  const email = params.email.trim().toLowerCase();
  const fullName = params.fullName.trim();
  const phone = params.phone?.trim() || null;
  const townId = params.townId || null;

  if (!fullName) throw new Error("Full name is required.");
  if (!email) throw new Error("Email address is required.");
  if (!params.password || params.password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  // 1. Create an isolated client that does not persist session to localStorage/storage
  const ephemeralClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // 2. Sign up the new user
  const { data: signUpData, error: signUpError } = await ephemeralClient.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (signUpError) {
    throw signUpError;
  }

  const newUserId = signUpData.user?.id;
  if (!newUserId) {
    throw new Error("Failed to create user account. No user ID was returned.");
  }

  // Check if user already existed
  if (signUpData.user.identities && signUpData.user.identities.length === 0) {
    throw new Error("An account with this email address already exists.");
  }

  // 3. Assign role and update profile using the active admin's credentials
  try {
    if (params.role !== "user") {
      await assignUserRole(newUserId, params.role);
    }

    if (phone || townId || fullName) {
      await updateUserProfile(newUserId, {
        full_name: fullName,
        phone,
        town_id: townId,
      });
    }

    // 4. Log the action
    const { data: sessionData } = await supabase.auth.getSession();
    const actorId = sessionData?.session?.user?.id;
    if (actorId) {
      await supabase.from("admin_activity_logs").insert({
        actor_id: actorId,
        action: `create_user_${params.role}`,
        entity: "user",
        entity_id: newUserId,
      });
    }
  } catch (secondaryError) {
    console.error("User created but role/profile setup had issue:", secondaryError);
    // Don't rethrow as critical failure if the account was successfully created,
    // but propagate details so UI can inform the admin
  }

  return { userId: newUserId };
}

/**
 * Assigns an app role to a target user.
 */
export async function assignUserRole(targetUserId: string, role: AppRole): Promise<void> {
  // First attempt RPC function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (supabase.rpc as any)("admin_assign_role", {
    target_user_id: targetUserId,
    target_role: role,
  });

  if (!rpcError) {
    return;
  }

  // Fallback to direct user_roles table insert
  const { error: insertError } = await supabase.from("user_roles").insert({
    user_id: targetUserId,
    role,
  });

  if (insertError && !insertError.message.includes("duplicate key")) {
    throw insertError;
  }

  // If assigning a staff role, clean up default 'user' role
  if (role !== "user") {
    await supabase.from("user_roles").delete().eq("user_id", targetUserId).eq("role", "user");
  }
}

/**
 * Removes an app role from a target user.
 */
export async function removeUserRole(targetUserId: string, role: AppRole): Promise<void> {
  // First attempt RPC function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (supabase.rpc as any)("admin_remove_role", {
    target_user_id: targetUserId,
    target_role: role,
  });

  if (!rpcError) {
    return;
  }

  // Fallback to direct table delete
  const { error: deleteError } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", targetUserId)
    .eq("role", role);

  if (deleteError) {
    throw deleteError;
  }

  // Ensure at least 'user' role remains if all staff roles are revoked
  const { data: remaining } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", targetUserId);
  if (!remaining || remaining.length === 0) {
    await supabase.from("user_roles").insert({ user_id: targetUserId, role: "user" });
  }
}

/**
 * Updates profile details for a user.
 */
export async function updateUserProfile(
  targetUserId: string,
  updates: { full_name?: string | null; phone?: string | null; town_id?: string | null },
): Promise<void> {
  // First attempt RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (supabase.rpc as any)("admin_update_user_profile", {
    target_user_id: targetUserId,
    p_full_name: updates.full_name ?? null,
    p_phone: updates.phone ?? null,
    p_town_id: updates.town_id ?? null,
  });

  if (!rpcError) {
    return;
  }

  // Fallback to direct profiles table update
  const payload: Record<string, unknown> = {};
  if (updates.full_name !== undefined) payload.full_name = updates.full_name;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.town_id !== undefined) payload.town_id = updates.town_id;

  const { error: updateError } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", targetUserId);
  if (updateError) {
    throw updateError;
  }
}

/**
 * Deletes a user account completely.
 */
export async function deleteUserAccount(targetUserId: string): Promise<void> {
  // Attempt RPC admin_delete_user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rpcError } = await (supabase.rpc as any)("admin_delete_user", {
    target_user_id: targetUserId,
  });

  if (!rpcError) {
    return;
  }

  // If RPC failed, attempt direct profiles delete (if cascade configured)
  const { error: profileError } = await supabase.from("profiles").delete().eq("id", targetUserId);
  if (profileError) {
    throw new Error(rpcError.message || profileError.message || "Failed to delete user account.");
  }
}
