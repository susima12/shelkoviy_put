import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { api, type NewsRow } from "@/lib/api-client";
import { NewsCard } from "@/components/news/NewsCard";
import { SectionTitle } from "@/components/ui/section-title";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function NewsSection() {
  const [items, setItems] = useState<NewsRow[]>([]);

  useEffect(() => {
    api.getNews().then(({ news }) => setItems((news ?? []).slice(0, 3))).catch(() => setItems([]));
  }, []);

  if (items.length === 0) return null;

  const [featured, ...rest] = items;

  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-pattern-silk opacity-[0.03] pointer-events-none" />
      <div className="container relative">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <SectionTitle
            align="left"
            className="mb-0"
            eyebrow="Афиша"
            title="Новости фестиваля"
            description="Анонсы, итоги и важные объявления для участников"
          />
          <Button asChild variant="outline" className="shrink-0">
            <Link to="/news">
              Все новости <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

            <div className="grid gap-6 md:grid-cols-2 auto-rows-fr">
              <NewsCard item={featured} featured className="md:col-span-2" />
          {rest.map((n) => (
            <NewsCard key={n.id} item={n} />
          ))}
        </div>
      </div>
    </section>
  );
}
