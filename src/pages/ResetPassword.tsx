import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "@/lib/router-compat";
import { api } from "@/lib/api-client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

const ResetPassword = () => {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api.resetPasswordEnabled().then((r) => setEnabled(r.enabled)).catch(() => setEnabled(false));
  }, []);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("Некорректный email");
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(email.trim().toLowerCase());
      setSent(true);
      toast.success("Проверьте почту — мы отправили ссылку для сброса");
    } catch (err: unknown) {
      toast.error(translateError(err));
    } finally {
      setBusy(false);
    }
  };

  const setNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RE.test(password)) {
      toast.error("Пароль: 8–72 символа, минимум одна буква и одна цифра");
      return;
    }
    if (password !== confirm) {
      toast.error("Пароли не совпадают");
      return;
    }
    setBusy(true);
    try {
      await api.confirmResetPassword(token, password);
      toast.success("Пароль обновлён");
      nav("/auth");
    } catch (err: unknown) {
      toast.error(translateError(err));
    } finally {
      setBusy(false);
    }
  };

  if (enabled === null) {
    return (
      <AuthShell title="Сброс пароля" subtitle="Загрузка…">
        <p className="text-sm text-muted-foreground text-center">Подождите</p>
      </AuthShell>
    );
  }

  if (token) {
    return (
      <AuthShell title="Новый пароль" subtitle="Придумайте надёжный пароль для входа">
        <form onSubmit={setNewPassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">Новый пароль</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">8–72 символа, минимум одна буква и одна цифра</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Повторите пароль</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="h-11"
            />
          </div>
          <Button type="submit" variant="wine" size="lg" className="w-full" disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить пароль"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link to="/auth" className="text-muted-foreground hover:text-primary">
            ← К входу
          </Link>
        </p>
      </AuthShell>
    );
  }

  if (!enabled) {
    return (
      <AuthShell
        title="Сброс пароля"
        subtitle="Автоматический сброс сейчас недоступен — напишите в оргкомитет"
      >
        <p className="text-sm text-muted-foreground leading-relaxed text-center">
          Для восстановления доступа напишите на{" "}
          <a href="mailto:zayavka@shelk-put.com" className="text-primary hover:underline">
            zayavka@shelk-put.com
          </a>
          . Укажите email, с которым регистрировались.
        </p>
        <Button variant="wine" size="lg" className="w-full mt-6" onClick={() => nav("/auth")}>
          На страницу входа
        </Button>
      </AuthShell>
    );
  }

  if (sent) {
    return (
      <AuthShell title="Письмо отправлено" subtitle="Откройте почту и нажмите «Подтвердить сброс» в письме">
        <p className="text-sm text-muted-foreground leading-relaxed text-center">
          Если письма нет во входящих, проверьте папку «Спам». Ссылка действует 1 час.
        </p>
        <Button variant="outline" className="w-full mt-6" onClick={() => nav("/auth")}>
          К входу
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Сброс пароля" subtitle="Укажите email — мы пришлём ссылку для смены пароля">
      <form onSubmit={requestReset} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11"
          />
        </div>
        <Button type="submit" variant="wine" size="lg" className="w-full" disabled={busy}>
          {busy ? "Отправляем…" : "Отправить ссылку"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm">
        <Link to="/auth" className="text-muted-foreground hover:text-primary">
          ← К входу
        </Link>
      </p>
    </AuthShell>
  );
};

export default ResetPassword;
