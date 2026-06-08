import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { api, notifyAuthChange, setToken } from "@/lib/api-client";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, LogOut, ShieldAlert, Check, X, Clock, MessageCircle } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";
import { ADMIN_HINTS } from "@/lib/admin-credentials";

const Admin = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [competition, setCompetition] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { competition: comp, applications: apps } = await api.getAdminDashboard();
      setAuthed(true);
      if (!comp) {
        setError("Этот аккаунт не является администратором какого-либо конкурса.");
        return;
      }
      setCompetition(comp);
      setApplications(apps ?? []);
    } catch (e: any) {
      if (e?.status === 401) {
        setAuthed(false);
        return;
      }
      console.error("Admin load failed", e);
      setError(translateError(e, "Не удалось загрузить админ-панель"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const adminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { user, token } = await api.signIn(email.trim().toLowerCase(), password);
      if (!user || !token) throw new Error("Не удалось войти");
      setToken(token);
      notifyAuthChange(user);
      if (!user.is_admin) {
        toast.error("Этот аккаунт не является администратором конкурса");
        return;
      }
      setLoading(true);
      setError(null);
      setAuthed(true);
      await load();
      toast.success("Вход выполнен");
    } catch (err: any) {
      toast.error(translateError(err, "Ошибка входа"));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api.signOut();
    setToken(null);
    notifyAuthChange(null);
    setAuthed(false);
    setCompetition(null);
    setApplications([]);
    setError(null);
  };

  const exportCsv = () => {
    if (applications.length === 0) {
      toast.info("Нет заявок для экспорта");
      return;
    }
    const headers = [
      "Дата", "Статус", "Возраст", "Номинация",
      "Руководитель", "Email", "Телефон", "Страна", "Город", "Организация",
      "Участник", "Название номера", "Длительность", "Кол-во участников",
      "Видео", "Файл", "Чек", "Примечания",
    ];
    const csv = [
      headers.join(";"),
      ...applications.map((r) =>
        [
          format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
          r.status,
          r.age_category ?? "", r.nomination ?? "",
          r.leader_full_name, r.email, r.phone,
          r.country ?? "", r.city ?? "", r.organization ?? "",
          r.participant_name, r.performance_title ?? "",
          r.duration_minutes ?? "", r.participants_count ?? "",
          r.video_url ?? "", r.attachment_path ?? "", r.payment_receipt_path ?? "",
          (r.notes ?? "").replace(/[\r\n;]/g, " "),
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")
      ),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${competition?.slug}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const updateStatus = async (id: string, value: string) => {
    try {
      await api.updateApplicationStatus(id, value);
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: value } : a)));
      toast.success("Статус обновлён");
    } catch (e) {
      toast.error(translateError(e));
    }
  };

  if (loading) return <div className="container py-32 text-center">Загрузка...</div>;

  if (!authed) {
    return (
      <>
        <PageHero eyebrow="Админ-панель" title="Вход для администраторов" description="У каждого конкурса свой администратор и своя панель." />
        <section className="py-16">
          <div className="container grid lg:grid-cols-2 gap-8 max-w-5xl">
            <Card className="p-8">
              <form onSubmit={adminLogin} className="space-y-4">
                <div>
                  <Label>Email администратора</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin_horeograph@festival.local" />
                </div>
                <div>
                  <Label>Пароль</Label>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" variant="wine" className="w-full" disabled={busy}>
                  {busy ? "Входим..." : "Войти в панель"}
                </Button>
              </form>
            </Card>
            <Card className="p-6">
              <h3 className="font-serif text-lg mb-3">Учётные данные администраторов</h3>
              <div className="text-xs space-y-1 max-h-[400px] overflow-auto">
                <div className="grid grid-cols-[1fr_1.6fr_0.8fr] gap-2 font-semibold text-muted-foreground border-b pb-1 mb-1">
                  <span>Конкурс</span><span>Email</span><span>Пароль</span>
                </div>
                {ADMIN_HINTS.map(([n, em, pw]) => (
                  <div key={em} className="grid grid-cols-[1fr_1.6fr_0.8fr] gap-2">
                    <span>{n}</span>
                    <button type="button" className="text-left hover:text-primary truncate" onClick={() => { setEmail(em); setPassword(pw); }}>{em}</button>
                    <span className="font-mono">{pw}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Нажмите на email, чтобы подставить данные в форму.</p>
            </Card>
          </div>
        </section>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHero eyebrow="Доступ" title="Нет прав администратора" />
        <section className="py-20">
          <div className="container max-w-xl">
            <Card className="p-8 text-center">
              <ShieldAlert className="h-12 w-12 text-gold mx-auto mb-4" />
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4" /> Выйти</Button>
            </Card>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Управление"
        title={`Заявки · ${competition?.name ?? ""}`}
        description="Только заявки вашего конкурса."
      />
      <section className="py-16">
        <div className="container">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <p className="text-muted-foreground">
              Всего заявок: <strong className="text-foreground">{applications.length}</strong>
            </p>
            <div className="flex gap-2">
              <Button variant="wine" size="sm" onClick={exportCsv}>
                <Download className="h-4 w-4" /> Экспорт CSV
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" /> Выйти
              </Button>
            </div>
          </div>

          {applications.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Заявок пока нет</Card>
          ) : (
            <div className="space-y-3">
              {applications.map((a) => (
                <Card key={a.id} className="p-5">
                  <div className="grid md:grid-cols-[1fr_auto] gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif text-lg">{a.participant_name}</span>
                        {a.nomination && <Badge variant="outline">{a.nomination}</Badge>}
                        {a.age_category && <Badge variant="secondary">{a.age_category}</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground grid sm:grid-cols-2 gap-x-6 gap-y-1">
                        <span>👤 {a.leader_full_name}</span>
                        <span>📧 {a.email}</span>
                        <span>📞 {a.phone}</span>
                        {a.organization && <span>🏛 {a.organization}</span>}
                        {a.city && <span>📍 {a.city}{a.country ? `, ${a.country}` : ""}</span>}
                      </div>
                      {a.performance_title && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Номер: </span>
                          <strong>{a.performance_title}</strong>
                          {a.duration_minutes && <span className="text-muted-foreground"> · {a.duration_minutes} мин</span>}
                        </div>
                      )}
                      {a.notes && <p className="text-sm text-muted-foreground italic">{a.notes}</p>}
                      <div className="text-xs text-muted-foreground">
                        Подана: {format(new Date(a.created_at), "dd.MM.yyyy HH:mm")}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[220px]">
                      <Badge variant="outline" className="self-start">
                        {a.status === "new" && "Новая"}
                        {a.status === "reviewing" && "На рассмотрении"}
                        {a.status === "approved" && "✓ Одобрена"}
                        {a.status === "rejected" && "✕ Отклонена"}
                      </Badge>
                      <div className="grid grid-cols-3 gap-1">
                        <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "reviewing")}>
                          <Clock className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="festival" onClick={() => updateStatus(a.id, "approved")}>
                          <Check className="h-3 w-3" /> Одобрить
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "rejected")}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {a.status === "approved" && (
                        <Button asChild size="sm" variant="wine">
                          <Link to={`/chat/${competition?.slug}`}>
                            <MessageCircle className="h-3 w-3" /> Чат / пригласить
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Admin;
