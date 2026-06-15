import { Link } from "@/lib/router-compat";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowRight, Newspaper } from "lucide-react";
import type { NewsRow } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Ornament } from "@/components/ui/ornament";

type NewsCardProps = {
  item: NewsRow;
  featured?: boolean;
  className?: string;
};

export function NewsCard({ item, featured, className }: NewsCardProps) {
  const date = format(new Date(item.published_at), "d MMMM yyyy", { locale: ru });
  const detailTo = `/news/${item.id}`;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-foreground/10 bg-card shadow-sm transition-all duration-300",
        "hover:border-gold/45 hover:shadow-elegant hover:-translate-y-0.5",
        featured ? "sm:flex sm:items-stretch" : "flex flex-col",
        className
      )}
    >
      <div className="absolute inset-0 bg-pattern-silk opacity-[0.35] pointer-events-none" />

      <Link
        to={detailTo}
        className={cn(
          "relative z-[1] block overflow-hidden shrink-0 bg-secondary/60",
          featured
            ? "w-full sm:w-[44%] min-h-[220px] sm:min-h-0 sm:self-stretch"
            : "w-full aspect-[5/3] sm:aspect-[16/10]"
        )}
        aria-label={`Открыть: ${item.title}`}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-silk">
            <Newspaper className="h-14 w-14 text-gold/35" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
        <span className="absolute top-3 left-3 z-[2] rounded-full bg-black/45 backdrop-blur-sm px-3 py-1 font-marcellus text-[10px] uppercase tracking-[0.22em] text-gold-soft">
          {date}
        </span>
      </Link>

      <div
        className={cn(
          "relative z-[1] flex flex-1 flex-col min-w-0 border-t sm:border-t-0 sm:border-l border-foreground/10",
          featured ? "p-6 sm:p-8 lg:p-10" : "p-5 sm:p-6"
        )}
      >
        <div className="absolute top-0 left-0 w-12 h-0.5 bg-gold/80 hidden sm:block" />

        <Link to={detailTo} className="block min-w-0 flex-1">
          <h3
            className={cn(
              "font-display leading-snug text-foreground transition-colors group-hover:text-primary",
              featured ? "text-2xl sm:text-3xl mb-3" : "text-xl mb-2"
            )}
          >
            {item.title}
          </h3>
          {item.excerpt ? (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-3">
              {item.excerpt}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/70 italic">Нажмите, чтобы прочитать</p>
          )}
        </Link>

        <div className="mt-5 pt-4 border-t border-dashed border-foreground/15">
          <Link
            to={detailTo}
            className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/5 px-4 py-2.5 text-xs font-marcellus uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-gold/15 hover:border-gold/60"
          >
            Читать полностью
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function NewsArticle({ item }: { item: NewsRow }) {
  const date = format(new Date(item.published_at), "d MMMM yyyy", { locale: ru });
  const updated =
    item.updated_at && item.updated_at !== item.published_at
      ? format(new Date(item.updated_at), "d MMMM yyyy", { locale: ru })
      : null;

  return (
    <article className="relative">
      <div className="mb-10 md:mb-12">
        <Ornament className="mb-5 max-w-xs" />
        <time className="font-marcellus text-xs uppercase tracking-[0.32em] text-gold">{date}</time>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl leading-[1.1] text-balance">
          {item.title}
        </h1>
        {item.excerpt && (
          <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl font-light border-l-2 border-gold/50 pl-5">
            {item.excerpt}
          </p>
        )}
        {updated && (
          <p className="mt-3 text-xs text-muted-foreground">Обновлено: {updated}</p>
        )}
      </div>

      {item.image_url && (
        <figure className="mb-10 md:mb-14 -mx-4 sm:mx-0">
          <div className="relative overflow-hidden rounded-none sm:rounded-2xl border-y sm:border border-foreground/10 shadow-elegant bg-gradient-silk">
            <div className="aspect-[4/3] sm:aspect-[16/10] md:aspect-[21/9] max-h-[520px] w-full">
              <img
                src={item.image_url}
                alt=""
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </figure>
      )}

      {item.body && (
        <div className="rounded-xl border border-foreground/10 bg-card/50 p-6 sm:p-8 md:p-10 shadow-sm">
          <div className="max-w-none space-y-5">
            {item.body.split(/\n{2,}/).map((para, i) => (
              <p
                key={i}
                className={cn(
                  "text-base md:text-lg text-foreground/90 leading-[1.75] whitespace-pre-wrap",
                  i === 0 && "first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:leading-none first-letter:text-gold"
                )}
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {!item.body && !item.excerpt && (
        <p className="text-muted-foreground text-center py-8">Текст новости пока не добавлен.</p>
      )}
    </article>
  );
}
