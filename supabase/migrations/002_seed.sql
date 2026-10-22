-- Ítaca Finanzas · datos iniciales (plan §5)
-- 1) Pegar este archivo en el SQL Editor y ejecutarlo (crea la función).
-- 2) Sembrar a una usuaria:  select public.seed_usuario('<uuid de auth.users>');
--    El uuid sale de Authentication → Users. Se puede ejecutar varias veces.

create or replace function public.seed_usuario(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cat_aros     uuid;
  cat_pulseras uuid;
begin
  if not exists (select 1 from auth.users where id = uid) then
    raise exception 'No existe el usuario %', uid;
  end if;

  insert into public.categorias_gasto (user_id, nombre, orden)
  select uid, nombre, orden
  from (values
    ('Hilos y materiales', 1), ('Herrajes y broches', 2), ('Packaging', 3),
    ('Envíos', 4), ('Publicidad y redes', 5), ('Ferias', 6),
    ('Fotos y contenido', 7), ('Herramientas', 8), ('Comisiones bancarias', 9),
    ('Otros', 10)
  ) as v(nombre, orden)
  on conflict (user_id, nombre) do nothing;

  insert into public.categorias_producto (user_id, nombre, orden, proximamente)
  values
    (uid, 'Aros', 1, false),
    (uid, 'Pulseras', 2, false),
    (uid, 'Collares', 3, true),
    (uid, 'Carteras', 4, true)
  on conflict (user_id, nombre) do nothing;

  select id into cat_aros     from public.categorias_producto where user_id = uid and nombre = 'Aros';
  select id into cat_pulseras from public.categorias_producto where user_id = uid and nombre = 'Pulseras';

  insert into public.productos (user_id, categoria_producto_id, nombre, precio, precio_pack, unidades_pack, edicion)
  values
    (uid, cat_aros,     'Sifnos',   60000, null,  null, 'Edición 01'),
    (uid, cat_aros,     'Paros',    30000, null,  null, 'Edición 01'),
    (uid, cat_aros,     'Náxos',    45000, null,  null, 'Edición 01'),
    (uid, cat_aros,     'Milos',    40000, null,  null, 'Edición 01'),
    (uid, cat_aros,     'Corfú',    30000, null,  null, 'Edición 01'),
    (uid, cat_aros,     'Elia',     35000, null,  null, 'Edición 01'),
    (uid, cat_pulseras, 'Aura',     23990, 40990, 2,    'Edición 01'),
    (uid, cat_pulseras, 'Atenea',   28000, null,  null, 'Edición 01'),
    (uid, cat_pulseras, 'Penélope', 28000, null,  null, 'Edición 01')
  on conflict (user_id, nombre) do nothing;
end $$;

-- Solo se ejecuta desde el SQL Editor (rol postgres), nunca desde la app.
revoke all on function public.seed_usuario(uuid) from public, anon, authenticated;
