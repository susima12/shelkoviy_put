import { createFileRoute } from "@tanstack/react-router";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const uploadsDir = join(process.cwd(), "data", "uploads", "avatars");
const MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function findAvatar(userId: string): { path: string; type: string } | null {
  for (const ext of ["jpeg", "jpg", "png", "webp"]) {
    const path = join(uploadsDir, `${userId}.${ext}`);
    if (existsSync(path)) return { path, type: MIME[ext] };
  }
  return null;
}

export const Route = createFileRoute("/api/profiles/avatar/$userId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const userId = params.userId.replace(/\.(jpe?g|png|webp)$/i, "");
        const file = findAvatar(userId);
        if (!file) return new Response("Not found", { status: 404 });

        const data = readFileSync(file.path);
        return new Response(data, {
          status: 200,
          headers: {
            "content-type": file.type,
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
