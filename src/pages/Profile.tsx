import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { api, invalidateSessionCache, notifyAuthChange, setToken } from "@/lib/api-client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PasswordInput } from "@/components/ui/password-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, LogOut, FileText, MessageSquare, Camera } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";
import { BackButton } from "@/components/ui/back-button";

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

function resolveAvatarUrl(url: string | null | undefined, userId: string): string | undefined {
  if (!url && !userId) return undefined;
  if (url?.startsWith("/uploads/avatars/")) {
    const v = url.includes("?") ? url.split("?")[1] : "";
    return `/api/profiles/avatar/${userId}${v ? `?${v}` : ""}`;
  }
  return url ?? `/api/profiles/avatar/${userId}`;
}

const Profile = () => {
  const nav = useNavigate();
  const { user, isReady } = useAuthReady();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPw, setNewPw] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const loadedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

    if (!userId) {
      loadedUserRef.current = null;
      setLoading(false);
      nav("/auth");
      return;
    }

    if (loadedUserRef.current === userId) return;

    let cancelled = false;
    setLoading(true);

    api.getProfile()
      .then(({ profile: p }) => {
        if (cancelled) return;
        loadedUserRef.current = userId;
        setProfile(p);
        setDisplayName(p?.display_name || user?.display_name || user?.email || "");
        setUsername(p?.username || "");
        setBio(p?.bio ?? "");
        setAvatarPreview(resolveAvatarUrl(p?.avatar_url, userId) ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(translateError(e, "Ошибка загрузки"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- загрузка только при смене userId
  }, [isReady, userId]);

  const messageIdError = useMemo(() => {
    const id = username.trim();
    if (!id) return "";
    if (!USERNAME_RE.test(id)) return "ID: a-z, 0-9, _, 3–30 символов.";
    return "";
  }, [username]);

  const saveProfile = async () => {
    if (messageIdError) { toast.error(messageIdError); return; }
    if (displayName.trim().length < 2) { toast.error("Имя слишком короткое"); return; }
    setSavingProfile(true);
    try {
      const payload: Record<string, string> = {
        display_name: displayName.trim(),
        bio: bio.trim(),
      };
      if (username.trim()) payload.username = username.trim().toLowerCase();
      else payload.username = "";

      const { profile: p } = await api.updateProfile(payload);
      setProfile(p);
      setDisplayName(p?.display_name || displayName.trim());
      setUsername(p?.username || "");
      setBio(p?.bio ?? "");
      notifyAuthChange({ ...user!, display_name: p?.display_name || displayName.trim() });
      invalidateSessionCache();
      toast.success("Профиль сохранён");
    } catch (e) {
      toast.error(translateError(e));
    } finally {
      setSavingProfile(false);
    }
  };

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) { toast.error("Выберите изображение"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Файл слишком большой (макс. 2 МБ)"); return; }

    setUploadingAvatar(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
        reader.readAsDataURL(file);
      });
      setAvatarPreview(dataUrl);

      const { profile: p, avatar_url } = await api.uploadAvatar(dataUrl);
      setProfile(p);
      setAvatarPreview(resolveAvatarUrl(avatar_url, userId) ?? dataUrl);
      toast.success("Фото обновлено");
    } catch (err) {
      toast.error(translateError(err));
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const changeEmail = async () => {
    if (!curPw.trim()) { toast.error("Введите текущий пароль"); return; }
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { toast.error("Некорректный email"); return; }
    setChangingEmail(true);
    try {
      const { user: updated, token } = await api.changeEmail(curPw, newEmail.trim().toLowerCase());
      if (token) setToken(token);
      notifyAuthChange(updated);
      invalidateSessionCache();
      toast.success("Email обновлён. Войдите с новым email при следующем входе.");
      setNewEmail("");
      setCurPw("");
    } catch (e) {
      toast.error(translateError(e));
    } finally {
      setChangingEmail(false);
    }
  };

  const changePassword = async () => {
    if (!curPw.trim()) { toast.error("Введите текущий пароль"); return; }
    if (!PASSWORD_RE.test(newPw)) { toast.error("Пароль: 8–72 символа, буква и цифра"); return; }
    setChangingPassword(true);
    try {
      const { token } = await api.changePassword(curPw, newPw);
      if (token) setToken(token);
      invalidateSessionCache();
      toast.success("Пароль обновлён");
      setNewPw("");
      setCurPw("");
    } catch (e) {
      toast.error(translateError(e));
    } finally {
      setChangingPassword(false);
    }
  };

  const copyId = async () => {
    if (!username.trim()) { toast.error("Сначала укажите и сохраните ID"); return; }
    await navigator.clipboard.writeText(username.trim().toLowerCase());
    toast.success("ID скопирован");
  };

  const logout = async () => {
    await api.signOut();
    setToken(null);
    notifyAuthChange(null);
    nav("/");
  };

  if (!isReady || loading) {
    return (
      <>
        <PageHero eyebrow="Личный кабинет" title="Мой профиль" />
        <section className="relative z-10 py-12">
          <div className="container max-w-3xl">
            <div className="animate-pulse space-y-6">
              <div className="h-48 rounded-lg bg-muted" />
              <div className="h-64 rounded-lg bg-muted" />
            </div>
          </div>
        </section>
      </>
    );
  }
  if (!user) return null;

  const initials = (displayName || user.email).slice(0, 2).toUpperCase();

  return (
    <>
      <PageHero eyebrow="Личный кабинет" title="Мой профиль" />
      <section className="relative z-10 py-12">
        <div className="container max-w-3xl space-y-6">
          <BackButton fallbackTo="/" />
          <Card className="relative z-10 p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex w-full flex-col items-center gap-3 sm:w-auto">
                <Avatar className="h-24 w-24 border border-border/60">
                  <AvatarImage src={avatarPreview ?? undefined} className="object-cover" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onAvatarPick}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  {uploadingAvatar ? "Загрузка..." : "Загрузить фото"}
                </Button>
              </div>
              <div className="relative z-10 flex-1 space-y-3 w-full">
                <div className="text-sm">
                  <Label htmlFor="profile-username">ID для сообщений</Label>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="profile-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      className="font-mono text-sm"
                      maxLength={30}
                      placeholder="например: ivan_2026"
                      autoComplete="off"
                    />
                    <Button type="button" size="icon" variant="outline" onClick={copyId}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className={`mt-1 break-words text-xs ${messageIdError ? "text-destructive" : "text-muted-foreground"}`}>
                    {messageIdError || "Укажите свой ID — по нему вас найдут в сообщениях. Можно оставить пустым."}
                  </p>
                </div>
                <div>
                  <Label htmlFor="profile-name">Имя</Label>
                  <Input id="profile-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} />
                </div>
                <div>
                  <Label htmlFor="profile-bio">О себе</Label>
                  <Textarea id="profile-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={saveProfile} disabled={savingProfile} variant="wine">Сохранить</Button>
                  <Button asChild variant="outline"><Link to="/messages"><MessageSquare className="h-4 w-4" /> Сообщения</Link></Button>
                  <Button asChild variant="outline"><Link to="/my-applications"><FileText className="h-4 w-4" /> Заявки</Link></Button>
                  <Button type="button" onClick={logout} variant="ghost"><LogOut className="h-4 w-4" /> Выйти</Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative z-10 p-6 space-y-4">
            <h2 className="font-display text-xl">Безопасность</h2>
            <p className="text-sm text-muted-foreground">Email: <strong className="text-foreground">{user.email}</strong></p>
            <div>
              <Label htmlFor="profile-cur-pw">Текущий пароль (требуется для смены)</Label>
              <PasswordInput id="profile-cur-pw" value={curPw} onChange={(e) => setCurPw(e.target.value)} autoComplete="current-password" className="h-11" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-new-email">Новый email</Label>
                <Input id="profile-new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" autoComplete="email" />
                <Button type="button" size="sm" onClick={changeEmail} disabled={changingEmail}>Сменить email</Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-new-pw">Новый пароль</Label>
                <PasswordInput id="profile-new-pw" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" className="h-11" />
                <Button type="button" size="sm" onClick={changePassword} disabled={changingPassword}>Сменить пароль</Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
};

export default Profile;
