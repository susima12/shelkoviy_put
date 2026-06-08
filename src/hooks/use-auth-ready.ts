import { useEffect, useState } from "react";
import { type ApiUser, onAuthChange, restoreSession } from "@/lib/api-client";

export function useAuthReady() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    let mounted = true;
    restoreSession().then((u) => {
      if (!mounted) return;
      setUser(u);
      setIsReady(true);
    });

    const unsub = onAuthChange((u) => {
      if (!mounted) return;
      setUser(u);
      setIsReady(true);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return { user, isReady };
}
