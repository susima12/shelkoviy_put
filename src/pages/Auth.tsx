import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { api, notifyAuthChange, setToken } from "@/lib/api-client";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";
import { Link } from "@/lib/router-compat";
import { restoreSession } from "@/lib/api-client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

const routeAfterLogin = (isAdmin: boolean, nav: (p: string) => void, redirect?: string | null) => {
  if (redirect && redirect.startsWith("/")) {
    nav(redirect);
    return;
  }
  nav(isAdmin ? "/admin" : "/my-applications");
};

const Auth = () => {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || null;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    restoreSession().then((user) => {
      if (user) routeAfterLogin(!!user.is_admin, nav, redirectTo);
    });
  }, [nav, redirectTo]);

  const validate = () => {
    if (email.length > 255 || !EMAIL_RE.test(email)) {
      toast.error("Некорректный email (до 255 символов)");
      return false;
    }
    if (mode === "signup") {
      if (!PASSWORD_RE.test(password)) {
        toast.error("Пароль: 8–72 символа, минимум одна буква и одна цифра");
        return false;
      }
      if (name.trim().length < 2 || name.length > 80) {
        toast.error("Имя: от 2 до 80 символов");
        return false;
      }
    } else {
      if (password.length < 6 || password.length > 72) {
        toast.error("Введите корректный пароль");
        return false;
      }
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        const { user, token } = await api.signIn(email.trim().toLowerCase(), password);
        if (!user || !token) throw new Error("Не удалось войти");
        setToken(token);
        notifyAuthChange(user);
        toast.success("Добро пожаловать!");
        routeAfterLogin(!!user.is_admin, nav, redirectTo);
      } else {
        const { user, token } = await api.signUp(email.trim().toLowerCase(), password, name.trim());
        if (!user || !token) throw new Error("Не удалось зарегистрироваться");
        setToken(token);
        notifyAuthChange(user);
        toast.success("Регистрация успешна — вы вошли в аккаунт");
        nav(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/profile");
      }
    } catch (err: unknown) {
      toast.error(translateError(err, "Ошибка"));
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(resetEmail)) { toast.error("Некорректный email"); return; }
    setBusy(true);
    try {
      await api.resetPassword(resetEmail);
      toast.success("Обратитесь в оргкомитет, если письмо не пришло: zayavka@shelk-put.com");
      setShowReset(false);
    } catch (err: unknown) {
      toast.error(translateError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHero eyebrow="Аккаунт" title={mode === "signin" ? "Вход" : "Регистрация"} />
      <section className="py-16">
        <div className="container max-w-md">
          <Card className="p-8">
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <Label>Имя</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
                </div>
              )}
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Пароль</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground mt-1">8–72 символа, минимум одна буква и одна цифра</p>
                )}
              </div>
              <Button type="submit" variant="wine" className="w-full" disabled={busy}>
                {busy ? "..." : mode === "signin" ? "Войти" : "Создать аккаунт"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm space-y-2">
              <button type="button" className="text-primary hover:underline" onClick={() => setShowReset(!showReset)}>
                Забыли пароль?
              </button>
              <div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                >
                  {mode === "signin" ? "Создать аккаунт" : "Уже есть аккаунт? Войти"}
                </button>
              </div>
            </div>
            {showReset && (
              <form onSubmit={sendReset} className="mt-6 pt-6 border-t space-y-3">
                <Label>Email для сброса</Label>
                <Input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                <Button type="submit" variant="outline" className="w-full" disabled={busy}>Отправить</Button>
              </form>
            )}
          </Card>
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link to="/" className="hover:text-primary">← На главную</Link>
          </p>
        </div>
      </section>
    </>
  );
};

export default Auth;
