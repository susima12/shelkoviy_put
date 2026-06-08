import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db";
import { errorResponse, getUserFromRequest, jsonResponse, parseJsonBody } from "@/server/auth";

export const Route = createFileRoute("/api/applications")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const db = getDb();
        const applications = db
          .prepare("SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC")
          .all(user.id);

        const comps = db.prepare("SELECT id, name, slug FROM competitions").all() as {
          id: string;
          name: string;
          slug: string;
        }[];
        const compMap: Record<string, { name: string; slug: string }> = {};
        comps.forEach((c) => {
          compMap[c.id] = { name: c.name, slug: c.slug };
        });

        const members = db
          .prepare("SELECT competition_id FROM chat_members WHERE user_id = ? AND banned = 0")
          .all(user.id) as { competition_id: string }[];
        const invites: Record<string, boolean> = {};
        members.forEach((m) => {
          invites[m.competition_id] = true;
        });

        return jsonResponse({ applications, competitions: compMap, invites });
      },

      POST: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return errorResponse("Unauthorized", 401);

        const body = await parseJsonBody<Record<string, unknown>>(request);
        const competition_id = String(body.competition_id || "");
        if (!competition_id) return errorResponse("Выберите конкурс");

        const db = getDb();
        const comp = db.prepare("SELECT id FROM competitions WHERE id = ?").get(competition_id);
        if (!comp) return errorResponse("Конкурс не найден", 404);

        const id = crypto.randomUUID();
        db.prepare(`
          INSERT INTO applications (
            id, user_id, competition_id, leader_full_name, email, phone, country, city,
            organization, participant_name, age_category, nomination, performance_title,
            duration_minutes, participants_count, notes, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
        `).run(
          id,
          user.id,
          competition_id,
          body.leader_full_name,
          body.email,
          body.phone,
          body.country ?? null,
          body.city ?? null,
          body.organization ?? null,
          body.participant_name,
          body.age_category ?? null,
          body.nomination ?? null,
          body.performance_title ?? null,
          body.duration_minutes ?? null,
          body.participants_count ?? null,
          body.notes ?? null
        );

        return jsonResponse({ ok: true, id }, 201);
      },
    },
  },
});
