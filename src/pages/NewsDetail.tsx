import { useEffect, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import { api, type NewsRow } from "@/lib/api-client";
import { NewsArticle } from "@/components/news/NewsCard";
import { BackButton } from "@/components/ui/back-button";
import { ArrowLeft } from "lucide-react";

const NewsDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<NewsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getNewsItem(id)
      .then(({ news }) => setItem(news))
      .catch((e: { status?: number }) => {
        if (e?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="container py-32 text-center text-muted-foreground">Загрузка...</div>;
  }

  if (notFound || !item) {
    return (
      <div className="container py-32 text-center">
        <p className="text-muted-foreground mb-4">Новость не найдена</p>
        <Link to="/news" className="text-primary underline inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> К списку новостей
        </Link>
      </div>
    );
  }

  return (
    <section className="pt-28 pb-16 md:pt-32 md:pb-20">
      <div className="container max-w-3xl">
        <BackButton fallbackTo="/news" />
        <div className="mt-6">
          <NewsArticle item={item} />
        </div>
      </div>
    </section>
  );
};

export default NewsDetail;
