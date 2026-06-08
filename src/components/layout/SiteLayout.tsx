import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AdminTopbar } from "./AdminTopbar";
import { useLocation } from "@/lib/router-compat";
import { onAuthChange, restoreSession } from "@/lib/api-client";

export const SiteLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isChatLike = pathname.startsWith("/chat/") || pathname === "/messages";

  useEffect(() => {
    const load = (user: { is_admin?: boolean } | null) => {
      setIsAdmin(!!user?.is_admin);
    };
    restoreSession().then(load);
    return onAuthChange(load);
  }, []);

  const useAdminShell = isAdminPath || (isAdmin && isChatLike);

  if (useAdminShell) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {isAdmin ? <AdminTopbar /> : null}
        <main className="flex-1">{children}</main>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
};
