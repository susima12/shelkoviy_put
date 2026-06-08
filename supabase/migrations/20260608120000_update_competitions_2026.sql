-- Обновление конкурсов строго по Положению ШП-2026 (6 конкурсов)

-- Удаляем конкурсы, которых нет в положении
DELETE FROM public.competitions
WHERE slug IN ('izo', 'design', 'photo', 'zhanr', 'slovo', 'pedagog', 'teatr');

-- Конкурс театров моды
INSERT INTO public.competitions (slug, name, short_description, description, display_order, age_categories, nominations)
VALUES (
  'teatry-mody',
  'Конкурс театров моды',
  'Театрализованный показ коллекции моделей костюма на основе единого художественного замысла',
  'Театр костюма и моды — синтез режиссуры, показа (дефиле), музыки, сценографии и хореографии. Максимальное время презентации одной коллекции — не более 5 минут.',
  1,
  ARRAY['4–7 лет','8–10 лет','11–12 лет','13–15 лет','16–18 лет','Смешанная группа'],
  ARRAY['Эскизный проект конкурсной коллекции (обязательно)','«Кostюм — художественная идея»','«Пret-a-porter»','«Традиции и современность»']
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  age_categories = EXCLUDED.age_categories,
  nominations = EXCLUDED.nominations,
  accepting_applications = true;

-- Конкурс «Юный модельер»
INSERT INTO public.competitions (slug, name, short_description, description, display_order, age_categories, nominations)
VALUES (
  'yunyy-modeler',
  'Конкурс «Юный модельер»',
  'Тема конкурса «Экология» — осмысление проблем окружающей среды через дизайн одежды и аксессуаров',
  '1 этап — представление эскизов (5–7 моделей), 2 этап — демонстрация готового изделия (до 3 минут).',
  2,
  ARRAY['7–9 лет','10–12 лет','13–15 лет','16–18 лет','Обучающиеся колледжей','Студенты ВУЗ'],
  ARRAY['«Эскизный проект» — «Пret-a-porter»','«Эскизный проект» — «Художественный образ и перформанс»','«От эскиза до модели» — «Пret-a-porter»','«От эскиза до модели» — «Художественный образ и перформанс»','Участие в качестве модели']
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  age_categories = EXCLUDED.age_categories,
  nominations = EXCLUDED.nominations,
  accepting_applications = true;

-- Конкурс театральных коллективов
INSERT INTO public.competitions (slug, name, short_description, description, display_order, age_categories, nominations)
VALUES (
  'teatralnye-kollektivy',
  'Конкурс театральных коллективов',
  'Художественное слово, музыкальные и драматические театры, театр кукол, пластика, театр игры',
  'Композиционно законченный фрагмент продолжительностью 15, 30 или 45 минут сценического времени.',
  3,
  ARRAY['I — 5–7 лет','II — 8–10 лет','III — 11–14 лет','IV — 15–18 лет','V — 19 лет и старше'],
  ARRAY['«Музыкальные театры»','«Театр кукол»','«Художественное слово»','«Пластика и пантомима»','«Театр игры»','«Театр драмы»','«Ведущий игровых и шоу-программ»']
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  age_categories = EXCLUDED.age_categories,
  nominations = EXCLUDED.nominations,
  accepting_applications = true;

-- Конкурс солистов и вокальных коллективов
UPDATE public.competitions SET
  name = 'Конкурс солистов и вокальных коллективов',
  short_description = 'Академическое, народное и эстрадное пение — солисты, малые формы, ансамбли, хоры',
  description = 'Номинация «Первые шаги» — для обучающихся 1–2 годов обучения. Хронометраж — не более 4 минут.',
  display_order = 4,
  age_categories = ARRAY['4–6 лет (дошкольная)','7–8 лет (I младшая)','9–10 лет (II младшая)','11–13 лет (средняя)','14–16 лет (I старшая)','17–21 год (II старшая)','22 года и более','«Профи»'],
  nominations = ARRAY['«Первые шаги» — академическое пение','«Первые шаги» — народное пение','«Первые шаги» — эстрадное пение','Основная — академическое пение','Основная — народное пение','Основная — эстрадное пение'],
  accepting_applications = true
WHERE slug = 'vokal';

-- Конкурс «Хореография»
UPDATE public.competitions SET
  name = 'Конкурс «Хореография»',
  short_description = 'Соло, дуэты и ансамбли — все направления танцевального искусства',
  description = 'На каждый конкурсный номер заполняется отдельная заявка. Программа — 1 танцевальный номер, не более 4 минут.',
  display_order = 5,
  age_categories = ARRAY['4–5 лет','5–6 лет','6–7 лет','7–8 лет','9–11 лет','12–14 лет','14–18 лет','19–25 лет','26 лет и старше','Смешанный возраст'],
  nominations = ARRAY['Детский танец','Современный танец (джazz, модерн, контемпорари)','Классический танец','Эстрадный танец','Народный танец','Народный — стилизованный танец','Этно/фолк танец','Уличный танец (dancehall, hip-hop, break dance, house и др.)','Эстрадно-спортивный танец','Театр танца','Танцевальное шоу'],
  accepting_applications = true
WHERE slug = 'horeograph';

-- Конкурс «Инструментальное исполнительство»
UPDATE public.competitions SET
  name = 'Конкурс «Инструментальное исполнительство»',
  short_description = 'Солисты и ансамбли — академическое, народное и популярное направления',
  description = 'Программа из 1 произведения, хронометраж не более 5 минут. При подаче заявки обязательно указать инструмент.',
  display_order = 6,
  age_categories = ARRAY['4–6 лет','7–8 лет','9–10 лет','11–13 лет','14–16 лет','17–19 лет','20–25 лет','26 лет и старше','«Профи»','«Мастер и ученик»','«Смешанная группа»'],
  nominations = ARRAY['Основная — специальное фортепиано','Основная — общее фортепиано','Основная — струнные инструменты','Основная — народные инструменты','Основная — духовые инструменты','Основная — фортепианный ансамбль','Основная — аккомпаниатор','«Первые шаги» — специальное фортепиано','«Первые шаги» — общее фортепиано','«Первые шаги» — струнные инструменты','«Первые шаги» — народные инструменты','«Первые шаги» — духовые инструменты','«Первые шаги» — фортепианный ансамбль'],
  accepting_applications = true
WHERE slug = 'instrument';

-- Только авторизованные пользователи могут подавать заявки
DROP POLICY IF EXISTS "anyone can insert applications" ON public.applications;
CREATE POLICY "authenticated users insert own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
