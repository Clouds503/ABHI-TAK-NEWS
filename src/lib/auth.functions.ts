import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const autoConfirmInput = z.object({
  email: z.string().trim().email(),
  userId: z.string().uuid().optional(),
});

/**
 * Server function to automatically confirm a user's email on signup
 * so that email verification is completely bypassed and the user is
 * immediately logged in.
 */
export const autoConfirmUserFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => autoConfirmInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let uid = data.userId;

      if (!uid) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        if (listErr) throw listErr;
        const target = list.users.find(
          (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
        );
        if (target) {
          uid = target.id;
        }
      }

      if (uid) {
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(uid, {
          email_confirm: true,
        });
        if (updateErr) throw updateErr;
        return { confirmed: true, userId: uid };
      }

      return { confirmed: false, error: "User not found" };
    } catch (err: unknown) {
      console.error("[autoConfirmUserFn] Error confirming user:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return { confirmed: false, error: msg };
    }
  });
