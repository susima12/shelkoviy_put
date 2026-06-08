import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "@/lib/router-compat";
import { api } from "@/lib/api-client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";
import { Send, UserPlus, Users, Check } from "lucide-react";
import { format } from "date-fns";

const Chat = () => {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const { user, isReady } = useAuthReady();
  const [loading, setLoading] = useState(true);
  const [comp, setComp] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [approved, setApproved] = useState<any[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadChat = async () => {
    if (!slug) return;
    try {
      const data = await api.getChat(slug);
      setComp(data.competition);
      setIsAdmin(data.is_admin);
      setAllowed(data.allowed);
      setMessages(data.messages ?? []);
      setApproved(data.approved ?? []);
      setMemberIds(new Set(data.member_ids ?? []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!user) { nav("/auth"); return; }
    loadChat();
    const interval = setInterval(loadChat, 5000);
    return () => clearInterval(interval);
  }, [slug, isReady, user, nav]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !slug) return;
    try {
      await api.sendChatMessage(slug, value);
      setText("");
      await loadChat();
    } catch (err) {
      toast.error(translateError(err));
    }
  };

  const inviteUser = async (a: any) => {
    if (!slug) return;
    try {
      await api.inviteToChat(slug, a.user_id);
      toast.success(`${a.display_name ?? a.email} приглашён в чат`);
      setMemberIds((prev) => new Set(prev).add(a.user_id));
    } catch (err) {
      toast.error(translateError(err));
    }
  };

  if (loading) return <div className="container py-32 text-center">Загрузка...</div>;
  if (!comp) return <div className="container py-32 text-center">Конкурс не найден</div>;

  if (!allowed) {
    return (
      <>
        <PageHero eyebrow="Чат" title={comp.name} />
        <section className="py-16">
          <div className="container max-w-2xl">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Доступ к чату открывается после приглашения администратором конкурса.
              </p>
            </Card>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero eyebrow="Чат конкурса" title={comp.name} />
      <section className="py-12">
        <div className="container max-w-5xl">
          <div className={`grid gap-4 ${isAdmin && showInvitePanel ? "lg:grid-cols-[1fr_320px]" : ""}`}>
            <Card className="flex flex-col h-[70vh]">
              {isAdmin && (
                <div className="border-b border-border p-2 flex justify-end">
                  <Button size="sm" variant={showInvitePanel ? "wine" : "outline"} onClick={() => setShowInvitePanel((v) => !v)}>
                    <Users className="h-4 w-4" />
                    {showInvitePanel ? "Скрыть участников" : "Пригласить участников"}
                  </Button>
                </div>
              )}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.length === 0 && <p className="text-center text-muted-foreground py-8">Пока нет сообщений</p>}
                {messages.map((m) => {
                  const mine = m.user_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                        <div className="flex items-center gap-2 text-xs opacity-80 mb-0.5">
                          <span className="font-semibold">{m.author_name ?? "—"}</span>
                          <span>{format(new Date(m.created_at), "HH:mm")}</span>
                        </div>
                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение..." maxLength={2000} />
                <Button type="submit" variant="wine" size="sm"><Send className="h-4 w-4" /></Button>
              </form>
            </Card>

            {isAdmin && showInvitePanel && (
              <Card className="p-4 h-[70vh] overflow-y-auto">
                <h4 className="font-serif text-base mb-3">Одобренные участники</h4>
                {approved.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет одобренных заявок.</p>
                ) : (
                  <div className="space-y-2">
                    {approved.map((a) => {
                      const inChat = memberIds.has(a.user_id);
                      return (
                        <div key={a.user_id} className="flex items-center gap-2 p-2 rounded border border-border">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{a.display_name}</div>
                            <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                          </div>
                          {inChat ? (
                            <Badge variant="secondary" className="text-xs"><Check className="h-3 w-3" /> в чате</Badge>
                          ) : (
                            <Button size="sm" variant="festival" onClick={() => inviteUser(a)}>
                              <UserPlus className="h-3 w-3" /> Пригласить
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default Chat;
