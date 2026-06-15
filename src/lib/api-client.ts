const TOKEN_KEY = "shelk_put_token";
const SESSION_CACHE_MS = 60_000;
let sessionCache: { user: ApiUser | null; at: number } | null = null;
let sessionPromise: Promise<ApiUser | null> | null = null;

export type ApiUser = {
  id: string;
  email: string;
  display_name?: string | null;
  is_admin?: boolean;
  admin_competition_id?: string | null;
};

export type SessionResponse = {
  user: ApiUser | null;
  token?: string;
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  sessionCache = null;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("content-type") && options.body) {
    headers.set("content-type", "application/json");
  }
  const token = getToken();
  if (token && options.auth !== false) {
    headers.set("authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    throw new ApiError("Failed to fetch", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || data.message || `HTTP ${res.status}`, res.status);
  }
  return data as T;
}

export const api = {
  health: () => apiFetch<{ ok: boolean }>("/api/health", { auth: false }),

  // Токен из localStorage обязателен — иначе сессия не восстанавливается после входа
  getSession: () => apiFetch<SessionResponse>("/api/auth/session"),

  signIn: (email: string, password: string) =>
    apiFetch<SessionResponse>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      auth: false,
    }),

  signUp: (email: string, password: string, display_name: string) =>
    apiFetch<SessionResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
      auth: false,
    }),

  signOut: () => apiFetch("/api/auth/signout", { method: "POST", auth: false }),

  resetPasswordEnabled: () =>
    apiFetch<{ enabled: boolean }>("/api/auth/reset-password", { auth: false }),

  resetPassword: (email: string) =>
    apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      auth: false,
    }),

  confirmResetPassword: (token: string, password: string) =>
    apiFetch<{ ok: boolean; message?: string }>("/api/auth/reset-password/confirm", {
      method: "POST",
      body: JSON.stringify({ token, password }),
      auth: false,
    }),

  changePassword: (current_password: string, new_password: string) =>
    apiFetch<{ ok: boolean; token?: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),

  changeEmail: (current_password: string, new_email: string) =>
    apiFetch<{ ok: boolean; email: string; user: ApiUser; token?: string }>("/api/auth/change-email", {
      method: "POST",
      body: JSON.stringify({ current_password, new_email }),
    }),

  getCompetitions: (params?: { acceptingOnly?: boolean; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.acceptingOnly) q.set("accepting", "1");
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return apiFetch<{ data: CompetitionRow[] }>(`/api/competitions${qs ? `?${qs}` : ""}`, { auth: false });
  },

  getProfile: () => apiFetch<{ profile: ProfileRow | null }>("/api/profiles/me"),

  updateProfile: (data: Partial<ProfileRow>) =>
    apiFetch<{ profile: ProfileRow }>("/api/profiles/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  uploadAvatar: (image: string) =>
    apiFetch<{ profile: ProfileRow; avatar_url: string }>("/api/profiles/avatar", {
      method: "POST",
      body: JSON.stringify({ image }),
    }),

  submitApplication: (data: Record<string, unknown>) =>
    apiFetch("/api/applications", { method: "POST", body: JSON.stringify(data) }),

  getMyApplications: () => apiFetch<{ applications: ApplicationRow[]; competitions: Record<string, { name: string; slug: string }>; invites: Record<string, boolean> }>("/api/applications"),

  updateApplicationStatus: (id: string, status: string) =>
    apiFetch(`/api/applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getAdminDashboard: () => apiFetch<{ competition: CompetitionRow | null; applications: ApplicationRow[] }>("/api/admin/dashboard"),

  getAdminUsers: () => apiFetch<{ users: ProfileRow[] }>("/api/admin/users"),

  getJury: () => apiFetch<{ members: JuryRow[] }>("/api/jury", { auth: false }),

  getNews: () => apiFetch<{ news: NewsRow[] }>("/api/news", { auth: false }),

  getChat: (slug: string) => apiFetch<ChatState>(`/api/chat/${slug}`),

  sendChatMessage: (
    slug: string,
    payload: { content?: string; attachment?: ChatAttachmentPayload }
  ) => apiFetch(`/api/chat/${slug}`, { method: "POST", body: JSON.stringify(payload) }),

  inviteToChat: (slug: string, user_id: string) =>
    apiFetch(`/api/chat/${slug}`, { method: "POST", body: JSON.stringify({ action: "invite", user_id }) }),

  getConversations: () => apiFetch<{ conversations: DmConversation[] }>("/api/messages/conversations"),

  getMessages: (conversationId: string) =>
    apiFetch<{ messages: DmMessage[]; profiles: Record<string, ProfileRow> }>(`/api/messages/${conversationId}`),

  sendDm: (
    conversationId: string,
    payload: { content?: string; reply_to?: string; attachment?: ChatAttachmentPayload }
  ) =>
    apiFetch(`/api/messages/${conversationId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  searchProfiles: (q: string) =>
    apiFetch<{ profiles: ProfileRow[] }>(`/api/messages/search?q=${encodeURIComponent(q)}`),

  startConversation: (target: { username?: string; user_id?: string }) =>
    apiFetch<{ conversation_id: string }>("/api/messages/conversations", {
      method: "POST",
      body: JSON.stringify(target),
    }),
};

export type CompetitionRow = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description?: string | null;
  display_order: number;
  accepting_applications: boolean;
  age_categories: string[];
  nominations: string[];
};

export type ApplicationRow = {
  id: string;
  user_id: string;
  competition_id: string;
  leader_full_name: string;
  email: string;
  phone: string;
  country?: string | null;
  city?: string | null;
  organization?: string | null;
  participant_name: string;
  age_category?: string | null;
  nomination?: string | null;
  performance_title?: string | null;
  duration_minutes?: number | null;
  participants_count?: number | null;
  notes?: string | null;
  status: string;
  video_url?: string | null;
  attachment_path?: string | null;
  payment_receipt_path?: string | null;
  created_at: string;
};

export type ProfileRow = {
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  email?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

export type JuryRow = {
  id: string;
  full_name: string;
  title?: string | null;
  regalia?: string | null;
  country?: string | null;
  photo_url?: string | null;
};

export type NewsRow = {
  id: string;
  title: string;
  excerpt?: string | null;
  published_at: string;
};

export type ChatAttachmentPayload = {
  data: string;
  name: string;
  mime: string;
};

export function chatFileUrl(url: string): string {
  const token = getToken();
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

export type ChatState = {
  competition: CompetitionRow | null;
  messages: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    author_name: string;
    attachment_url?: string | null;
    attachment_name?: string | null;
    attachment_mime?: string | null;
  }[];
  is_admin: boolean;
  allowed: boolean;
  approved: { user_id: string; display_name: string; email: string }[];
  member_ids: string[];
};

export type DmConversation = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  other?: ProfileRow;
};

export type DmMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  pinned_at?: string | null;
  reply_to?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
};

// Auth event bus for header/profile updates
type AuthListener = (user: ApiUser | null) => void;
const listeners = new Set<AuthListener>();

export function onAuthChange(fn: AuthListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyAuthChange(user: ApiUser | null) {
  listeners.forEach((fn) => fn(user));
}

export async function restoreSession(force = false): Promise<ApiUser | null> {
  const token = getToken();
  if (!token) {
    sessionCache = { user: null, at: Date.now() };
    notifyAuthChange(null);
    return null;
  }

  if (!force && sessionCache && Date.now() - sessionCache.at < SESSION_CACHE_MS) {
    return sessionCache.user;
  }

  if (!force && sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    try {
      const { user, token: newToken } = await api.getSession();
      if (!user) {
        setToken(null);
        sessionCache = { user: null, at: Date.now() };
        notifyAuthChange(null);
        return null;
      }
      if (newToken) setToken(newToken);
      sessionCache = { user, at: Date.now() };
      notifyAuthChange(user);
      return user;
    } catch {
      setToken(null);
      sessionCache = { user: null, at: Date.now() };
      notifyAuthChange(null);
      return null;
    } finally {
      sessionPromise = null;
    }
  })();

  return sessionPromise;
}

export function invalidateSessionCache() {
  sessionCache = null;
  sessionPromise = null;
}
