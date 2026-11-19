import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/moderator")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/moderator" });
  },
});
