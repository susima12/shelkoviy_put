import { useState } from "react";
import { Link, NavLink, useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { LogOut, FileText, Users, MessageSquare, Menu, X, Newspaper } from "lucide-react";
import { api, notifyAuthChange, setToken } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const ITEMS = [
  { to: "/admin", label: "Заявки", icon: FileText, end: true },
  { to: "/admin/news", label: "Новости", icon: Newspaper, end: false },
  { to: "/admin/users", label: "Пользователи", icon: Users, end: false },
  { to: "/admin/chat", label: "Чат", icon: MessageSquare, end: false },
];

export const AdminTopbar = () => {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await api.signOut();
    setToken(null);
    notifyAuthChange(null);
    nav("/auth");
  };

  const linkClass = (isActive: boolean) =>
    cn(
      "inline-flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full sm:w-auto",
      isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex h-14 sm:h-16 items-center justify-between gap-3">
        <Link to="/admin" className="flex items-center gap-2 min-w-0 shrink">
          <img src={logo} className="h-8 w-8 rounded-full object-contain shrink-0" alt="" />
          <span className="font-display text-base sm:text-lg truncate">Админ-панель</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => linkClass(isActive)}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex">
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
          <button
            type="button"
            className="md:hidden p-2 rounded-md hover:bg-secondary"
            onClick={() => setOpen(!open)}
            aria-label="Меню админки"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => linkClass(isActive)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          <Button variant="outline" size="sm" onClick={logout} className="w-full mt-2 justify-start">
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>
      )}
    </header>
  );
};
