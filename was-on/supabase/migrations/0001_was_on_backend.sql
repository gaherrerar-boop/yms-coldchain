-- Backend de WAS ON Slotting: usuarios y estado compartido del plano.
-- Reemplaza la persistencia que proveia ChatGPT Sites.

create table if not exists public.was_on_users (
  id                  bigint generated always as identity primary key,
  username            text        not null,
  username_key        text        generated always as (lower(username)) stored,
  password_hash       text        not null,
  role                text        not null default 'viewer',
  password_changed_at timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  constraint was_on_users_role_check check (role in ('admin', 'viewer')),
  constraint was_on_users_username_check check (char_length(username) between 1 and 32)
);

create unique index if not exists was_on_users_username_key_idx
  on public.was_on_users (username_key);

-- Fila unica con el plano compartido; equivale a /api/state.
create table if not exists public.was_on_state (
  id         smallint    primary key default 1,
  state      jsonb,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint was_on_state_singleton check (id = 1)
);

-- Sin politicas: solo la clave secreta (las funciones de Netlify) tiene acceso.
-- Ningun cliente con clave publishable puede leer hashes ni el plano.
alter table public.was_on_users enable row level security;
alter table public.was_on_state enable row level security;
