import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { api, notifyAuthChange, setToken } from "@/lib/api-client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, LogOut, FileText, MessageSquare } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";
import { BackButton } from "@/components/ui/back-button";

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

const Profile = () => {
  const nav = useNavigate();
  const { user, isReady } = useAuthReady();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPw, setNewPw] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!user) { nav("/auth"); return; }
    api.getProfile().then(({ profile: p }) => {
      setProfile(p);
      const fallbackName = p?.display_name || user.display_name || user.email || "";
      let fallbackUsername = p?.username || user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "") || "user";
      if (fallbackUsername.length < 3) fallbackUsername = `${fallbackUsername}_${user.id.slice(0, 4)}`;
      setDisplayName(fallbackName);
      setUsername(fallbackUsername);
      setBio(p?.bio ?? "");
      setLoading(false);
    }).catch((e) => {
      toast.error(translateError(e, "Ошибка загрузки"));
      setLoading(false);
    });
  }, [isReady, user, nav]);

  const messageIdError = useMemo(() => {
    if (!username.trim()) return "Укажите ID для сообщений.";
    if (!USERNAME_RE.test(username)) return "ID: a-z, 0-9, _, 3–30 символов.";
    return "";
  }, [username]);

  const saveProfile = async () => {
    if (messageIdError) { toast.error(messageIdError); return; }
    if (displayName.trim().length < 2) { toast.error("Имя слишком короткое"); return; }
    setBusy(true);
    try {
      const { profile: p } = await api.updateProfile({
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim() || undefined,
      });
      setProfile(p);
      toast.success("Профиль сохранён");
    } catch (e) {
      toast.error(translateError(e));
    } finally {
      setBusy(false);
    }
  };

  const changeEmail = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { toast.error("Некорректный email"); return; }
    setBusy(true);
    try {
      await api.changeEmail(curPw, newEmail);
      toast.success("Email обновлён");
      setNewEmail("");
      setCurPw("");
    } catch (e) {
      toast.error(translateError(e));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    if (!PASSWORD_RE.test(newPw)) { toast.error("Пароль: 8–72 символа, буква и цифра"); return; }
    setBusy(true);
    try {
      await api.changePassword(curPw, newPw);
      toast.success("Пароль обновлён");
      setNewPw("");
      setCurPw("");
    } catch (e) {
      toast.error(translateError(e));
    } finally {
      setBusy(false);
    }
  };

  const copyId = async () => {
    await navigator.clipboard.writeText(username.trim().toLowerCase());
    toast.success("ID для сообщений скопирован");
  };

  const logout = async () => {
    await api.signOut();
    setToken(null);
    notifyAuthChange(null);
    nav("/");
  };

  if (loading) return <div className="container py-32 text-center text-muted-foreground">Загрузка...</div>;
  if (!user) return null;

  const initials = (displayName || user.email).slice(0, 2).toUpperCase();
  const avatarSrc = profile?.avatar_url || undefined;

  return (
    <>
      <PageHero eyebrow="Личный кабинет" title="Мой профиль" />
      <section className="py-12">
        <div className="container max-w-3xl space-y-6">
          <BackButton fallbackTo="/" />
          <Card className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex w-full flex-col items-center gap-2 sm:w-auto">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarSrc} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 space-y-3 w-full">
                <div className="text-sm">
                  <Label>ID для сообщений</Label>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className="font-mono text-sm" maxLength={30} />
                    <Button size="icon" variant="outline" onClick={copyId}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{messageIdError || "Этот ID пользователь указывает сам. По нему его можно найти в сообщениях."}</p>
                </div>
                <div><Label>Имя</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} /></div>
                <div><Label>О себе</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} /></div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveProfile} disabled={busy} variant="wine">Сохранить</Button>
                  <Button asChild variant="outline"><Link to="/messages"><MessageSquare className="h-4 w-4" /> Сообщения</Link></Button>
                  <Button asChild variant="outline"><Link to="/my-applications"><FileText className="h-4 w-4" /> Заявки</Link></Button>
                  <Button onClick={logout} variant="ghost"><LogOut className="h-4 w-4" /> Выйти</Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-display text-xl">Безопасность</h2>
            <p className="text-sm text-muted-foreground">Email: <strong className="text-foreground">{user.email}</strong></p>
            <div>
              <Label>Текущий пароль (требуется для смены)</Label>
              <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Новый email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" />
                <Button size="sm" onClick={changeEmail} disabled={busy}>Сменить email</Button>
              </div>
              <div className="space-y-2">
                <Label>Новый пароль</Label>
                <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                <Button size="sm" onClick={changePassword} disabled={busy}>Сменить пароль</Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
};

export default Profile;
