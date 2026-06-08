
-- ============= BASE FESTIVAL SCHEMA =============
create type public.app_role as enum ('admin', 'user');
create type public.application_status as enum ('new','reviewing','approved','rejected');

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_description text,
  description text,
  display_order int not null default 0,
  accepting_applications boolean not null default true,
  cover_url text,
  age_categories text[] not null default '{}',
  nominations text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.competitions enable row level security;
create policy "competitions readable by all" on public.competitions for select using (true);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  username text unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "own profile update" on public.profiles for update using (auth.uid() = user_id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  competition_id uuid references public.competitions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role, competition_id)
);
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin_of(_user_id uuid, _competition uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'admin' and competition_id = _competition)
$$;

create or replace function public.admin_competition(_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select competition_id from public.user_roles where user_id = _user_id and role = 'admin' limit 1
$$;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  leader_full_name text not null,
  email text not null,
  phone text not null,
  country text, city text, organization text,
  participant_name text not null,
  age_category text, nomination text, performance_title text,
  duration_minutes numeric, participants_count int,
  video_url text, notes text,
  attachment_path text, payment_receipt_path text,
  status application_status not null default 'new',
  admin_notes text, invite_link text,
  created_at timestamptz not null default now()
);
alter table public.applications enable row level security;
create policy "authenticated users insert own applications" on public.applications for insert with check (auth.uid() is not null and user_id = auth.uid());
create policy "owner reads own application" on public.applications for select using (auth.uid() is not null and user_id = auth.uid());
create policy "admin reads own competition applications" on public.applications for select using (public.is_admin_of(auth.uid(), competition_id));
create policy "admin updates own competition applications" on public.applications for update using (public.is_admin_of(auth.uid(), competition_id));

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null, excerpt text, body text,
  published_at timestamptz not null default now(), cover_url text
);
alter table public.news enable row level security;
create policy "news readable" on public.news for select using (true);

create table public.jury_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null, title text, bio text, photo_url text,
  display_order int not null default 0
);
alter table public.jury_members enable row level security;
create policy "jury readable" on public.jury_members for select using (true);

-- ============= LEGACY COMPETITION CHAT =============
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text, content text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;

create table public.chat_members (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text, banned boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (competition_id, user_id)
);
alter table public.chat_members enable row level security;

create or replace function public.is_chat_member(_user_id uuid, _competition uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_members where user_id = _user_id and competition_id = _competition and banned = false)
$$;

create policy "members read messages of their competition" on public.chat_messages for select using (public.is_chat_member(auth.uid(), competition_id) or public.is_admin_of(auth.uid(), competition_id));
create policy "members post messages" on public.chat_messages for insert with check (auth.uid() = user_id and (public.is_chat_member(auth.uid(), competition_id) or public.is_admin_of(auth.uid(), competition_id)));
create policy "admin deletes messages" on public.chat_messages for delete using (public.is_admin_of(auth.uid(), competition_id));
create policy "user joins chat" on public.chat_members for insert with check (auth.uid() = user_id);
create policy "admin invites members" on public.chat_members for insert with check (public.is_admin_of(auth.uid(), competition_id));
create policy "members read members" on public.chat_members for select using (public.is_chat_member(auth.uid(), competition_id) or public.is_admin_of(auth.uid(), competition_id) or auth.uid() = user_id);
create policy "admin updates members" on public.chat_members for update using (public.is_admin_of(auth.uid(), competition_id));
create policy "admin deletes members" on public.chat_members for delete using (public.is_admin_of(auth.uid(), competition_id));

-- ============= DIRECT MESSENGER =============
create table public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint dm_users_ordered check (user_a < user_b),
  unique (user_a, user_b)
);
alter table public.dm_conversations enable row level security;

-- Permissive: any authenticated user can DM any other authenticated user
create or replace function public.can_dm(_from uuid, _to uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _from is not null and _to is not null and _from <> _to
$$;

create policy "dm participant reads conv" on public.dm_conversations for select using (auth.uid() = user_a or auth.uid() = user_b);
create policy "dm create if allowed" on public.dm_conversations for insert with check ((auth.uid() = user_a or auth.uid() = user_b) and public.can_dm(auth.uid(), case when auth.uid() = user_a then user_b else user_a end));
create policy "dm participant updates" on public.dm_conversations for update using (auth.uid() = user_a or auth.uid() = user_b);

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  reply_to uuid references public.dm_messages(id) on delete set null,
  edited_at timestamptz, deleted_at timestamptz, pinned_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.dm_messages enable row level security;

create or replace function public.is_dm_participant(_user uuid, _conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dm_conversations where id = _conv and (user_a = _user or user_b = _user))
$$;

create policy "dm read messages" on public.dm_messages for select using (public.is_dm_participant(auth.uid(), conversation_id));
create policy "dm send messages" on public.dm_messages for insert with check (auth.uid() = sender_id and public.is_dm_participant(auth.uid(), conversation_id));
create policy "dm sender edits" on public.dm_messages for update using (auth.uid() = sender_id);
create policy "dm sender deletes" on public.dm_messages for delete using (auth.uid() = sender_id);

create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.dm_conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end; $$;
create trigger dm_messages_bump after insert on public.dm_messages for each row execute function public.bump_conversation();

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_members;
alter publication supabase_realtime add table public.applications;
alter publication supabase_realtime add table public.dm_messages;
alter publication supabase_realtime add table public.dm_conversations;

insert into storage.buckets (id, name, public) values ('applications', 'applications', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

create policy "anyone uploads applications" on storage.objects for insert with check (bucket_id = 'applications');
create policy "auth read applications" on storage.objects for select using (bucket_id = 'applications' and auth.role() = 'authenticated');
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars own upload" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars own update" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars own delete" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-z0-9_]', '', 'g'));
  if base_username is null or length(base_username) < 3 then base_username := 'user_' || substr(new.id::text, 1, 8); end if;
  while exists (select 1 from public.profiles where username = base_username) loop
    base_username := base_username || substr(md5(random()::text), 1, 4);
  end loop;
  insert into public.profiles (user_id, email, display_name, username)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', new.email), base_username);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.competitions (slug, name, short_description, display_order, age_categories, nominations) values
  ('vokal','Р’РѕРєР°Р»','РЎРѕР»СЊРЅРѕРµ Рё Р°РЅСЃР°РјР±Р»РµРІРѕРµ РІРѕРєР°Р»СЊРЅРѕРµ РёСЃРїРѕР»РЅРµРЅРёРµ',1, ARRAY['РґРѕ 6 Р»РµС‚','7вЂ“9 Р»РµС‚','10вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','19вЂ“25 Р»РµС‚','СЃРјРµС€Р°РЅРЅР°СЏ'], ARRAY['Р­СЃС‚СЂР°РґРЅС‹Р№ РІРѕРєР°Р»','РќР°СЂРѕРґРЅС‹Р№ РІРѕРєР°Р»','РђРєР°РґРµРјРёС‡РµСЃРєРёР№ РІРѕРєР°Р»','Р”Р¶Р°Р·РѕРІС‹Р№ РІРѕРєР°Р»','РЎРѕР»Рѕ','РђРЅСЃР°РјР±Р»СЊ','РҐРѕСЂ']),
  ('horeograph','РҐРѕСЂРµРѕРіСЂР°С„РёСЏ','Р’СЃРµ РЅР°РїСЂР°РІР»РµРЅРёСЏ С‚Р°РЅС†РµРІР°Р»СЊРЅРѕРіРѕ РёСЃРєСѓСЃСЃС‚РІР°',2, ARRAY['РґРѕ 6 Р»РµС‚','7вЂ“9 Р»РµС‚','10вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','19вЂ“25 Р»РµС‚','СЃРјРµС€Р°РЅРЅР°СЏ'], ARRAY['РќР°СЂРѕРґРЅС‹Р№ С‚Р°РЅРµС†','РљР»Р°СЃСЃРёС‡РµСЃРєРёР№ С‚Р°РЅРµС†','РЎРѕРІСЂРµРјРµРЅРЅС‹Р№ С‚Р°РЅРµС†','Р­СЃС‚СЂР°РґРЅС‹Р№ С‚Р°РЅРµС†','Р‘Р°Р»СЊРЅС‹Р№ С‚Р°РЅРµС†']),
  ('instrument','РРЅСЃС‚СЂСѓРјРµРЅС‚Р°Р»СЊРЅРѕРµ РёСЃРєСѓСЃСЃС‚РІРѕ','РЎРѕР»СЊРЅРѕРµ Рё Р°РЅСЃР°РјР±Р»РµРІРѕРµ РёСЃРїРѕР»РЅРёС‚РµР»СЊСЃС‚РІРѕ',3, ARRAY['РґРѕ 9 Р»РµС‚','10вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','19вЂ“25 Р»РµС‚','СЃРјРµС€Р°РЅРЅР°СЏ'], ARRAY['Р¤РѕСЂС‚РµРїРёР°РЅРѕ','РЎС‚СЂСѓРЅРЅС‹Рµ','Р”СѓС…РѕРІС‹Рµ','РЈРґР°СЂРЅС‹Рµ','РќР°СЂРѕРґРЅС‹Рµ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹','РђРЅСЃР°РјР±Р»СЊ','РћСЂРєРµСЃС‚СЂ']),
  ('teatr','РўРµР°С‚СЂР°Р»СЊРЅРѕРµ РёСЃРєСѓСЃСЃС‚РІРѕ','РўРµР°С‚СЂР°Р»СЊРЅС‹Рµ РєРѕР»Р»РµРєС‚РёРІС‹ Рё РјРѕРЅРѕСЃРїРµРєС‚Р°РєР»Рё',4, ARRAY['7вЂ“9 Р»РµС‚','10вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','19вЂ“25 Р»РµС‚'], ARRAY['Р”СЂР°РјР°С‚РёС‡РµСЃРєРёР№ СЃРїРµРєС‚Р°РєР»СЊ','РњСѓР·С‹РєР°Р»СЊРЅС‹Р№ С‚РµР°С‚СЂ','РљСѓРєРѕР»СЊРЅС‹Р№ С‚РµР°С‚СЂ']),
  ('izo','РР·РѕР±СЂР°Р·РёС‚РµР»СЊРЅРѕРµ РёСЃРєСѓСЃСЃС‚РІРѕ','Р–РёРІРѕРїРёСЃСЊ, РіСЂР°С„РёРєР°, СЃРєСѓР»СЊРїС‚СѓСЂР°',5, ARRAY['РґРѕ 6 Р»РµС‚','7вЂ“9 Р»РµС‚','10вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','19вЂ“25 Р»РµС‚'], ARRAY['Р–РёРІРѕРїРёСЃСЊ','Р“СЂР°С„РёРєР°','РЎРєСѓР»СЊРїС‚СѓСЂР°','Р”РџР','РќР°СЂРѕРґРЅС‹Рµ РїСЂРѕРјС‹СЃР»С‹']),
  ('design','Р”РёР·Р°Р№РЅ Рё РјРѕРґР°','Р”РёР·Р°Р№РЅ РєРѕСЃС‚СЋРјР°, РіСЂР°С„РёС‡РµСЃРєРёР№ РґРёР·Р°Р№РЅ',6, ARRAY['10вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','19вЂ“25 Р»РµС‚'], ARRAY['РђРІС‚РѕСЂСЃРєР°СЏ РєРѕР»Р»РµРєС†РёСЏ','РљРѕСЃС‚СЋРј','РђРєСЃРµСЃСЃСѓР°СЂС‹','Р­СЃРєРёР·']),
  ('photo','Р¤РѕС‚Рѕ Рё РІРёРґРµРѕ','Р¤РѕС‚РѕРіСЂР°С„РёСЏ, РІРёРґРµРѕР°СЂС‚, РєРѕСЂРѕС‚РєРѕРјРµС‚СЂР°Р¶РєРё',7, ARRAY['10вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','19вЂ“25 Р»РµС‚'], ARRAY['РҐСѓРґРѕР¶РµСЃС‚РІРµРЅРЅР°СЏ С„РѕС‚РѕРіСЂР°С„РёСЏ','Р РµРїРѕСЂС‚Р°Р¶','РџРѕСЂС‚СЂРµС‚','Р’РёРґРµРѕСЂРѕР»РёРє']),
  ('zhanr','РћСЂРёРіРёРЅР°Р»СЊРЅС‹Р№ Р¶Р°РЅСЂ','Р¦РёСЂРєРѕРІРѕРµ РёСЃРєСѓСЃСЃС‚РІРѕ, РёР»Р»СЋР·РёРѕРЅ, СЌСЃС‚СЂР°РґР°',8, ARRAY['7вЂ“9 Р»РµС‚','10вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','19вЂ“25 Р»РµС‚'], ARRAY['Р¦РёСЂРє','Р­РєРІРёР»РёР±СЂ','РџР»Р°СЃС‚РёРєР°','Р–РѕРЅРіР»РёСЂРѕРІР°РЅРёРµ','РР»Р»СЋР·РёСЏ','РџР°РЅС‚РѕРјРёРјР°']),
  ('slovo','РҐСѓРґРѕР¶РµСЃС‚РІРµРЅРЅРѕРµ СЃР»РѕРІРѕ','РџРѕСЌР·РёСЏ, РїСЂРѕР·Р°, Р°РІС‚РѕСЂСЃРєРѕРµ С‡С‚РµРЅРёРµ',9, ARRAY['7вЂ“9 Р»РµС‚','10вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','19вЂ“25 Р»РµС‚'], ARRAY['РџРѕСЌР·РёСЏ','РџСЂРѕР·Р°','РђРІС‚РѕСЂСЃРєРѕРµ РїСЂРѕРёР·РІРµРґРµРЅРёРµ','РЎРєР°Р·']),
  ('pedagog','РљРѕРЅРєСѓСЂСЃ РїРµРґР°РіРѕРіРѕРІ Рё СЂСѓРєРѕРІРѕРґРёС‚РµР»РµР№','РњРµС‚РѕРґРёС‡РµСЃРєРёРµ СЂР°Р±РѕС‚С‹, РјР°СЃС‚РµСЂ-РєР»Р°СЃСЃС‹',10, ARRAY['РїРµРґР°РіРѕРіРё','СЂСѓРєРѕРІРѕРґРёС‚РµР»Рё РєРѕР»Р»РµРєС‚РёРІРѕРІ'], ARRAY['РњРµС‚РѕРґРёС‡РµСЃРєР°СЏ СЂР°Р·СЂР°Р±РѕС‚РєР°','РћС‚РєСЂС‹С‚С‹Р№ СѓСЂРѕРє','РђРІС‚РѕСЂСЃРєР°СЏ РїСЂРѕРіСЂР°РјРјР°'])
on conflict (slug) do nothing;

create or replace function public.grant_first_user_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;

drop trigger if exists on_auth_first_admin on auth.users;
create trigger on_auth_first_admin after insert on auth.users
  for each row execute function public.grant_first_user_admin();
-- РћР±РЅРѕРІР»РµРЅРёРµ РєРѕРЅРєСѓСЂСЃРѕРІ СЃС‚СЂРѕРіРѕ РїРѕ РџРѕР»РѕР¶РµРЅРёСЋ РЁРџ-2026 (6 РєРѕРЅРєСѓСЂСЃРѕРІ)

-- РЈРґР°Р»СЏРµРј РєРѕРЅРєСѓСЂСЃС‹, РєРѕС‚РѕСЂС‹С… РЅРµС‚ РІ РїРѕР»РѕР¶РµРЅРёРё
DELETE FROM public.competitions
WHERE slug IN ('izo', 'design', 'photo', 'zhanr', 'slovo', 'pedagog', 'teatr');

-- РљРѕРЅРєСѓСЂСЃ С‚РµР°С‚СЂРѕРІ РјРѕРґС‹
INSERT INTO public.competitions (slug, name, short_description, description, display_order, age_categories, nominations)
VALUES (
  'teatry-mody',
  'РљРѕРЅРєСѓСЂСЃ С‚РµР°С‚СЂРѕРІ РјРѕРґС‹',
  'РўРµР°С‚СЂР°Р»РёР·РѕРІР°РЅРЅС‹Р№ РїРѕРєР°Р· РєРѕР»Р»РµРєС†РёРё РјРѕРґРµР»РµР№ РєРѕСЃС‚СЋРјР° РЅР° РѕСЃРЅРѕРІРµ РµРґРёРЅРѕРіРѕ С…СѓРґРѕР¶РµСЃС‚РІРµРЅРЅРѕРіРѕ Р·Р°РјС‹СЃР»Р°',
  'РўРµР°С‚СЂ РєРѕСЃС‚СЋРјР° Рё РјРѕРґС‹ вЂ” СЃРёРЅС‚РµР· СЂРµР¶РёСЃСЃСѓСЂС‹, РїРѕРєР°Р·Р° (РґРµС„РёР»Рµ), РјСѓР·С‹РєРё, СЃС†РµРЅРѕРіСЂР°С„РёРё Рё С…РѕСЂРµРѕРіСЂР°С„РёРё. РњР°РєСЃРёРјР°Р»СЊРЅРѕРµ РІСЂРµРјСЏ РїСЂРµР·РµРЅС‚Р°С†РёРё РѕРґРЅРѕР№ РєРѕР»Р»РµРєС†РёРё вЂ” РЅРµ Р±РѕР»РµРµ 5 РјРёРЅСѓС‚.',
  1,
  ARRAY['4вЂ“7 Р»РµС‚','8вЂ“10 Р»РµС‚','11вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','РЎРјРµС€Р°РЅРЅР°СЏ РіСЂСѓРїРїР°'],
  ARRAY['Р­СЃРєРёР·РЅС‹Р№ РїСЂРѕРµРєС‚ РєРѕРЅРєСѓСЂСЃРЅРѕР№ РєРѕР»Р»РµРєС†РёРё (РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)','В«РљostСЋРј вЂ” С…СѓРґРѕР¶РµСЃС‚РІРµРЅРЅР°СЏ РёРґРµСЏВ»','В«Рџret-a-porterВ»','В«РўСЂР°РґРёС†РёРё Рё СЃРѕРІСЂРµРјРµРЅРЅРѕСЃС‚СЊВ»']
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  age_categories = EXCLUDED.age_categories,
  nominations = EXCLUDED.nominations,
  accepting_applications = true;

-- РљРѕРЅРєСѓСЂСЃ В«Р®РЅС‹Р№ РјРѕРґРµР»СЊРµСЂВ»
INSERT INTO public.competitions (slug, name, short_description, description, display_order, age_categories, nominations)
VALUES (
  'yunyy-modeler',
  'РљРѕРЅРєСѓСЂСЃ В«Р®РЅС‹Р№ РјРѕРґРµР»СЊРµСЂВ»',
  'РўРµРјР° РєРѕРЅРєСѓСЂСЃР° В«Р­РєРѕР»РѕРіРёСЏВ» вЂ” РѕСЃРјС‹СЃР»РµРЅРёРµ РїСЂРѕР±Р»РµРј РѕРєСЂСѓР¶Р°СЋС‰РµР№ СЃСЂРµРґС‹ С‡РµСЂРµР· РґРёР·Р°Р№РЅ РѕРґРµР¶РґС‹ Рё Р°РєСЃРµСЃСЃСѓР°СЂРѕРІ',
  '1 СЌС‚Р°Рї вЂ” РїСЂРµРґСЃС‚Р°РІР»РµРЅРёРµ СЌСЃРєРёР·РѕРІ (5вЂ“7 РјРѕРґРµР»РµР№), 2 СЌС‚Р°Рї вЂ” РґРµРјРѕРЅСЃС‚СЂР°С†РёСЏ РіРѕС‚РѕРІРѕРіРѕ РёР·РґРµР»РёСЏ (РґРѕ 3 РјРёРЅСѓС‚).',
  2,
  ARRAY['7вЂ“9 Р»РµС‚','10вЂ“12 Р»РµС‚','13вЂ“15 Р»РµС‚','16вЂ“18 Р»РµС‚','РћР±СѓС‡Р°СЋС‰РёРµСЃСЏ РєРѕР»Р»РµРґР¶РµР№','РЎС‚СѓРґРµРЅС‚С‹ Р’РЈР—'],
  ARRAY['В«Р­СЃРєРёР·РЅС‹Р№ РїСЂРѕРµРєС‚В» вЂ” В«Рџret-a-porterВ»','В«Р­СЃРєРёР·РЅС‹Р№ РїСЂРѕРµРєС‚В» вЂ” В«РҐСѓРґРѕР¶РµСЃС‚РІРµРЅРЅС‹Р№ РѕР±СЂР°Р· Рё РїРµСЂС„РѕСЂРјР°РЅСЃВ»','В«РћС‚ СЌСЃРєРёР·Р° РґРѕ РјРѕРґРµР»РёВ» вЂ” В«Рџret-a-porterВ»','В«РћС‚ СЌСЃРєРёР·Р° РґРѕ РјРѕРґРµР»РёВ» вЂ” В«РҐСѓРґРѕР¶РµСЃС‚РІРµРЅРЅС‹Р№ РѕР±СЂР°Р· Рё РїРµСЂС„РѕСЂРјР°РЅСЃВ»','РЈС‡Р°СЃС‚РёРµ РІ РєР°С‡РµСЃС‚РІРµ РјРѕРґРµР»Рё']
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  age_categories = EXCLUDED.age_categories,
  nominations = EXCLUDED.nominations,
  accepting_applications = true;

-- РљРѕРЅРєСѓСЂСЃ С‚РµР°С‚СЂР°Р»СЊРЅС‹С… РєРѕР»Р»РµРєС‚РёРІРѕРІ
INSERT INTO public.competitions (slug, name, short_description, description, display_order, age_categories, nominations)
VALUES (
  'teatralnye-kollektivy',
  'РљРѕРЅРєСѓСЂСЃ С‚РµР°С‚СЂР°Р»СЊРЅС‹С… РєРѕР»Р»РµРєС‚РёРІРѕРІ',
  'РҐСѓРґРѕР¶РµСЃС‚РІРµРЅРЅРѕРµ СЃР»РѕРІРѕ, РјСѓР·С‹РєР°Р»СЊРЅС‹Рµ Рё РґСЂР°РјР°С‚РёС‡РµСЃРєРёРµ С‚РµР°С‚СЂС‹, С‚РµР°С‚СЂ РєСѓРєРѕР», РїР»Р°СЃС‚РёРєР°, С‚РµР°С‚СЂ РёРіСЂС‹',
  'РљРѕРјРїРѕР·РёС†РёРѕРЅРЅРѕ Р·Р°РєРѕРЅС‡РµРЅРЅС‹Р№ С„СЂР°РіРјРµРЅС‚ РїСЂРѕРґРѕР»Р¶РёС‚РµР»СЊРЅРѕСЃС‚СЊСЋ 15, 30 РёР»Рё 45 РјРёРЅСѓС‚ СЃС†РµРЅРёС‡РµСЃРєРѕРіРѕ РІСЂРµРјРµРЅРё.',
  3,
  ARRAY['I вЂ” 5вЂ“7 Р»РµС‚','II вЂ” 8вЂ“10 Р»РµС‚','III вЂ” 11вЂ“14 Р»РµС‚','IV вЂ” 15вЂ“18 Р»РµС‚','V вЂ” 19 Р»РµС‚ Рё СЃС‚Р°СЂС€Рµ'],
  ARRAY['В«РњСѓР·С‹РєР°Р»СЊРЅС‹Рµ С‚РµР°С‚СЂС‹В»','В«РўРµР°С‚СЂ РєСѓРєРѕР»В»','В«РҐСѓРґРѕР¶РµСЃС‚РІРµРЅРЅРѕРµ СЃР»РѕРІРѕВ»','В«РџР»Р°СЃС‚РёРєР° Рё РїР°РЅС‚РѕРјРёРјР°В»','В«РўРµР°С‚СЂ РёРіСЂС‹В»','В«РўРµР°С‚СЂ РґСЂР°РјС‹В»','В«Р’РµРґСѓС‰РёР№ РёРіСЂРѕРІС‹С… Рё С€РѕСѓ-РїСЂРѕРіСЂР°РјРјВ»']
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  age_categories = EXCLUDED.age_categories,
  nominations = EXCLUDED.nominations,
  accepting_applications = true;

-- РљРѕРЅРєСѓСЂСЃ СЃРѕР»РёСЃС‚РѕРІ Рё РІРѕРєР°Р»СЊРЅС‹С… РєРѕР»Р»РµРєС‚РёРІРѕРІ
UPDATE public.competitions SET
  name = 'РљРѕРЅРєСѓСЂСЃ СЃРѕР»РёСЃС‚РѕРІ Рё РІРѕРєР°Р»СЊРЅС‹С… РєРѕР»Р»РµРєС‚РёРІРѕРІ',
  short_description = 'РђРєР°РґРµРјРёС‡РµСЃРєРѕРµ, РЅР°СЂРѕРґРЅРѕРµ Рё СЌСЃС‚СЂР°РґРЅРѕРµ РїРµРЅРёРµ вЂ” СЃРѕР»РёСЃС‚С‹, РјР°Р»С‹Рµ С„РѕСЂРјС‹, Р°РЅСЃР°РјР±Р»Рё, С…РѕСЂС‹',
  description = 'РќРѕРјРёРЅР°С†РёСЏ В«РџРµСЂРІС‹Рµ С€Р°РіРёВ» вЂ” РґР»СЏ РѕР±СѓС‡Р°СЋС‰РёС…СЃСЏ 1вЂ“2 РіРѕРґРѕРІ РѕР±СѓС‡РµРЅРёСЏ. РҐСЂРѕРЅРѕРјРµС‚СЂР°Р¶ вЂ” РЅРµ Р±РѕР»РµРµ 4 РјРёРЅСѓС‚.',
  display_order = 4,
  age_categories = ARRAY['4вЂ“6 Р»РµС‚ (РґРѕС€РєРѕР»СЊРЅР°СЏ)','7вЂ“8 Р»РµС‚ (I РјР»Р°РґС€Р°СЏ)','9вЂ“10 Р»РµС‚ (II РјР»Р°РґС€Р°СЏ)','11вЂ“13 Р»РµС‚ (СЃСЂРµРґРЅСЏСЏ)','14вЂ“16 Р»РµС‚ (I СЃС‚Р°СЂС€Р°СЏ)','17вЂ“21 РіРѕРґ (II СЃС‚Р°СЂС€Р°СЏ)','22 РіРѕРґР° Рё Р±РѕР»РµРµ','В«РџСЂРѕС„РёВ»'],
  nominations = ARRAY['В«РџРµСЂРІС‹Рµ С€Р°РіРёВ» вЂ” Р°РєР°РґРµРјРёС‡РµСЃРєРѕРµ РїРµРЅРёРµ','В«РџРµСЂРІС‹Рµ С€Р°РіРёВ» вЂ” РЅР°СЂРѕРґРЅРѕРµ РїРµРЅРёРµ','В«РџРµСЂРІС‹Рµ С€Р°РіРёВ» вЂ” СЌСЃС‚СЂР°РґРЅРѕРµ РїРµРЅРёРµ','РћСЃРЅРѕРІРЅР°СЏ вЂ” Р°РєР°РґРµРјРёС‡РµСЃРєРѕРµ РїРµРЅРёРµ','РћСЃРЅРѕРІРЅР°СЏ вЂ” РЅР°СЂРѕРґРЅРѕРµ РїРµРЅРёРµ','РћСЃРЅРѕРІРЅР°СЏ вЂ” СЌСЃС‚СЂР°РґРЅРѕРµ РїРµРЅРёРµ'],
  accepting_applications = true
WHERE slug = 'vokal';

-- РљРѕРЅРєСѓСЂСЃ В«РҐРѕСЂРµРѕРіСЂР°С„РёСЏВ»
UPDATE public.competitions SET
  name = 'РљРѕРЅРєСѓСЂСЃ В«РҐРѕСЂРµРѕРіСЂР°С„РёСЏВ»',
  short_description = 'РЎРѕР»Рѕ, РґСѓСЌС‚С‹ Рё Р°РЅСЃР°РјР±Р»Рё вЂ” РІСЃРµ РЅР°РїСЂР°РІР»РµРЅРёСЏ С‚Р°РЅС†РµРІР°Р»СЊРЅРѕРіРѕ РёСЃРєСѓСЃСЃС‚РІР°',
  description = 'РќР° РєР°Р¶РґС‹Р№ РєРѕРЅРєСѓСЂСЃРЅС‹Р№ РЅРѕРјРµСЂ Р·Р°РїРѕР»РЅСЏРµС‚СЃСЏ РѕС‚РґРµР»СЊРЅР°СЏ Р·Р°СЏРІРєР°. РџСЂРѕРіСЂР°РјРјР° вЂ” 1 С‚Р°РЅС†РµРІР°Р»СЊРЅС‹Р№ РЅРѕРјРµСЂ, РЅРµ Р±РѕР»РµРµ 4 РјРёРЅСѓС‚.',
  display_order = 5,
  age_categories = ARRAY['4вЂ“5 Р»РµС‚','5вЂ“6 Р»РµС‚','6вЂ“7 Р»РµС‚','7вЂ“8 Р»РµС‚','9вЂ“11 Р»РµС‚','12вЂ“14 Р»РµС‚','14вЂ“18 Р»РµС‚','19вЂ“25 Р»РµС‚','26 Р»РµС‚ Рё СЃС‚Р°СЂС€Рµ','РЎРјРµС€Р°РЅРЅС‹Р№ РІРѕР·СЂР°СЃС‚'],
  nominations = ARRAY['Р”РµС‚СЃРєРёР№ С‚Р°РЅРµС†','РЎРѕРІСЂРµРјРµРЅРЅС‹Р№ С‚Р°РЅРµС† (РґР¶azz, РјРѕРґРµСЂРЅ, РєРѕРЅС‚РµРјРїРѕСЂР°СЂРё)','РљР»Р°СЃСЃРёС‡РµСЃРєРёР№ С‚Р°РЅРµС†','Р­СЃС‚СЂР°РґРЅС‹Р№ С‚Р°РЅРµС†','РќР°СЂРѕРґРЅС‹Р№ С‚Р°РЅРµС†','РќР°СЂРѕРґРЅС‹Р№ вЂ” СЃС‚РёР»РёР·РѕРІР°РЅРЅС‹Р№ С‚Р°РЅРµС†','Р­С‚РЅРѕ/С„РѕР»Рє С‚Р°РЅРµС†','РЈР»РёС‡РЅС‹Р№ С‚Р°РЅРµС† (dancehall, hip-hop, break dance, house Рё РґСЂ.)','Р­СЃС‚СЂР°РґРЅРѕ-СЃРїРѕСЂС‚РёРІРЅС‹Р№ С‚Р°РЅРµС†','РўРµР°С‚СЂ С‚Р°РЅС†Р°','РўР°РЅС†РµРІР°Р»СЊРЅРѕРµ С€РѕСѓ'],
  accepting_applications = true
WHERE slug = 'horeograph';

-- РљРѕРЅРєСѓСЂСЃ В«РРЅСЃС‚СЂСѓРјРµРЅС‚Р°Р»СЊРЅРѕРµ РёСЃРїРѕР»РЅРёС‚РµР»СЊСЃС‚РІРѕВ»
UPDATE public.competitions SET
  name = 'РљРѕРЅРєСѓСЂСЃ В«РРЅСЃС‚СЂСѓРјРµРЅС‚Р°Р»СЊРЅРѕРµ РёСЃРїРѕР»РЅРёС‚РµР»СЊСЃС‚РІРѕВ»',
  short_description = 'РЎРѕР»РёСЃС‚С‹ Рё Р°РЅСЃР°РјР±Р»Рё вЂ” Р°РєР°РґРµРјРёС‡РµСЃРєРѕРµ, РЅР°СЂРѕРґРЅРѕРµ Рё РїРѕРїСѓР»СЏСЂРЅРѕРµ РЅР°РїСЂР°РІР»РµРЅРёСЏ',
  description = 'РџСЂРѕРіСЂР°РјРјР° РёР· 1 РїСЂРѕРёР·РІРµРґРµРЅРёСЏ, С…СЂРѕРЅРѕРјРµС‚СЂР°Р¶ РЅРµ Р±РѕР»РµРµ 5 РјРёРЅСѓС‚. РџСЂРё РїРѕРґР°С‡Рµ Р·Р°СЏРІРєРё РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ СѓРєР°Р·Р°С‚СЊ РёРЅСЃС‚СЂСѓРјРµРЅС‚.',
  display_order = 6,
  age_categories = ARRAY['4вЂ“6 Р»РµС‚','7вЂ“8 Р»РµС‚','9вЂ“10 Р»РµС‚','11вЂ“13 Р»РµС‚','14вЂ“16 Р»РµС‚','17вЂ“19 Р»РµС‚','20вЂ“25 Р»РµС‚','26 Р»РµС‚ Рё СЃС‚Р°СЂС€Рµ','В«РџСЂРѕС„РёВ»','В«РњР°СЃС‚РµСЂ Рё СѓС‡РµРЅРёРєВ»','В«РЎРјРµС€Р°РЅРЅР°СЏ РіСЂСѓРїРїР°В»'],
  nominations = ARRAY['РћСЃРЅРѕРІРЅР°СЏ вЂ” СЃРїРµС†РёР°Р»СЊРЅРѕРµ С„РѕСЂС‚РµРїРёР°РЅРѕ','РћСЃРЅРѕРІРЅР°СЏ вЂ” РѕР±С‰РµРµ С„РѕСЂС‚РµРїРёР°РЅРѕ','РћСЃРЅРѕРІРЅР°СЏ вЂ” СЃС‚СЂСѓРЅРЅС‹Рµ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹','РћСЃРЅРѕРІРЅР°СЏ вЂ” РЅР°СЂРѕРґРЅС‹Рµ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹','РћСЃРЅРѕРІРЅР°СЏ вЂ” РґСѓС…РѕРІС‹Рµ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹','РћСЃРЅРѕРІРЅР°СЏ вЂ” С„РѕСЂС‚РµРїРёР°РЅРЅС‹Р№ Р°РЅСЃР°РјР±Р»СЊ','РћСЃРЅРѕРІРЅР°СЏ вЂ” Р°РєРєРѕРјРїР°РЅРёР°С‚РѕСЂ','В«РџРµСЂРІС‹Рµ С€Р°РіРёВ» вЂ” СЃРїРµС†РёР°Р»СЊРЅРѕРµ С„РѕСЂС‚РµРїРёР°РЅРѕ','В«РџРµСЂРІС‹Рµ С€Р°РіРёВ» вЂ” РѕР±С‰РµРµ С„РѕСЂС‚РµРїРёР°РЅРѕ','В«РџРµСЂРІС‹Рµ С€Р°РіРёВ» вЂ” СЃС‚СЂСѓРЅРЅС‹Рµ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹','В«РџРµСЂРІС‹Рµ С€Р°РіРёВ» вЂ” РЅР°СЂРѕРґРЅС‹Рµ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹','В«РџРµСЂРІС‹Рµ С€Р°РіРёВ» вЂ” РґСѓС…РѕРІС‹Рµ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹','В«РџРµСЂРІС‹Рµ С€Р°РіРёВ» вЂ” С„РѕСЂС‚РµРїРёР°РЅРЅС‹Р№ Р°РЅСЃР°РјР±Р»СЊ'],
  accepting_applications = true
WHERE slug = 'instrument';

-- РўРѕР»СЊРєРѕ Р°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»Рё РјРѕРіСѓС‚ РїРѕРґР°РІР°С‚СЊ Р·Р°СЏРІРєРё
DROP POLICY IF EXISTS "anyone can insert applications" ON public.applications;
CREATE POLICY "authenticated users insert own applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
