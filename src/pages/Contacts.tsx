import { PageHero } from "@/components/ui/page-hero";
import { Card } from "@/components/ui/card";
import { Mail, MapPin, Phone, Clock, Calendar } from "lucide-react";
import { FESTIVAL_2026, ORGANIZERS } from "@/lib/festival-info";

const Contacts = () => (
  <>
    <PageHero
      eyebrow="Связаться с нами"
      title="Контакты"
      description="Оргкомитет XV Международного фестиваля-конкурса «Шёлковый путь», 2026."
    />
    <section className="py-20">
      <div className="container max-w-4xl grid sm:grid-cols-2 gap-5">
        {[
          { icon: MapPin, t: "Место проведения фестиваля", v: FESTIVAL_2026.venue },
          { icon: MapPin, t: "Адрес оператора персональных данных", v: FESTIVAL_2026.operatorAddress },
          { icon: Mail, t: "Email для заявок и оплаты", v: FESTIVAL_2026.email },
          { icon: Phone, t: "Телефон оргкомитета", v: FESTIVAL_2026.phone },
          { icon: Calendar, t: "Даты фестиваля", v: FESTIVAL_2026.dates },
          { icon: Clock, t: "Срок подачи заявок и материалов", v: `до ${FESTIVAL_2026.applicationDeadline}` },
        ].map((c) => (
          <Card key={c.t} className="p-7 hover:shadow-elegant transition-silk">
            <c.icon className="h-7 w-7 text-gold mb-4" />
            <div className="font-serif text-xl mb-2">{c.t}</div>
            <div className="text-muted-foreground whitespace-pre-line">{c.v}</div>
          </Card>
        ))}
      </div>

      <div className="container max-w-4xl mt-10 space-y-5">
        <Card className="p-8 bg-secondary/40">
          <h3 className="font-serif text-2xl mb-3">Организаторы фестиваля-конкурса</h3>
          <ul className="space-y-2 text-muted-foreground">
            {ORGANIZERS.map((org) => (
              <li key={org} className="flex gap-2">
                <span className="text-gold">·</span> {org}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-8">
          <h3 className="font-serif text-2xl mb-3">Учредитель</h3>
          <p className="text-muted-foreground">
            Автономная некоммерческая организация детского и юношеского
            творчества «Шёлковый путь» (АНО «Шёлковый путь» / SILK WAY) основана
            в 2010 году. Официальный сайт фестиваля: {FESTIVAL_2026.website}
          </p>
        </Card>
      </div>
    </section>
  </>
);

export default Contacts;
