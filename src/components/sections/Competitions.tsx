import * as Icons from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { useCompetitions } from "@/hooks/use-competitions";
import { COMPETITION_META } from "@/lib/competitions-data";
import { SectionTitle } from "@/components/ui/section-title";
import { Button } from "@/components/ui/button";

const PALETTE: Record<string, { ink: string; soft: string; ribbon: string }> = {
  crimson: { ink: "hsl(350 70% 28%)", soft: "hsl(350 70% 28% / 0.08)", ribbon: "hsl(350 70% 28% / 0.85)" },
  gold: { ink: "hsl(35 75% 42%)", soft: "hsl(40 75% 52% / 0.10)", ribbon: "hsl(40 75% 52% / 0.85)" },
  indigo: { ink: "hsl(230 50% 28%)", soft: "hsl(230 50% 28% / 0.08)", ribbon: "hsl(230 50% 28% / 0.85)" },
  wine: { ink: "hsl(340 55% 22%)", soft: "hsl(340 55% 22% / 0.08)", ribbon: "hsl(340 55% 22% / 0.85)" },
  terracotta: { ink: "hsl(18 60% 42%)", soft: "hsl(18 60% 52% / 0.10)", ribbon: "hsl(18 60% 52% / 0.85)" },
};

const CardOrnament = ({ color }: { color: string }) => (
  <svg viewBox="0 0 200 80" className="absolute inset-x-0 top-0 w-full h-20 pointer-events-none" preserveAspectRatio="none" aria-hidden>
    <defs>
      <pattern id={`p-${color}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M20 4 L36 20 L20 36 L4 20 Z" stroke={color} strokeWidth="0.6" fill="none" opacity="0.5" />
        <circle cx="20" cy="20" r="1.4" fill={color} opacity="0.7" />
      </pattern>
    </defs>
    <rect width="200" height="80" fill={`url(#p-${color})`} opacity="0.45" />
  </svg>
);

export const CompetitionsList = ({ limit }: { limit?: number }) => {
  const { items, loading } = useCompetitions({ limit });

  if (loading && items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Загрузка конкурсов...</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((c, i) => {
        const Icon = (Icons[(COMPETITION_META[c.slug]?.icon ?? "Sparkles") as keyof typeof Icons] ??
          Icons.Sparkles) as React.ComponentType<{ className?: string }>;
        const p = PALETTE[COMPETITION_META[c.slug]?.color ?? "gold"] ?? PALETTE.gold;

        return (
          <Link
            key={c.id}
            to={`/competitions/${c.slug}`}
            className="group relative block rounded-none bg-card border border-foreground/10 hover:border-gold/60 transition-silk overflow-hidden"
          >
            <div className="absolute inset-0 bg-pattern-silk opacity-[0.35] pointer-events-none" />
            <div className="relative h-20 border-b border-foreground/10" style={{ background: p.soft }}>
              <CardOrnament color={p.ink} />
              <div className="absolute top-3 left-4 font-marcellus text-[10px] tracking-[0.3em] uppercase" style={{ color: p.ink }}>
                № {String(i + 1).padStart(2, "0")}
              </div>
              <div className="absolute -bottom-7 left-6">
                <div className="relative h-14 w-14 rounded-full bg-card flex items-center justify-center border" style={{ borderColor: p.ink, color: p.ink }}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              {c.accepting_applications && (
                <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-marcellus uppercase tracking-[0.18em] text-background" style={{ background: p.ribbon }}>
                  Приём открыт
                </div>
              )}
            </div>
            <div className="relative pt-12 px-6 pb-6">
              <h3 className="font-display text-xl leading-tight mb-2 group-hover:italic transition-silk" style={{ color: p.ink }}>
                {c.name}
              </h3>
              <p className="text-sm text-foreground/75 leading-relaxed mb-4 min-h-[3rem]">{c.short_description}</p>
              <div className="flex items-end justify-between border-t border-dashed border-foreground/15 pt-4">
                <div>
                  <div className="text-[10px] font-marcellus uppercase tracking-[0.22em] text-foreground/50">Оргвзнос</div>
                  <div className="font-display text-sm" style={{ color: p.ink }}>{c.org_fee ?? "См. положение"}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-marcellus uppercase tracking-[0.2em] group-hover:gap-3 transition-silk" style={{ color: p.ink }}>
                  Подробнее <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export const CompetitionsSection = () => (
  <section className="py-24">
    <div className="container">
      <SectionTitle
        eyebrow="6 конкурсов"
        title="Конкурсные направления"
        description="Согласно Положению XV Международного фестиваля-конкурса «Шёлковый путь», 2026."
      />
      <CompetitionsList />
      <div className="text-center mt-12">
        <Button asChild variant="wine" size="lg">
          <Link to="/competitions">Все конкурсы</Link>
        </Button>
      </div>
    </div>
  </section>
);
