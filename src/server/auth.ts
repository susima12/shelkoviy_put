import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "shelk-put-dev-secret-change-in-production"
);

export type AuthUser = {
  id: string;
  email: string;
  display_name?: string | null;
  is_admin?: boolean;
  admin_competition_id?: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    display_name: user.display_name ?? null,
    is_admin: user.is_admin ?? false,
    admin_competition_id: user.admin_competition_id ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const id = payload.sub;
    if (!id || typeof id !== "string") return null;
    return {
      id,
      email: String(payload.email ?? ""),
      display_name: (payload.display_name as string | null) ?? null,
      is_admin: Boolean(payload.is_admin),
      admin_competition_id: (payload.admin_competition_id as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function getUserFromRequest(req: Request): Promise<AuthUser | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyToken(token);
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export async function parseJsonBody<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}
