import { createFileRoute } from "@tanstack/react-router";
import { getDb, getUserAdminRole, parseCompetitionRow } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse, parseJsonBody } from "@/server/auth";

export const Route = createFileRoute("/api/chat/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const db = getDb();
        const compRow = db
          .prepare("SELECT * FROM competitions WHERE slug = ?")
          .get(params.slug) as Record<string, unknown> | undefined;
        if (!compRow) return jsonResponse({ competition: null, messages: [], is_admin: false, allowed: false, approved: [], member_ids: [] });

        const competition = parseCompetitionRow(compRow);
        const adminRole = getUserAdminRole(db, user.id);
        const isAdmin = adminRole?.competition_id === competition.id;

        const member = db
          .prepare("SELECT id FROM chat_members WHERE competition_id = ? AND user_id = ? AND banned = 0")
          .get(competition.id, user.id);
        const allowed = isAdmin || !!member;

        const messages = allowed
          ? (db.prepare(`
              SELECT m.id, m.content, m.created_at, m.user_id, COALESCE(p.display_name, u.email) as author_name
              FROM chat_messages m
              JOIN users u ON u.id = m.user_id
              LEFT JOIN profiles p ON p.user_id = m.user_id
              WHERE m.competition_id = ?
              ORDER BY m.created_at ASC
              LIMIT 200
            `).all(competition.id) as unknown[])
          : [];

        const approved = isAdmin
          ? (db.prepare(`
              SELECT a.user_id, COALESCE(p.display_name, u.email) as display_name, u.email
              FROM applications a
              JOIN users u ON u.id = a.user_id
              LEFT JOIN profiles p ON p.user_id = a.user_id
              WHERE a.competition_id = ? AND a.status = 'approved'
            `).all(competition.id) as unknown[])
          : [];

        const members = db
          .prepare("SELECT user_id FROM chat_members WHERE competition_id = ? AND banned = 0")
          .all(competition.id) as { user_id: string }[];

        return jsonResponse({
          competition,
          messages,
          is_admin: isAdmin,
          allowed,
          approved,
          member_ids: members.map((m) => m.user_id),
        });
      },

      POST: async ({ request, params }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const body = await parseJsonBody<{ content?: string; action?: string; user_id?: string }>(request);
        const db = getDb();
        const comp = db.prepare("SELECT id FROM competitions WHERE slug = ?").get(params.slug) as { id: string } | undefined;
        if (!comp) return errorResponse("Конкурс не найден", 404);

        const adminRole = getUserAdminRole(db, user.id);
        const isAdmin = adminRole?.competition_id === comp.id;

        if (body.action === "invite" && isAdmin && body.user_id) {
          const existing = db
            .prepare("SELECT id FROM chat_members WHERE competition_id = ? AND user_id = ?")
            .get(comp.id, body.user_id);
          if (!existing) {
            db.prepare("INSERT INTO chat_members (id, competition_id, user_id) VALUES (?, ?, ?)").run(
              crypto.randomUUID(),
              comp.id,
              body.user_id
            );
          }
          return jsonResponse({ ok: true });
        }

        const member = db
          .prepare("SELECT id FROM chat_members WHERE competition_id = ? AND user_id = ? AND banned = 0")
          .get(comp.id, user.id);
        if (!isAdmin && !member) return errorResponse("Forbidden", 403);

        const content = body.content?.trim();
        if (!content) return errorResponse("Пустое сообщение");

        const id = crypto.randomUUID();
        db.prepare("INSERT INTO chat_messages (id, competition_id, user_id, content) VALUES (?, ?, ?, ?)").run(
          id,
          comp.id,
          user.id,
          content
        );
        return jsonResponse({ ok: true, id });
      },
    },
  },
});
