import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@/lib/router-compat";
import { MessageSquare, ShieldAlert } from "lucide-react";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { api } from "@/lib/api-client";

const AdminUsers = () => {
  const nav = useNavigate();
  const { user, isReady } = useAuthReady();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      nav("/auth?redirect=/admin/users");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!user.is_admin) {
          if (!cancelled) { setIsAdmin(false); setLoading(false); }
          return;
        }
        setIsAdmin(true);
        const { users } = await api.getAdminUsers();
        if (!cancelled) setRows(users ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isReady, user, nav]);

  const filtered = rows.filter((r) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [r.display_name, r.username, r.email].some((v) => String(v ?? "").toLowerCase().includes(s));
  });

  if (loading) return <div className="container py-32 text-center">Загрузка...</div>;

  if (isAdmin === false) {
    return (
      <div className="container py-32 max-w-lg mx-auto">
        <Card className="p-10 text-center">
          <ShieldAlert className="h-12 w-12 text-gold mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Доступ только для администраторов.</p>
          <Button asChild variant="outline"><Link to="/admin">Назад</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <section className="py-16">
      <div className="container max-w-4xl">
        <h1 className="font-display text-3xl mb-6">Пользователи</h1>
        {error && <p className="text-destructive mb-4">{error}</p>}
        <Input placeholder="Поиск..." value={q} onChange={(e) => setQ(e.target.value)} className="mb-6 max-w-sm" />
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.user_id} className="p-4 flex items-center gap-4">
              <Avatar>
                <AvatarImage src={r.avatar_url ?? undefined} />
                <AvatarFallback>{(r.display_name ?? r.email ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.display_name ?? "Без имени"}</div>
                <div className="text-sm text-muted-foreground truncate">@{r.username} · {r.email}</div>
              </div>
              {r.username && (
                <Button asChild size="sm" variant="outline">
                  <Link to={`/admin/chat?to=${r.username}`}><MessageSquare className="h-3 w-3" /></Link>
                </Button>
              )}
              <Badge variant="secondary">{formatDate(r.created_at)}</Badge>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

function formatDate(d?: string) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("ru-RU"); } catch { return ""; }
}

export default AdminUsers;
