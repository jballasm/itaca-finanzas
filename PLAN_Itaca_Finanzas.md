# Ítaca Finanzas — Plan de construcción

> Documento de partida para **Claude Code**. Ponlo en la raíz del repositorio y pide a Claude Code: *"Lee PLAN_Itaca_Finanzas.md y entra en modo plan antes de escribir código."*

---

## 1. Objetivo

App web (instalable en el celular) para que **Teresita**, dueña de **Ítaca** (joyas tejidas a mano: aros, pulseras; más adelante collares y carteras), separe sus finanzas del emprendimiento de las personales.

- Sube la **cartola de Banco BICE** (Excel).
- La app **sugiere** qué movimientos son de Ítaca y cuáles no, y **aprende** de sus decisiones.
- Lo que "No es de Ítaca" se ignora en todos los resúmenes.
- Registra **ventas en efectivo** y gastos manuales.
- Ve **ganancia neta por mes**, **gastos por categoría** y **ventas por producto / por categoría de producto**.

Usuaria única: Teresita (Tere). Uso principal: **celular**.

---

## 2. Decisiones tomadas (aprobadas por Vicente)

| Tema | Decisión |
|---|---|
| Arquitectura | **Opción B**: app propia. Frontend estático en **GitHub Pages** + **Supabase** (login y base de datos). Sin dominio propio. |
| Login | Email + contraseña (Supabase Auth). Solo existe la cuenta de Tere; **registro público desactivado**. |
| Ingreso de datos | Subir cartola BICE (.xlsx) + registro manual (efectivo). Sin conexión bancaria directa. |
| Clasificación | Cada movimiento: **Ítaca** (con categoría) o **No es de Ítaca** (ignorado). Ella siempre puede editar. |
| Aprendizaje | Reglas por comercio / remitente que se crean al confirmar y se ajustan al corregir. |
| Ventas | Al marcar un ingreso como venta, elige **producto(s) y cantidad**; el monto se precarga con el precio del catálogo. |
| Medios de cobro | Solo **transferencia** y **efectivo**. |
| Cuotas TC | Por ahora las compras de Ítaca se pagan por transferencia. Si llega una cartola de tarjeta, cada cuota cuenta en el mes en que aparece (tal como viene en la cartola). |
| Productos futuros | Collares y Carteras existen como categorías ("Próximamente"); Tere agrega modelos y precios desde la app. |

---

## 3. Stack

- **Vite + React + TypeScript**
- **Tailwind CSS** (con los tokens de la sección 8)
- **Supabase JS** (`@supabase/supabase-js`) — Auth + Postgres
- **SheetJS** (`xlsx`) — leer cartolas en el navegador (los archivos **nunca** se suben a ningún servidor; solo se guardan los movimientos ya parseados)
- **Recharts** — gráficos
- **vite-plugin-pwa** — instalable en pantalla de inicio del celular
- **GitHub Actions** — deploy a GitHub Pages + tarea "keep-alive" de Supabase
- Router: `HashRouter` (GitHub Pages no soporta rutas del lado del servidor)

Costo: **$0** (Supabase plan gratis + GitHub Pages con repo público).

---

## 4. Skills y herramientas para Claude Code

**En Claude Code**
- **Modo plan** (Shift+Tab) al iniciar y antes de cada fase grande.
- **`/init`** para generar `CLAUDE.md`; copiar ahí las reglas de la sección 10.
- **Skill / plugin `frontend-design`** (si lo tienes instalado) para la capa visual. Si no, las reglas de diseño de la sección 8 son suficientes.
- **GitHub CLI (`gh`)** para crear el repo, activar Pages y revisar Actions.
- **Opcional: servidor MCP de Supabase** para que Claude Code cree tablas y políticas directamente. Sin él, Claude Code entrega el SQL y tú lo pegas en el *SQL Editor* de Supabase.

**Usados en el chat de Claude para diseñar (referencia)**
- `xlsx` — análisis del formato de las cartolas BICE.
- `frontend-design`, `artifact-design`, `dataviz` — estética, tokens y reglas de gráficos (ya volcados en este plan).

**Librerías clave**: SheetJS (parseo), Recharts (gráficos), Supabase JS (auth/datos), vite-plugin-pwa.

---

## 5. Modelo de datos (Supabase / Postgres)

Todas las tablas llevan `user_id uuid references auth.users` y **Row Level Security** activa: `user_id = auth.uid()` para select/insert/update/delete.

```
categorias_gasto
  id, user_id, nombre, orden, activa
  Semilla: Hilos y materiales · Herrajes y broches · Packaging · Envíos ·
           Publicidad y redes · Ferias · Fotos y contenido · Herramientas ·
           Comisiones bancarias · Otros

categorias_producto
  id, user_id, nombre, orden, proximamente bool
  Semilla: Aros · Pulseras · Collares (próximamente) · Carteras (próximamente)

productos
  id, user_id, categoria_producto_id, nombre, precio int, 
  precio_pack int null, unidades_pack int null, edicion text, activo bool
  Semilla (Edición 01):
    Aros:     Sifnos 60.000 · Paros 30.000 · Náxos 45.000 · Milos 40.000 ·
              Corfú 30.000 · Elia 35.000
    Pulseras: Aura 23.990 (pack 2 = 40.990) · Atenea 28.000 · Penélope 28.000

importaciones
  id, user_id, archivo_nombre, tipo ('bice_cuenta' | 'bice_tc'),
  periodo_desde, periodo_hasta, filas, nuevas, duplicadas, created_at

movimientos
  id, user_id, importacion_id null,
  fecha date, tipo ('gasto' | 'ingreso'), monto int (CLP, siempre positivo),
  origen ('bice_cuenta' | 'bice_tc' | 'manual'),
  medio ('transferencia' | 'efectivo' | 'debito' | 'credito'),
  descripcion_original text, clave text (comercio/remitente normalizado),
  cuota text null, nro_operacion text null,
  estado ('por_revisar' | 'sugerido' | 'confirmado'),
  clasificacion ('itaca' | 'no_itaca' | null),
  categoria_gasto_id null, subtipo_ingreso ('venta' | 'otro') null,
  regla_id null, nota text null, huella text unique  -- anti-duplicados
  created_at, updated_at

venta_items
  id, user_id, movimiento_id, producto_id, cantidad int, precio_unitario int

reglas
  id, user_id, clave text, tipo ('gasto' | 'ingreso'),
  clasificacion ('itaca' | 'no_itaca'), categoria_gasto_id null,
  confirmaciones int, correcciones int, activa bool, updated_at
  unique (user_id, clave, tipo)
```

Función `ping()` (SQL, `security definer`, devuelve `now()`) para el keep-alive.

---

## 6. Lectura de cartolas BICE

Detectar el formato buscando la **fila de encabezados** (no asumir número de fila fijo).

**Cuenta corriente** (`Cartola_*.xlsx`) — encabezados: `Fecha | Categoría | Nº operación | Descripción | Monto`
- Fecha en texto: `"2 mar 2026"` → parsear meses en español (ene, feb, mar, abr, may, jun, jul, ago, sep, oct, nov, dic).
- Monto en texto: `"$8.170"` → entero 8170.
- `Categoría = Cargos` → gasto (medio débito / transferencia); `Abonos` → ingreso (transferencia).
- Clave desde Descripción:
  - `Cargo por compra en COMERCIO el…` → `COMERCIO`
  - `Transferencia de NOMBRE Rut … desde Banco …` → `NOMBRE` (remitente)
  - `Transferencia a NOMBRE …` → `NOMBRE` (destinatario)
- **No guardar RUT** en `clave`; guardar descripción original solo para que Tere la vea.

**Tarjeta de crédito** (`Movimientos_Nacionales_de_Tarjeta_de_Crédito*.xlsx`) — encabezados: `Fecha | Categoria | Detalle | Cuotas | Monto $`
- Fecha `dd/mm/yyyy`; monto numérico; `Cuotas` tipo `"2 de 3"`.
- `Cargos` → gasto (crédito). `Abonos` (pagos de la tarjeta) → **No es de Ítaca automáticamente**.

**Normalización de clave** (para que las reglas funcionen):
- Mayúsculas, sin tildes, espacios simples.
- Quitar prefijos de pasarela: `MERCADOPAGO`, `MERPAGO`, `MP`, `PAYU`, `PAYSCAN`, `*`.
- Quitar sufijos de comuna/ciudad frecuentes (`LAS CONDES`, `SANTIAGO`, `VITACURA`, `PROVIDENCIA`, …) y textos de tasa (`TASA INT. 0,00%`).
- Ignorar filas sin fecha/monto y pies de página.

**Anti-duplicados**: `huella = hash(origen, fecha, monto, descripcion_original, nro_operacion, cuota)`. Al reimportar, contar duplicados y no insertarlos.

---

## 7. Motor de aprendizaje

1. Al importar, para cada movimiento se busca una regla con la misma `clave` y `tipo`.
2. Confianza = `confirmaciones / (confirmaciones + correcciones)`.
   - Regla con confianza ≥ 0,8 y ≥ 2 confirmaciones → `estado = sugerido` (precargado, se confirma en bloque).
   - Sin regla o confianza baja → `estado = por_revisar`.
3. Cuando Tere confirma un movimiento, se crea la regla o se suma `confirmaciones`.
4. Cuando corrige una sugerencia, se suma `correcciones` y se actualiza la regla a su nueva decisión.
5. Botón **"Confirmar todas las sugerencias"** en la pantalla Revisar.
6. Pantalla de **Reglas aprendidas** en Ajustes: ver, editar o borrar.
7. Las ventas **siempre** piden producto(s) aunque la regla sugiera "Ítaca · Venta" (cada venta es distinta).

---

## 8. Diseño (de la marca Ítaca)

Estética del catálogo "Joyas con historia · Edición 01": papel cálido, serif elegante, mayúsculas espaciadas, mucho aire, tonos tierra.

**Tokens**
```
--papel:      #F4EEE4   fondo
--arena:      #E9DFD0   superficies secundarias
--tarjeta:    #FBF8F3   tarjetas
--tinta:      #3A3127   texto principal
--tinta-2:    #7A6E60   texto secundario
--linea:      #DCD1C0   bordes
--tierra:     #8B6A45   acento / botones primarios
--terracota:  #B0532F   gastos
--oliva:      #6F7F33   ingresos / ganancia positiva
--alerta:     #C08A2B   por revisar
Modo oscuro: --papel #1F1B16, --tarjeta #2A251F, --tinta #F1EADF, mismos acentos aclarados.
```
**Tipografía**: títulos y cifras grandes en **Cormorant Garamond** (600, cifras lineales `font-variant-numeric: lining-nums tabular-nums`); interfaz en **Jost** (400/500). Etiquetas en mayúsculas con `letter-spacing: .18em`.
**Logo**: símbolo infinito en línea fina, con un extremo abierto. Usar el archivo `logo.png` entregado junto a este plan (fondo transparente, trazo #3A3127) → copiarlo a `public/logo.png`. Para el ícono de la app instalable, generar versiones de 192 y 512 px sobre fondo `--papel`. En modo oscuro, mostrarlo con `filter: invert(1)` o como versión clara.
**Componentes**: navegación inferior (Inicio · Revisar · + · Reportes · Catálogo), tarjetas con radio 14px, botones grandes (≥ 44px de alto), moneda `$1.234.567` (formato es-CL, sin decimales).
**Gráficos**: barras simples, sin 3D ni tortas; oliva = ingresos, terracota = gastos; etiquetas directas con monto.

---

## 9. Pantallas

> **Diseño aprobado:** carpeta `render/` (PNG + HTML de cada pantalla). Mirar esas imágenes antes de construir cada pantalla y respetar su diseño.

1. **Ingreso** — logo, email, contraseña, "¿Olvidaste tu contraseña?".
2. **Inicio** — selector de mes; ganancia neta del mes (grande); ingresos y gastos Ítaca; aviso "N movimientos por revisar"; mini gráfico de los últimos 6 meses; últimos movimientos Ítaca.
3. **Subir cartola** — elegir archivo; resumen: tipo detectado, período, nuevos, duplicados, reconocidos automáticamente, por revisar.
4. **Revisar** — lista de movimientos pendientes y sugeridos; cada tarjeta con descripción, fecha, monto y dos botones: **Ítaca** / **No es de Ítaca**; al elegir Ítaca: categoría (gasto) o productos (venta). "Confirmar todas las sugerencias".
5. **Registrar venta** — productos con buscador por categoría, cantidad (+/−), total precargado, campo de ajuste o descuento con nota, medio (transferencia / efectivo).
6. **Agregar manual (+)** — venta en efectivo o gasto manual.
7. **Reportes** — ganancia neta por mes (barras), gastos por categoría, ventas por producto (unidades y $), ventas por categoría de producto; filtro de período.
8. **Catálogo** — productos por categoría con precio; agregar, editar o desactivar; Collares y Carteras como "Próximamente".
9. **Ajustes** — reglas aprendidas, categorías de gasto, cerrar sesión.
10. **Movimientos** — historial con buscador y filtros (Ítaca / No Ítaca / todos); tocar para editar.

---

## 10. Reglas para Claude Code (copiar en CLAUDE.md)

- **Nunca** subir cartolas reales ni datos personales (nombres, RUT, números de cuenta) al repositorio. El repo es **público**. Agregar `*.xlsx`, `*.xls`, `*.csv` y `.env*` a `.gitignore`.
- Usar solo **datos inventados** para pruebas (crear `tests/fixtures/` con cartolas falsas que imiten el formato).
- La clave pública `anon` de Supabase puede ir en el frontend; la `service_role` **nunca**.
- RLS activo en **todas** las tablas antes de cargar datos reales.
- Todo en español de Chile; moneda CLP sin decimales.
- Mobile-first: probar en 375px de ancho.
- Escribir tests del parser de cartolas (ambos formatos BICE) y de la normalización de claves.

---

## 11. Fases

1. **Preparación (Vicente, con guía de Claude Code)**
   - Crear cuenta y proyecto en Supabase.
   - Crear repo público `itaca-finanzas` en GitHub.
   - Guardar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como secretos del repo.
2. **Base** — esqueleto Vite + React + Tailwind + tokens; login con Supabase; navegación; deploy a GitHub Pages funcionando.
3. **Base de datos** — SQL de tablas, RLS, semillas (categorías y catálogo), función `ping()`.
4. **Importar cartolas** — parser BICE (cuenta + TC), normalización, anti-duplicados, pantalla de resumen de importación. Tests con cartolas falsas.
5. **Revisar y aprender** — pantalla Revisar, motor de reglas, confirmación en bloque, edición.
6. **Ventas y manual** — registrar venta con productos, efectivo, gastos manuales.
7. **Resúmenes y reportes** — Inicio y Reportes con gráficos.
8. **Catálogo y ajustes** — CRUD de productos, categorías y reglas.
9. **PWA + keep-alive** — instalable en el celular; GitHub Action con cron cada 3 días que llama a `ping()`.
10. **Entrega a Tere** — crear su usuario en Supabase (Authentication → Add user), desactivar registros públicos, probar con una cartola real **en su celular** (el archivo no sale de su teléfono).

---

## 12. Fuera de alcance (por ahora)

- Conexión bancaria directa (Fintoc u otro) — requiere servidor y contrato.
- Exportar a Excel.
- Inventario / stock y costo por producto (margen).
- Multiusuario.
