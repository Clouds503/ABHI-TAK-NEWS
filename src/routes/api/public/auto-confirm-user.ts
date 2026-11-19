import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email(),
  userId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/api/public/auto-confirm-user")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          const parsed = schema.safeParse(body);
          if (!parsed.success) {
            return Response.json({ confirmed: false, error: "Invalid email" }, { status: 400 });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          let uid = parsed.data.userId;

          if (!uid) {
            const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
            if (listErr) {
              return Response.json({ confirmed: false, error: listErr.message }, { status: 500 });
            }
            const target = list.users.find(
              (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase(),
            );
            if (target) {
              uid = target.id;
            }
          }

          if (uid) {
            const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(uid, {
              email_confirm: true,
            });
            if (updateErr) {
              return Response.json({ confirmed: false, error: updateErr.message }, { status: 500 });
            }
            return Response.json({ confirmed: true, userId: uid });
          }

          return Response.json({ confirmed: false, error: "User not found" }, { status: 404 });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ confirmed: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
