import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { api, type DmConversation, type DmMessage, type ProfileRow } from "@/lib/api-client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";

const Messages = ({ embedded = false }: { embedded?: boolean }) => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user, isReady } = useAuthReady();
  const [convs, setConvs] = useState<DmConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<DmMessage[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileRow>>({});
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileRow[]>([]);
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
    api.startConversation(to).then(({ conversation_id }) => {
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
    if (!search.trim() || !user) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.searchProfiles(search.trim()).then(({ profiles }) => setSearchResults(profiles ?? [])).catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search, user]);

  const openConversation = async (profile: ProfileRow) => {
    if (!profile.username) return;
    try {
      const { conversation_id } = await api.startConversation(profile.username);
      setActiveId(conversation_id);
      await loadConvs();
      setSearch("");
      setSearchResults([]);
    } catch (e) {
      toast.error(translateError(e));
    }
  };

  const send = async () => {
    if (!text.trim() || !activeId) return;
    try {
      await api.sendDm(activeId, text.trim());
      setText("");
      await loadMessages(activeId);
      await loadConvs();
    } catch (e) {
      toast.error(translateError(e));
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
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="ID, @username, email" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {search && searchResults.length > 0 && (
              <div className="border-b border-border bg-secondary/30">
                {searchResults.map((u) => (
                  <button key={u.user_id} onClick={() => openConversation(u)} className="w-full px-3 py-2 hover:bg-secondary flex items-center gap-3 text-left">
                    <Avatar className="h-9 w-9"><AvatarImage src={u.avatar_url ?? undefined} /><AvatarFallback>{(u.display_name||u.email||"?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{u.display_name || u.email}</div>
                      <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
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
                      <div className={cn("max-w-[75%] rounded-2xl px-3 py-2", mine ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                        <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
                        <div className={cn("text-[10px] mt-1", mine ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>
                          {format(new Date(m.created_at), "HH:mm")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение..." onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} maxLength={4000} />
                <Button onClick={send} variant="wine" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Messages;
