import { useEffect, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import * as Icons from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { fetchCompetitions } from "@/hooks/use-competitions";
import { COMPETITION_META } from "@/lib/competitions-data";
import { PageHero } from "@/components/ui/page-hero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const CompetitionDetail = () => {
  const { slug } = useParams();
  const [c, setC] = useState<Awaited<ReturnType<typeof fetchCompetitions>>["data"][0] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetchCompetitions().then(({ data }) => {
      setC(data.find((item) => item.slug === slug) ?? null);
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <div className="container py-32 text-center">Загрузка...</div>;
  if (!c) return <div className="container py-32 text-center">Конкурс не найден</div>;

  const Icon = (Icons[(COMPETITION_META[c.slug]?.icon ?? "Sparkles") as keyof typeof Icons] ??
    Icons.Sparkles) as React.ComponentType<{ className?: string }>;

  return (
    <>
      <PageHero eyebrow="Конкурс" title={c.name} description={c.short_description ?? undefined} />
      <section className="py-20">
        <div className="container max-w-4xl">
          <Link to="/competitions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
            <ArrowLeft className="h-4 w-4" /> Все конкурсы
          </Link>

          <div className="flex items-center gap-4 mb-10">
            <div className="h-16 w-16 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold">
              <Icon className="h-8 w-8 text-gold-foreground" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Оргвзнос</div>
              <div className="font-serif text-xl">{c.org_fee ?? "См. положение"}</div>
            </div>
          </div>

          {c.description && (
            <div className="prose max-w-none mb-10">
              <p>{c.description}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5 mb-10">
            <Card className="p-6">
              <h3 className="font-serif text-lg mb-3">Возрастные категории</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {(c.age_categories ?? []).map((a) => (
                  <li key={a} className="flex gap-2"><span className="text-gold">·</span> {a}</li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="font-serif text-lg mb-3">Номинации</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {(c.nominations ?? []).map((n) => (
                  <li key={n} className="flex gap-2"><span className="text-gold">·</span> {n}</li>
                ))}
              </ul>
            </Card>
          </div>

          <Button asChild variant="festival" size="xl" className="w-full sm:w-auto">
            <Link to={`/apply/${c.slug}`}>Подать заявку на этот конкурс</Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default CompetitionDetail;
