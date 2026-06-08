import { useEffect, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import * as Icons from "lucide-react";
import { ArrowLeft, Phone, CreditCard } from "lucide-react";
import { fetchCompetitions } from "@/hooks/use-competitions";
import { COMPETITION_META, getStaticBySlug } from "@/lib/competitions-data";
import { FESTIVAL_2026 } from "@/lib/festival-info";
import { PageHero } from "@/components/ui/page-hero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ListCard = ({ title, items }: { title: string; items: string[] }) => (
  <Card className="p-6">
    <h3 className="font-serif text-lg mb-3">{title}</h3>
    <ul className="space-y-1.5 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="text-gold shrink-0">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </Card>
);

const CompetitionDetail = () => {
  const { slug } = useParams();
  const [c, setC] = useState<Awaited<ReturnType<typeof fetchCompetitions>>["data"][0] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetchCompetitions().then(({ data }) => {
      const found = data.find((item) => item.slug === slug) ?? null;
      if (found) {
        setC(found);
      } else {
        const staticItem = getStaticBySlug(slug);
        setC(staticItem ? { id: staticItem.slug, ...staticItem, short_description: staticItem.short_description } : null);
      }
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <div className="container py-32 text-center">Загрузка...</div>;
  if (!c) return <div className="container py-32 text-center">Конкурс не найден</div>;

  const Icon = (Icons[(COMPETITION_META[c.slug]?.icon ?? "Sparkles") as keyof typeof Icons] ??
    Icons.Sparkles) as React.ComponentType<{ className?: string }>;

  return (
    <>
      <PageHero eyebrow="Конкурс · Положение 2026" title={c.name} description={c.short_description ?? undefined} />
      <section className="py-20">
        <div className="container max-w-4xl">
          <Link to="/competitions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
            <ArrowLeft className="h-4 w-4" /> Все конкурсы
          </Link>

          <div className="flex flex-wrap items-center gap-4 mb-10">
            <div className="h-16 w-16 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold">
              <Icon className="h-8 w-8 text-gold-foreground" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Оргвзнос</div>
              <div className="font-serif text-xl">{c.org_fee ?? "См. положение"}</div>
            </div>
            <div className="sm:ml-auto text-sm text-muted-foreground">
              Срок подачи материалов и оплаты: до {FESTIVAL_2026.applicationDeadline}
            </div>
          </div>

          {c.description && (
            <Card className="p-6 mb-8">
              <h3 className="font-serif text-lg mb-3">О конкурсе</h3>
              <p className="text-muted-foreground leading-relaxed">{c.description}</p>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-5 mb-8">
            <ListCard title="Возрастные категории" items={c.age_categories ?? []} />
            <ListCard title="Номинации" items={c.nominations ?? []} />
          </div>

          {(c.stages?.length || c.criteria?.length) && (
            <div className="grid md:grid-cols-2 gap-5 mb-8">
              {c.stages?.length ? <ListCard title="Этапы / туры" items={c.stages} /> : null}
              {c.criteria?.length ? <ListCard title="Критерии оценки" items={c.criteria} /> : null}
            </div>
          )}

          {c.fee_details?.length ? (
            <Card className="p-6 mb-8">
              <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gold" /> Тарифы оргвзноса
              </h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {c.fee_details.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-gold">·</span> {item}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {c.requirements?.length ? <ListCard title="Требования и важные условия" items={c.requirements} /> : null}

          {c.payment_note && (
            <Card className="p-6 mt-8 border-gold/30 bg-gold/5">
              <h3 className="font-serif text-lg mb-2">Оплата</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.payment_note}</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/payment">Банковские реквизиты</Link>
              </Button>
            </Card>
          )}

          {c.coordinators?.length ? (
            <Card className="p-6 mt-8">
              <h3 className="font-serif text-lg mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5 text-gold" /> Координаторы конкурса
              </h3>
              <ul className="space-y-3">
                {c.coordinators.map((coord) => (
                  <li key={coord.phone} className="text-sm">
                    <div className="font-medium">{coord.name}</div>
                    <a href={`tel:${coord.phone.replace(/\s/g, "")}`} className="text-gold hover:underline">
                      {coord.phone}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Button asChild variant="festival" size="xl">
              <Link to={`/apply/${c.slug}`}>Подать заявку на этот конкурс</Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link to="/payment">Реквизиты для оплаты</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default CompetitionDetail;
