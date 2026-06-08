import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { api } from "@/lib/api-client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MessageCircle, BellRing } from "lucide-react";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  new: { text: "Новая", cls: "bg-blue-500/15 text-blue-700" },
  reviewing: { text: "На рассмотрении", cls: "bg-amber-500/15 text-amber-700" },
  approved: { text: "Одобрена", cls: "bg-emerald-500/15 text-emerald-700" },
  rejected: { text: "Отклонена", cls: "bg-rose-500/15 text-rose-700" },
};

const MyApplications = () => {
  const nav = useNavigate();
  const { user, isReady } = useAuthReady();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [comps, setComps] = useState<Record<string, { name: string; slug: string }>>({});
  const [invites, setInvites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isReady) return;
    if (!user) { nav("/auth"); return; }
    api.getMyApplications().then(({ applications, competitions, invites: inv }) => {
      setItems(applications ?? []);
      setComps(competitions ?? {});
      setInvites(inv ?? {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isReady, user, nav]);

  if (loading) return <div className="container py-32 text-center">Загрузка...</div>;

  return (
    <>
      <PageHero eyebrow="Личный кабинет" title="Мои заявки" />
      <section className="py-16">
        <div className="container max-w-4xl">
          {items.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-6">У вас пока нет заявок.</p>
              <Button asChild variant="festival"><Link to="/competitions">К конкурсам</Link></Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((a) => {
                const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.new;
                const comp = comps[a.competition_id];
                const invited = comp ? !!invites[a.competition_id] : false;
                return (
                  <Card key={a.id} className="p-5">
                    <div className="flex justify-between items-start gap-4 flex-wrap mb-3">
                      <div>
                        <div className="font-serif text-lg">{comp?.name ?? "Конкурс"}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(a.created_at), "dd.MM.yyyy HH:mm")} · {a.participant_name}
                        </div>
                      </div>
                      <Badge className={st.cls}>{st.text}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground grid sm:grid-cols-2 gap-1">
                      {a.nomination && <span>Номинация: {a.nomination}</span>}
                      {a.age_category && <span>Возраст: {a.age_category}</span>}
                    </div>
                    {invited && comp && (
                      <Button asChild size="sm" variant="outline" className="mt-3">
                        <Link to={`/chat/${comp.slug}`}><MessageCircle className="h-3 w-3" /> Чат конкурса</Link>
                      </Button>
                    )}
                    {a.status === "approved" && !invited && (
                      <p className="text-xs text-muted-foreground mt--2 flex items-center gap-1">
                        <BellRing className="h-3 w-3" /> Администратор пригласит вас в чат после проверки
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default MyApplications;
