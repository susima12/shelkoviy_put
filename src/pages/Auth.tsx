import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "@/lib/router-compat";
import { api, notifyAuthChange, restoreSession, setToken } from "@/lib/api-client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";

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
  const [resetEnabled, setResetEnabled] = useState(false);

  useEffect(() => {
    restoreSession().then((user) => {
      if (user) routeAfterLogin(!!user.is_admin, nav, redirectTo);
    });
    api.resetPasswordEnabled().then((r) => setResetEnabled(r.enabled)).catch(() => {});
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

  const toggleMode = () => setMode(mode === "signin" ? "signup" : "signin");

  return (
    <AuthShell
      title={mode === "signin" ? "Вход" : "Регистрация"}
      subtitle={
        mode === "signin"
          ? "Войдите, чтобы подать заявку и следить за статусом"
          : "Создайте аккаунт участника фестиваля"
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              autoComplete="name"
              className="h-11"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="h-11"
          />
          {mode === "signup" && (
            <p className="text-xs text-muted-foreground">8–72 символа, минимум одна буква и одна цифра</p>
          )}
        </div>
        <Button type="submit" variant="wine" size="lg" className="w-full" disabled={busy}>
          {busy ? "Подождите…" : mode === "signin" ? "Войти" : "Создать аккаунт"}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-border/60 flex flex-col items-center gap-3 text-sm">
        {mode === "signin" && resetEnabled && (
          <Link to="/reset-password" className="text-primary hover:underline">
            Забыли пароль?
          </Link>
        )}
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={toggleMode}
        >
          {mode === "signin" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </div>
    </AuthShell>
  );
};

export default Auth;
