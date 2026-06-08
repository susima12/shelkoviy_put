import { Link, NavLink, useLocation, useNavigate } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { Menu, X, LogIn, LogOut, User, MessageSquare } from "lucide-react";
import { api, notifyAuthChange, onAuthChange, restoreSession, setToken } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { LogoLink } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Главная" },
  { to: "/about", label: "О фестивале" },
  { to: "/history", label: "История" },
  { to: "/competitions", label: "Конкурсы" },
  { to: "/master-classes", label: "Мастер-классы" },
  { to: "/jury", label: "Жюри" },
  { to: "/partners", label: "Партнёры" },
  { to: "/payment", label: "Реквизиты" },
  { to: "/contacts", label: "Контакты" },
];

export const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { pathname } = useLocation();
  const nav = useNavigate();
  const onDark = !scrolled;

  useEffect(() => {
    const load = (user: { email?: string; is_admin?: boolean } | null) => {
      setEmail(user?.email ?? null);
      setIsAdmin(!!user?.is_admin);
    };
    restoreSession().then(load);
    return onAuthChange(load);
  }, []);

  const logout = async () => {
    await api.signOut();
    setToken(null);
    notifyAuthChange(null);
    nav("/");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navLinkClass = (isActive: boolean) =>
    cn(
      "px-2.5 py-2 text-sm font-medium rounded-md transition-silk whitespace-nowrap",
      onDark
        ? "text-[hsl(40_30%_90%)] hover:text-[hsl(40_75%_70%)] hover:bg-[hsl(40_20%_90%/0.12)]"
        : "text-foreground/75 hover:text-foreground hover:bg-secondary/60",
      isActive &&
        (onDark
          ? "text-[hsl(345_55%_30%)] bg-[hsl(40_25%_92%)]"
          : "text-primary bg-secondary")
    );

  /** Светлый текст на тёмной шапке (до скролла) */
  const authLightClass = onDark
    ? "text-[hsl(40_35%_92%)] hover:text-[hsl(40_75%_70%)] hover:bg-[hsl(40_20%_90%/0.12)]"
    : "text-foreground/85 hover:text-foreground hover:bg-secondary/60";

  const authOutlineClass = onDark
    ? "border-[hsl(40_30%_70%/0.45)] text-[hsl(40_35%_92%)] bg-[hsl(340_30%_14%/0.6)] hover:bg-[hsl(40_20%_90%/0.12)] hover:text-[hsl(40_75%_70%)]"
    : "";

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-silk",
        scrolled
          ? "bg-background/85 backdrop-blur-lg border-b border-border/60 shadow-card"
          : "bg-[hsl(340_40%_6%/0.55)] backdrop-blur-sm"
      )}
    >
      <div className="container flex items-center justify-between gap-3 h-20 min-w-0">
        <LogoLink size="lg" variant={scrolled ? "light" : "dark"} />

        {/* Десктоп: 2xl+ чтобы при входе кнопки не ломали вёрстку */}
        <nav className="hidden 2xl:flex items-center gap-0.5 min-w-0 flex-1 justify-center max-w-3xl">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => navLinkClass(isActive)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden 2xl:flex items-center gap-2 shrink-0">
          {email ? (
            <>
              <Button asChild variant="ghost" size="sm" className={authLightClass}>
                <Link to="/messages">
                  <MessageSquare className="h-4 w-4" /> Сообщения
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className={authOutlineClass}>
                <Link to={isAdmin ? "/admin" : "/profile"}>
                  <User className="h-4 w-4" />
                  Кабинет
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className={authLightClass} onClick={logout}>
                <LogOut className="h-4 w-4" /> Выйти
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm" className={authOutlineClass}>
              <Link to="/auth">
                <LogIn className="h-4 w-4" /> Войти
              </Link>
            </Button>
          )}
          <Button asChild variant="festival" size="sm">
            <Link to="/apply">Подать заявку</Link>
          </Button>
        </div>

        <button
          type="button"
          className={cn(
            "2xl:hidden p-2 rounded-md shrink-0 transition-silk",
            onDark ? "text-[hsl(40_35%_92%)] hover:bg-[hsl(40_20%_90%/0.12)]" : "text-foreground hover:bg-secondary/60"
          )}
          onClick={() => setOpen(!open)}
          aria-label="Меню"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="2xl:hidden bg-[hsl(340_40%_9%/0.96)] backdrop-blur-xl border-t border-gold/20 shadow-elegant max-h-[calc(100vh-5rem)] overflow-y-auto">
          <nav className="container flex flex-col py-4 gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2.5 text-base rounded-md font-medium transition-silk",
                    isActive
                      ? "bg-[hsl(40_25%_92%)] text-[hsl(345_55%_30%)]"
                      : "text-[hsl(40_35%_92%)] hover:bg-[hsl(40_20%_90%/0.12)]"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-gold/20 pt-3">
              {email ? (
                <>
                  <Button
                    asChild
                    variant="outline"
                    className="border-[hsl(40_30%_70%/0.45)] text-[hsl(40_35%_92%)] bg-transparent hover:bg-[hsl(40_20%_90%/0.12)]"
                  >
                    <Link to="/messages">
                      <MessageSquare className="h-4 w-4" /> Сообщения
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-[hsl(40_30%_70%/0.45)] text-[hsl(40_35%_92%)] bg-transparent hover:bg-[hsl(40_20%_90%/0.12)]"
                  >
                    <Link to={isAdmin ? "/admin" : "/profile"}>
                      <User className="h-4 w-4" /> Кабинет
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={logout}
                    className="text-[hsl(40_35%_92%)] hover:bg-[hsl(40_20%_90%/0.12)] hover:text-[hsl(40_75%_70%)] justify-start"
                  >
                    <LogOut className="h-4 w-4" /> Выйти
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="border-[hsl(40_30%_70%/0.45)] text-[hsl(40_35%_92%)] bg-transparent hover:bg-[hsl(40_20%_90%/0.12)]"
                >
                  <Link to="/auth">
                    <LogIn className="h-4 w-4" /> Войти
                  </Link>
                </Button>
              )}
              <Button asChild variant="festival">
                <Link to="/apply">Подать заявку</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
