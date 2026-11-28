import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/towns")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/cities" });
  },
  component: () => null,
});
