-- =============================================================================
-- Migration: 20241003000000_admin_roles_management.sql
-- Enables admin users to manage user roles and staff accounts
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Helper Function: is_admin (checks if user is admin or super_admin)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin(
  _user_id uuid DEFAULT auth.uid()
) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('super_admin', 'admin')
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Update is_staff to include reporter role (using existing _user_id parameter name)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_staff(
  _user_id uuid DEFAULT auth.uid()
) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('super_admin', 'admin', 'editor', 'moderator', 'reporter')
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS Policies on user_roles and profiles
-- ─────────────────────────────────────────────────────────────────────────────

-- Grant admins and super_admins full management rights on user_roles
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL USING (
    public.is_admin(auth.uid())
  );

-- Allow admins and super_admins to update profiles
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (
    public.is_admin(auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC Functions for Role & User Management
-- ─────────────────────────────────────────────────────────────────────────────

-- 4.1 admin_assign_role: Assign a role to a user
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  target_user_id uuid,
  target_role public.app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  -- Verify caller is admin or super_admin
  IF NOT public.is_admin(caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can assign roles';
  END IF;

  -- Only super_admin can grant super_admin
  IF target_role = 'super_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = caller_id AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Only a super_admin can grant the super_admin role';
    END IF;
  END IF;

  -- Insert role into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- If assigning a staff role, clean up default 'user' role if present
  IF target_role <> 'user' THEN
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'user';
  END IF;

  -- Log action
  INSERT INTO public.admin_activity_logs (actor_id, action, entity, entity_id)
  VALUES (caller_id, 'assign_role_' || target_role::text, 'user_role', target_user_id);

  RETURN true;
END;
$$;

-- 4.2 admin_remove_role: Remove a role from a user
CREATE OR REPLACE FUNCTION public.admin_remove_role(
  target_user_id uuid,
  target_role public.app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  super_admin_count integer;
  remaining_roles_count integer;
BEGIN
  -- Verify caller is admin or super_admin
  IF NOT public.is_admin(caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can remove roles';
  END IF;

  -- Cannot remove your own admin/super_admin role
  IF caller_id = target_user_id AND target_role IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'You cannot remove your own admin role';
  END IF;

  -- If removing super_admin, verify caller is super_admin and not the last one
  IF target_role = 'super_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = caller_id AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Only a super_admin can remove super_admin role';
    END IF;

    SELECT count(*) INTO super_admin_count
    FROM public.user_roles
    WHERE role = 'super_admin';

    IF super_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last super_admin';
    END IF;
  END IF;

  -- Delete the role
  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role = target_role;

  -- If target has no remaining roles, restore default 'user' role
  SELECT count(*) INTO remaining_roles_count
  FROM public.user_roles
  WHERE user_id = target_user_id;

  IF remaining_roles_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Log action
  INSERT INTO public.admin_activity_logs (actor_id, action, entity, entity_id)
  VALUES (caller_id, 'remove_role_' || target_role::text, 'user_role', target_user_id);

  RETURN true;
END;
$$;

-- 4.3 admin_update_user_profile: Update profile information
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  target_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_town_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can update user profiles';
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    town_id = COALESCE(p_town_id, town_id),
    updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO public.admin_activity_logs (actor_id, action, entity, entity_id)
  VALUES (caller_id, 'update_profile', 'profile', target_user_id);

  RETURN true;
END;
$$;

-- 4.4 admin_delete_user: Safely remove a user account
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_id uuid := auth.uid();
  target_is_super_admin boolean;
  super_admin_count integer;
BEGIN
  IF NOT public.is_admin(caller_id) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can delete users';
  END IF;

  IF caller_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account from the admin panel';
  END IF;

  -- Check if target is super_admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'super_admin'
  ) INTO target_is_super_admin;

  IF target_is_super_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = caller_id AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Only a super_admin can delete another super_admin';
    END IF;

    SELECT count(*) INTO super_admin_count
    FROM public.user_roles
    WHERE role = 'super_admin';

    IF super_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot delete the last super_admin';
    END IF;
  END IF;

  -- Delete from auth.users (cascades to profiles and user_roles)
  DELETE FROM auth.users WHERE id = target_user_id;

  -- Log action
  INSERT INTO public.admin_activity_logs (actor_id, action, entity, entity_id)
  VALUES (caller_id, 'delete_user', 'user', target_user_id);

  RETURN true;
END;
$$;
