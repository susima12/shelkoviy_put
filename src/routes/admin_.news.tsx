import { createFileRoute } from "@tanstack/react-router";
import AdminNews from "@/pages/AdminNews";

export const Route = createFileRoute("/admin_/news")({
  component: AdminNews,
});
