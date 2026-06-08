import { useCompetitions } from "@/hooks/use-competitions";
import { Link } from "@/lib/router-compat";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Competitions = () => {
  const { items, loading, error } = useCompetitions();

  return (
    <>
      <PageHero
        eyebrow="Конкурсные направления"
        title="Конкурсы фестиваля «Шёлковый путь»"
        description="6 конкурсов согласно Положению XV Международного фестиваля-конкурса 2026."
      />
      <section className="py-16">
        <div className="container">
          {error && (
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Данные загружены из положения. Для отправки заявок требуется соединение с сервером.
            </p>
          )}
          {loading ? (
            <p className="text-center text-muted-foreground py-12">Загрузка конкурсов...</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((c) => (
                <Card key={c.id} className="p-5 flex flex-col">
                  <div className="font-serif text-lg mb-2">{c.name}</div>
                  {c.short_description && (
                    <p className="text-sm text-muted-foreground mb-2 flex-1">
                      {c.short_description}
                    </p>
                  )}
                  {c.org_fee && (
                    <p className="text-xs text-gold mb-4">Оргвзнос: {c.org_fee}</p>
                  )}
                  <div className="flex gap-2 mt-auto">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/competitions/${c.slug}`}>Подробнее</Link>
                    </Button>
                    <Button asChild variant="festival" size="sm" disabled={!c.accepting_applications}>
                      <Link to={`/apply/${c.slug}`}>
                        {c.accepting_applications ? "Подать заявку" : "Приём закрыт"}
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Competitions;
