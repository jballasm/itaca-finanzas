-- Ítaca Finanzas · esquema (plan §5)
-- Pegar completo en Supabase → SQL Editor → Run. Es idempotente donde se puede.

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table if not exists public.categorias_gasto (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  nombre     text not null,
  orden      int  not null default 0,
  activa     boolean not null default true,
  unique (user_id, nombre)
);

create table if not exists public.categorias_producto (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  nombre       text not null,
  orden        int  not null default 0,
  proximamente boolean not null default false,
  unique (user_id, nombre)
);

create table if not exists public.productos (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users on delete cascade,
  categoria_producto_id uuid not null references public.categorias_producto on delete restrict,
  nombre                text not null,
  precio                int  not null check (precio >= 0),
  precio_pack           int  check (precio_pack >= 0),
  unidades_pack         int  check (unidades_pack >= 2),
  edicion               text,
  activo                boolean not null default true,
  check ((precio_pack is null) = (unidades_pack is null)),
  unique (user_id, nombre)
);

create table if not exists public.importaciones (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  archivo_nombre text not null,
  tipo           text not null check (tipo in ('bice_cuenta', 'bice_tc')),
  periodo_desde  date,
  periodo_hasta  date,
  filas          int not null default 0,
  nuevas         int not null default 0,
  duplicadas     int not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.reglas (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users on delete cascade,
  clave              text not null,
  tipo               text not null check (tipo in ('gasto', 'ingreso')),
  clasificacion      text not null check (clasificacion in ('itaca', 'no_itaca')),
  categoria_gasto_id uuid references public.categorias_gasto on delete set null,
  confirmaciones     int not null default 0 check (confirmaciones >= 0),
  correcciones       int not null default 0 check (correcciones >= 0),
  activa             boolean not null default true,
  updated_at         timestamptz not null default now(),
  unique (user_id, clave, tipo)
);

create table if not exists public.movimientos (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users on delete cascade,
  importacion_id       uuid references public.importaciones on delete set null,
  fecha                date not null,
  tipo                 text not null check (tipo in ('gasto', 'ingreso')),
  monto                int  not null check (monto > 0),
  origen               text not null check (origen in ('bice_cuenta', 'bice_tc', 'manual')),
  medio                text not null check (medio in ('transferencia', 'efectivo', 'debito', 'credito')),
  descripcion_original text not null default '',
  clave                text not null default '',
  cuota                text,
  nro_operacion        text,
  estado               text not null default 'por_revisar'
                         check (estado in ('por_revisar', 'sugerido', 'confirmado')),
  clasificacion        text check (clasificacion in ('itaca', 'no_itaca')),
  categoria_gasto_id   uuid references public.categorias_gasto on delete set null,
  subtipo_ingreso      text check (subtipo_ingreso in ('venta', 'otro')),
  regla_id             uuid references public.reglas on delete set null,
  nota                 text,
  huella               text not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, huella),
  -- Un movimiento confirmado siempre tiene clasificación.
  check (estado <> 'confirmado' or clasificacion is not null)
);

create index if not exists movimientos_user_fecha  on public.movimientos (user_id, fecha desc);
create index if not exists movimientos_user_estado on public.movimientos (user_id, estado);

create table if not exists public.venta_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  movimiento_id   uuid not null references public.movimientos on delete cascade,
  producto_id     uuid not null references public.productos on delete restrict,
  cantidad        int  not null check (cantidad > 0),
  precio_unitario int  not null check (precio_unitario >= 0)
);

create index if not exists venta_items_movimiento on public.venta_items (movimiento_id);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
drop trigger if exists movimientos_updated_at on public.movimientos;
create trigger movimientos_updated_at before update on public.movimientos
  for each row execute function public.set_updated_at();

drop trigger if exists reglas_updated_at on public.reglas;
create trigger reglas_updated_at before update on public.reglas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: cada usuaria solo ve y toca lo suyo.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'categorias_gasto', 'categorias_producto', 'productos', 'importaciones',
    'movimientos', 'venta_items', 'reglas'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "propios" on public.%I', t);
    execute format(
      'create policy "propios" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Keep-alive: la GitHub Action llama a ping() cada 3 días.
-- ---------------------------------------------------------------------------
create or replace function public.ping()
returns timestamptz
language sql
security definer
set search_path = ''
as $$ select now() $$;

revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
