import { createFileRoute } from "@tanstack/react-router";
import { readFileSync } from "node:fs";
import { getDb } from "@/server/db";
import { errorResponse, getUserFromRequest, verifyToken } from "@/server/auth";
import { chatFilePath, userCanAccessChatFile } from "@/server/chat-files";

async function userFromFileRequest(request: Request) {
  const fromHeader = await getUserFromRequest(request);
  if (fromHeader) return fromHeader;
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return null;
  return verifyToken(token);
}

export const Route = createFileRoute("/api/files/chat/$messageId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await userFromFileRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const db = getDb();
        const access = userCanAccessChatFile(db, user.id, params.messageId);
        if (!access) return new Response("Forbidden", { status: 403 });

        const path = chatFilePath(access.kind, params.messageId, access.mime);
        if (!path) return new Response("Not found", { status: 404 });

        const data = readFileSync(path);
        const mime = access.mime || "application/octet-stream";
        const filename = access.name || "file";

        return new Response(data, {
          status: 200,
          headers: {
            "content-type": mime,
            "cache-control": "private, max-age=3600",
            "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
          },
        });
      },
    },
  },
});
