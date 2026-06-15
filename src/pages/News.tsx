import { useEffect, useState } from "react";
import { api, type NewsRow } from "@/lib/api-client";
import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { NewsCard } from "@/components/news/NewsCard";
import { Newspaper } from "lucide-react";

const News = () => {
  const [news, setNews] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getNews()
      .then(({ news }) => setNews(news ?? []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero eyebrow="Афиша и события" title="Новости фестиваля" description="Анонсы, итоги конкурсов, мастер-классы и встречи." />
      <section className="py-20">
        <div className="container max-w-5xl">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">Загрузка...</p>
          ) : news.length === 0 ? (
            <Card className="p-12 text-center">
              <Newspaper className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-serif text-2xl mb-2">Новостей пока нет</h3>
              <p className="text-muted-foreground">Следите за обновлениями — скоро здесь появятся анонсы.</p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 auto-rows-fr">
              {news.map((n, i) => (
                <NewsCard key={n.id} item={n} featured={i === 0} className={i === 0 ? "sm:col-span-2" : ""} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default News;
