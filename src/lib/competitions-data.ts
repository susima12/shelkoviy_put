/** Конкурсы фестиваля — строго по Положению ШП-2026 */

export type CompetitionFieldType = "text" | "number" | "select" | "textarea";

export interface CompetitionFormField {
  key: string;
  label: string;
  type: CompetitionFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  /** Куда сохранять: стандартная колонка или notes (доп. поля) */
  storage: "age_category" | "nomination" | "performance_title" | "duration_minutes" | "participants_count" | "organization" | "notes";
}

export interface StaticCompetition {
  slug: string;
  name: string;
  short_description: string;
  description: string;
  display_order: number;
  accepting_applications: boolean;
  age_categories: string[];
  nominations: string[];
  org_fee: string;
  formFields: CompetitionFormField[];
}

export const FESTIVAL_COMPETITIONS: StaticCompetition[] = [
  {
    slug: "teatry-mody",
    name: "Конкурс театров моды",
    short_description: "Театрализованный показ коллекции моделей костюма на основе единого художественного замысла",
    description:
      "Театр костюма и моды — синтез режиссуры, показа (дефиле), музыки, сценографии и хореографии. Максимальное время презентации одной коллекции — не более 5 минут. На конкурс может быть представлена одна или две коллекции от каждой возрастной группы.",
    display_order: 1,
    accepting_applications: true,
    age_categories: ["4–7 лет", "8–10 лет", "11–12 лет", "13–15 лет", "16–18 лет", "Смешанная группа"],
    nominations: [
      "Эскизный проект конкурсной коллекции (обязательно)",
      "«Костюм — художественная идея»",
      "«Пret-a-porter»",
      "«Традиции и современность»",
    ],
    org_fee: "8 000 ₽ за участие в одной номинации (в одной коллекции)",
    formFields: [
      { key: "organization", label: "Название театра моды / коллектива *", type: "text", required: true, storage: "organization" },
      { key: "performance_title", label: "Название коллекции *", type: "text", required: true, storage: "performance_title" },
      { key: "participants_count", label: "Количество моделей в коллекции *", type: "number", required: true, storage: "participants_count" },
      { key: "duration_minutes", label: "Продолжительность показа (мин, макс. 5) *", type: "number", required: true, storage: "duration_minutes" },
      {
        key: "notes",
        label: "Город, страна (для эскизного проекта)",
        type: "text",
        storage: "notes",
        placeholder: "Город, страна",
      },
    ],
  },
  {
    slug: "yunyy-modeler",
    name: "Конкурс «Юный модельер»",
    short_description: "Тема конкурса «Экология» — осмысление проблем окружающей среды через дизайн одежды и аксессуаров",
    description:
      "Конкурс направлен на выявление одарённых детей и молодёжи в области моделирования. 1 этап — представление эскизов (5–7 моделей), 2 этап — демонстрация готового изделия (до 3 минут).",
    display_order: 2,
    accepting_applications: true,
    age_categories: [
      "7–9 лет",
      "10–12 лет",
      "13–15 лет",
      "16–18 лет",
      "Обучающиеся колледжей",
      "Студенты ВУЗ",
    ],
    nominations: [
      "«Эскизный проект» — «Пret-a-porter»",
      "«Эскизный проект» — «Художественный образ и перформанс»",
      "«От эскиза до модели» — «Пret-a-porter»",
      "«От эскиза до модели» — «Художественный образ и перформанс»",
      "Участие в качестве модели",
    ],
    org_fee: "1 500 ₽ за одного участника; модель — 1 000 ₽",
    formFields: [
      { key: "performance_title", label: "Название коллекции / работы *", type: "text", required: true, storage: "performance_title" },
      {
        key: "notes",
        label: "Количество эскизов (5–7) и этап участия",
        type: "text",
        required: true,
        storage: "notes",
        placeholder: "Например: 6 эскизов, этап 1",
      },
      { key: "participants_count", label: "Количество участников", type: "number", storage: "participants_count" },
    ],
  },
  {
    slug: "teatralnye-kollektivy",
    name: "Конкурс театральных коллективов",
    short_description: "Художественное слово, музыкальные и драматические театры, театр кукол, пластика, театр игры",
    description:
      "Композиционно законченный фрагмент продолжительностью 15, 30 или 45 минут сценического времени. Программа выступления (5 экз.) с указанием произведения, автора, действующих лиц.",
    display_order: 3,
    accepting_applications: true,
    age_categories: ["I — 5–7 лет", "II — 8–10 лет", "III — 11–14 лет", "IV — 15–18 лет", "V — 19 лет и старше"],
    nominations: [
      "«Музыкальные театры»",
      "«Театр кукол»",
      "«Художественное слово»",
      "«Пластика и пантомима»",
      "«Театр игры»",
      "«Театр драмы»",
      "«Ведущий игровых и шоу-программ»",
    ],
    org_fee: "от 1 200 ₽ (сольно) до 7 000 ₽ (спектакль 15–45 мин)",
    formFields: [
      { key: "organization", label: "Образовательная организация / коллектив *", type: "text", required: true, storage: "organization" },
      { key: "performance_title", label: "Название произведения / спектакля *", type: "text", required: true, storage: "performance_title" },
      {
        key: "notes",
        label: "Формат выступления *",
        type: "select",
        required: true,
        storage: "notes",
        options: [
          "Художественное слово (сольно)",
          "Художественное слово (дуэт)",
          "Отрывок до 15 минут",
          "Спектакль 15–45 минут",
          "Ведущий игровых и шоу-программ (до 20 мин)",
        ],
      },
      {
        key: "duration_minutes",
        label: "Продолжительность (мин) *",
        type: "number",
        required: true,
        storage: "duration_minutes",
      },
      { key: "participants_count", label: "Количество участников (с указанием возраста) *", type: "number", required: true, storage: "participants_count" },
    ],
  },
  {
    slug: "vokal",
    name: "Конкурс солистов и вокальных коллективов",
    short_description: "Академическое, народное и эстрадное пение — солисты, малые формы, ансамбли, хоры",
    description:
      "Номинация «Первые шаги» — для обучающихся 1–2 годов обучения. Основная номинация — солисты, дуэты, трио, ансамбли (4–16 чел.), хоровые коллективы (от 16 чел.). Хронометраж — не более 4 минут.",
    display_order: 4,
    accepting_applications: true,
    age_categories: [
      "4–6 лет (дошкольная)",
      "7–8 лет (I младшая)",
      "9–10 лет (II младшая)",
      "11–13 лет (средняя)",
      "14–16 лет (I старшая)",
      "17–21 год (II старшая)",
      "22 года и более",
      "«Профи»",
    ],
    nominations: [
      "«Первые шаги» — академическое пение",
      "«Первые шаги» — народное пение",
      "«Первые шаги» — эстрадное пение",
      "Основная — академическое пение",
      "Основная — народное пение",
      "Основная — эстрадное пение",
    ],
    org_fee: "от 1 600 ₽ («Первые шаги») до 4 800 ₽ (хор)",
    formFields: [
      {
        key: "notes",
        label: "Категория участников *",
        type: "select",
        required: true,
        storage: "notes",
        options: ["Солист", "Дуэт", "Трио", "Вокальный ансамбль (4–16 чел.)", "Хоровой коллектив (от 16 чел.)"],
      },
      { key: "performance_title", label: "Название произведения *", type: "text", required: true, storage: "performance_title" },
      { key: "duration_minutes", label: "Хронометраж (мин, макс. 4) *", type: "number", required: true, storage: "duration_minutes" },
      { key: "participants_count", label: "Количество исполнителей *", type: "number", required: true, storage: "participants_count" },
      { key: "organization", label: "Коллектив / учебное заведение", type: "text", storage: "organization" },
    ],
  },
  {
    slug: "horeograph",
    name: "Конкурс «Хореография»",
    short_description: "Соло, дуэты и ансамбли — все направления танцевального искусства",
    description:
      "На каждый конкурсный номер заполняется отдельная заявка. Программа — 1 танцевальный номер, не более 4 минут (соло — 3 мин, «Театр танца» — 8 мин). Фонограммы на USB за 3 дня до конкурса.",
    display_order: 5,
    accepting_applications: true,
    age_categories: [
      "4–5 лет",
      "5–6 лет",
      "6–7 лет",
      "7–8 лет",
      "9–11 лет",
      "12–14 лет",
      "14–18 лет",
      "19–25 лет",
      "26 лет и старше",
      "Смешанный возраст",
    ],
    nominations: [
      "Детский танец",
      "Современный танец (джаз, модерн, контемпорари)",
      "Классический танец",
      "Эстрадный танец",
      "Народный танец",
      "Народный — стилизованный танец",
      "Этно/фолк танец",
      "Уличный танец (dancehall, hip-hop, break dance, house и др.)",
      "Эстрадно-спортивный танец",
      "Театр танца",
      "Танцевальное шоу",
    ],
    org_fee: "Соло — 2 000 ₽; дуэт — 2 500 ₽; ансамбль — 800 ₽/чел.",
    formFields: [
      {
        key: "notes",
        label: "Форма участия *",
        type: "select",
        required: true,
        storage: "notes",
        options: ["Соло", "Дуэт", "Ансамбль (от 3 человек)"],
      },
      { key: "performance_title", label: "Название номера *", type: "text", required: true, storage: "performance_title" },
      { key: "duration_minutes", label: "Продолжительность номера (мин) *", type: "number", required: true, storage: "duration_minutes" },
      { key: "participants_count", label: "Количество человек *", type: "number", required: true, storage: "participants_count" },
      { key: "organization", label: "Название коллектива *", type: "text", required: true, storage: "organization" },
    ],
  },
  {
    slug: "instrument",
    name: "Конкурс «Инструментальное исполнительство»",
    short_description: "Солисты и ансамбли — академическое, народное и популярное направления",
    description:
      "Программа из 1 произведения, хронометраж не более 5 минут. При подаче заявки обязательно указать инструмент. Репетиции не предоставляются.",
    display_order: 6,
    accepting_applications: true,
    age_categories: [
      "4–6 лет",
      "7–8 лет",
      "9–10 лет",
      "11–13 лет",
      "14–16 лет",
      "17–19 лет",
      "20–25 лет",
      "26 лет и старше",
      "«Профи»",
      "«Мастер и ученик»",
      "«Смешанная группа»",
    ],
    nominations: [
      "Основная — специальное фортепиано",
      "Основная — общее фортепиано",
      "Основная — струнные инструменты",
      "Основная — народные инструменты",
      "Основная — духовые инструменты",
      "Основная — фортепианный ансамбль",
      "Основная — аккомпаниатор",
      "«Первые шаги» — специальное фортепиано",
      "«Первые шаги» — общее фортепиано",
      "«Первые шаги» — струнные инструменты",
      "«Первые шаги» — народные инструменты",
      "«Первые шаги» — духовые инструменты",
      "«Первые шаги» — фортепианный ансамбль",
    ],
    org_fee: "Соло — 1 900 ₽ (основная) / 1 500 ₽ («Первые шаги»)",
    formFields: [
      {
        key: "notes",
        label: "Инструмент *",
        type: "text",
        required: true,
        storage: "notes",
        placeholder: "Например: скрипка, фортепиано, домра",
      },
      {
        key: "organization",
        label: "Категория участников *",
        type: "select",
        required: true,
        storage: "organization",
        options: ["Солист", "Дуэт", "Малый ансамбль (3–5 чел.)", "Ансамбль (6 и более чел.)"],
      },
      { key: "performance_title", label: "Название произведения *", type: "text", required: true, storage: "performance_title" },
      { key: "duration_minutes", label: "Хронометраж (мин, макс. 5) *", type: "number", required: true, storage: "duration_minutes" },
      { key: "participants_count", label: "Количество исполнителей *", type: "number", required: true, storage: "participants_count" },
    ],
  },
];

export const COMPETITION_META: Record<string, { icon: string; color: string }> = {
  "teatry-mody": { icon: "Scissors", color: "gold" },
  "yunyy-modeler": { icon: "Palette", color: "terracotta" },
  "teatralnye-kollektivy": { icon: "Theater", color: "wine" },
  vokal: { icon: "Mic", color: "crimson" },
  horeograph: { icon: "Music", color: "gold" },
  instrument: { icon: "Music2", color: "indigo" },
};

export function getStaticBySlug(slug: string) {
  return FESTIVAL_COMPETITIONS.find((c) => c.slug === slug);
}
