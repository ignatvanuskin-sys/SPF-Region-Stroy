-- ============================================================================
-- СПФ Регион Строй — схема БД (master prompt §11)
--
-- Обычный PostgreSQL без проприетарных расширений: схему можно перенести на
-- любой хостинг (Neon / Supabase / Railway / собственный сервер) или в другую
-- СУБД. Все даты — timestamptz, хранятся в UTC, показываются в Asia/Almaty.
--
-- Применение: npm run db:migrate   (идемпотентно, можно запускать повторно)
-- ============================================================================

create table if not exists leads (
  id                    bigserial primary key,
  submission_id         uuid        not null unique,
  segment               text        not null default 'b2c' check (segment in ('b2c','b2b')),
  name                  text        not null,
  phone                 text        not null,
  phone_normalized      text        not null,
  email                 text,
  product_type          text,
  calc_payload          jsonb,
  district              text,
  comment               text,
  status                text        not null default 'new',
  assignee_id           bigint,
  priority              text        not null default 'normal' check (priority in ('normal','high')),
  source                text        not null default 'direct',
  utm                   jsonb,
  referrer              text,
  landing_path          text,
  request_path          text,
  device                text,
  locale                text        not null default 'ru',
  consent_at            timestamptz,
  consent_text_version  text,
  lost_reason           text,
  review_requested_at   timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  first_response_at     timestamptz
);

create index if not exists leads_phone_normalized_idx on leads (phone_normalized);
create index if not exists leads_status_idx           on leads (status);
create index if not exists leads_created_at_idx       on leads (created_at desc);
create index if not exists leads_assignee_idx         on leads (assignee_id);
create index if not exists leads_source_idx           on leads (source);

create table if not exists lead_events (
  id           bigserial primary key,
  lead_id      bigint      not null references leads(id) on delete cascade,
  type         text        not null,
  actor_id     bigint,
  actor_label  text,
  payload      jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists lead_events_lead_idx on lead_events (lead_id, created_at);

create table if not exists lead_files (
  id            bigserial primary key,
  lead_id       bigint      not null references leads(id) on delete cascade,
  storage_key   text        not null,
  original_name text        not null,
  mime          text        not null,
  size          integer     not null,
  created_at    timestamptz not null default now()
);
create index if not exists lead_files_lead_idx on lead_files (lead_id);

create table if not exists measurements (
  id          bigserial primary key,
  lead_id     bigint      not null references leads(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  district    text,
  street      text,
  house       text,
  flat        text,
  status      text        not null default 'pending'
              check (status in ('pending','confirmed','done','canceled','rescheduled')),
  assignee_id bigint,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists measurements_starts_at_idx on measurements (starts_at);
create index if not exists measurements_lead_idx      on measurements (lead_id);

create table if not exists measurement_rules (
  id                integer primary key default 1 check (id = 1),
  weekdays          integer[] not null default '{1,2,3,4,5}',
  day_start_minutes integer   not null default 540,
  day_end_minutes   integer   not null default 1140,
  slot_minutes      integer   not null default 60,
  capacity_per_slot integer   not null default 2,
  min_lead_hours    integer   not null default 12,
  horizon_days      integer   not null default 14,
  timezone          text      not null default 'Asia/Almaty'
);

create table if not exists blackout_dates (
  date date primary key
);

create table if not exists gallery_items (
  id                  bigserial primary key,
  title               text      not null,
  category            text      not null,
  storage_key         text      not null,
  width               integer,
  height              integer,
  district            text,
  before_after_pair_id bigint,
  sort                integer   not null default 0,
  featured            boolean   not null default false,
  published           boolean   not null default false,
  created_at          timestamptz not null default now()
);

create table if not exists reviews_curated (
  id               bigserial primary key,
  author_label     text      not null,
  text             text      not null,
  source_url       text      not null,
  consent_obtained boolean   not null default false,
  published        boolean   not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists claims (
  key             text primary key,
  text_ru         text not null default '',
  status          text not null default 'unconfirmed' check (status in ('confirmed','unconfirmed')),
  source          text not null default 'none' check (source in ('2gis','owner','none')),
  note_for_owner  text,
  confirmed_at    timestamptz,
  confirmed_by    bigint
);

create table if not exists staff (
  id          bigserial primary key,
  telegram_id text      not null unique,
  name        text      not null,
  role        text      not null default 'manager' check (role in ('owner','manager','measurer')),
  active      boolean   not null default true,
  invite_code text unique,
  created_at  timestamptz not null default now()
);

create table if not exists users (
  id                   bigserial primary key,
  email                text      not null unique,
  password_hash        text      not null,
  role                 text      not null default 'manager' check (role in ('owner','manager','viewer')),
  name                 text      not null default '',
  must_change_password boolean   not null default false,
  last_login_at        timestamptz,
  created_at           timestamptz not null default now()
);

create table if not exists notifications (
  id              bigserial primary key,
  channel         text      not null check (channel in ('telegram','email','webhook')),
  target          text      not null,
  payload         jsonb     not null,
  status          text      not null default 'pending' check (status in ('pending','sent','failed')),
  attempts        integer   not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error      text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);
create index if not exists notifications_pending_idx on notifications (status, next_attempt_at);

create table if not exists settings (
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Клики и события аналитики. Персональных данных здесь нет по замыслу.
create table if not exists events (
  id         bigserial primary key,
  name       text not null,
  session_id text,
  path       text,
  props      jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_name_created_idx on events (name, created_at desc);
