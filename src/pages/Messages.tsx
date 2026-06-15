import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { api, type DmConversation, type DmMessage, type ProfileRow } from "@/lib/api-client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageBody } from "@/components/chat/ChatMessageBody";

const Messages = ({ embedded = false }: { embedded?: boolean }) => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user, isReady } = useAuthReady();
  const [convs, setConvs] = useState<DmConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<DmMessage[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileRow>>({});
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileRow[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    const { conversations } = await api.getConversations();
    setConvs(conversations ?? []);
  };

  const loadMessages = async (id: string) => {
    const { messages, profiles } = await api.getMessages(id);
    setMsgs(messages ?? []);
    setProfilesMap((p) => ({ ...p, ...profiles }));
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  };

  useEffect(() => {
    if (!isReady) return;
    if (!user) { nav("/auth"); return; }
    loadConvs();
  }, [isReady, user, nav]);

  useEffect(() => {
    const to = params.get("to");
    if (!user || !to) return;
    api.startConversation({ username: to }).then(({ conversation_id }) => {
      setActiveId(conversation_id);
      loadConvs();
    }).catch(() => {});
  }, [user, params]);

  useEffect(() => {
    if (!activeId) { setMsgs([]); return; }
    loadMessages(activeId);
    const interval = setInterval(() => loadMessages(activeId), 4000);
    return () => clearInterval(interval);
  }, [activeId]);

  useEffect(() => {
    if (!user || !searchOpen) return;
    const q = search.trim();
    const t = setTimeout(() => {
      api.searchProfiles(q).then(({ profiles }) => setSearchResults(profiles ?? [])).catch(() => setSearchResults([]));
    }, 150);
    return () => clearTimeout(t);
  }, [search, user, searchOpen]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const openConversation = async (profile: ProfileRow) => {
    try {
      const payload = profile.username
        ? { username: profile.username }
        : { user_id: profile.user_id };
      const { conversation_id } = await api.startConversation(payload);
      setActiveId(conversation_id);
      await loadConvs();
      setSearch("");
      setSearchResults([]);
    } catch (e) {
      toast.error(translateError(e));
    }
  };

  const send = async (payload: { content?: string; attachment?: { data: string; name: string; mime: string } }) => {
    if (!activeId) return;
    try {
      await api.sendDm(activeId, payload);
      await loadMessages(activeId);
      await loadConvs();
    } catch (e) {
      toast.error(translateError(e));
      throw e;
    }
  };

  const active = convs.find((c) => c.id === activeId);

  return (
    <div className={cn("container", embedded ? "py-6" : "pt-8 pb-12")}>
      {!embedded && <BackButton fallbackTo="/profile" />}
      {!embedded && <h1 className="font-display text-3xl mb-6">Сообщения</h1>}
      <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-180px)]">
        <Card className="flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative" ref={searchWrapRef}>
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
              <Input
                placeholder="Поиск по имени, ID или email"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                autoComplete="off"
              />
              {searchOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
                  {searchResults.length > 0 ? (
                    searchResults.map((u) => (
                      <button
                        key={u.user_id}
                        type="button"
                        onClick={() => openConversation(u)}
                        className="w-full px-3 py-2 hover:bg-secondary flex items-center gap-3 text-left border-b border-border/40 last:border-0"
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback>{(u.display_name || u.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate font-medium">{u.display_name || "Без имени"}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {u.username ? `@${u.username}` : u.email}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                      {search.trim() ? "Никого не найдено" : "Нет других пользователей"}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convs.map((c) => (
              <button key={c.id} onClick={() => setActiveId(c.id)} className={cn("w-full px-3 py-3 flex items-center gap-3 text-left border-b border-border/40 hover:bg-secondary", activeId === c.id && "bg-secondary")}>
                <Avatar className="h-10 w-10"><AvatarImage src={c.other?.avatar_url ?? undefined} /><AvatarFallback>{(c.other?.display_name||c.other?.email||"?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.other?.display_name || c.other?.email || "—"}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(c.last_message_at), "dd.MM HH:mm")}</div>
                </div>
              </button>
            ))}
            {!convs.length && !search && <p className="p-4 text-sm text-muted-foreground text-center">Нет диалогов. Найдите пользователя в поиске.</p>}
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">Выберите диалог</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <Avatar className="h-9 w-9"><AvatarImage src={active?.other?.avatar_url ?? undefined} /><AvatarFallback>{(active?.other?.display_name||active?.other?.email||"?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{active?.other?.display_name || active?.other?.email}</div>
                  <div className="text-xs text-muted-foreground">@{active?.other?.username}</div>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {msgs.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <ChatMessageBody message={m} mine={mine} />
                    </div>
                  );
                })}
              </div>
              <ChatComposer onSend={send} />
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Messages;
