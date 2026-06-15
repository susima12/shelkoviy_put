import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/NewsDetail";

export const Route = createFileRoute("/news/$id")({
  component: Page,
});
