import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reporter")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/reporter" });
  },
});
