# Ítaca Finanzas

App móvil (PWA) para que Tere separe las finanzas de Ítaca (joyas tejidas) de las personales.
Especificación completa: `PLAN_Itaca_Finanzas.md`. Diseño aprobado: `render/` (PNG + HTML, 390×844).

## Comandos
- `npm run dev` — servidor local (requiere `.env.local`, ver `.env.example`)
- `npm test` — Vitest (parser BICE, normalización, reglas)
- `npm run build` — typecheck + build a `dist/`
- Deploy: push a `main` → GitHub Actions → Pages (`https://jballasm.github.io/itaca-finanzas/`)

## Stack
Vite + React + TS · Tailwind v4 (tokens en `src/index.css`) · Supabase (Auth + Postgres + RLS) · SheetJS (CDN 0.20.3, no la 0.18 de npm) · HashRouter · Auth con PKCE.

## Estructura
- `src/import/` — lógica pura de cartolas: `bice.ts` (Excel: detección/parseo), `bicePdf.ts` (PDF «Estado de cuenta», valida contra el RESUMEN de cada estado), `pdfTexto.ts` (texto con posiciones; pdf.js se inyecta), `claves.ts`, `normalizar.ts`, `huella.ts`, `reglas.ts`; `importar.ts` lee Excel/PDF, filtra desde una fecha y guarda en Supabase. `pdfNavegador.ts` carga pdf.js legacy + worker solo al subir un PDF.
- PDF soportado: «Estado de cuenta» BICE (Cuenta Vista/Corriente). La cartola impresa desde la web («Movimientos de la Cuenta») se rechaza con un mensaje.
- `src/pages/`, `src/components/` — UI. `Icon.tsx` usa los paths SVG del render.
- `supabase/migrations/` — SQL que se pega a mano en el SQL Editor (no hay MCP). `seed_usuario(uid)` siembra categorías y catálogo.
- `tests/` — fixtures generados en memoria (`tests/fixtures.ts`), nunca archivos .xlsx.

## Reglas (obligatorias)
- **Nunca** subir cartolas reales ni datos personales (nombres, RUT, números de cuenta). El repo es **público**. `.gitignore` bloquea `*.xlsx`, `*.xls`, `*.csv`, `*.pdf`, `privado/` y `.env*`. Las cartolas reales para probar van en `privado/`.
- Pruebas solo con **datos inventados**.
- La clave `anon` de Supabase puede ir en el frontend; la `service_role` **nunca**.
- RLS activo en **todas** las tablas antes de cargar datos reales.
- Todo en español de Chile; moneda CLP sin decimales (`formatCLP`).
- Mobile-first: probar en 375px de ancho.
- Mantener tests del parser (ambos formatos BICE) y de la normalización de claves.

## Diseño (el render prevalece sobre §8 del plan)
- Tokens: `tinta-2 #6B5F51`, `oliva #5E6C2A`; extras `alerta-suave`, `alerta-texto`, `oliva-suave`, `oliva-fondo`.
- Pantalla: padding 28/20px, gap 16px. Tarjetas radio 16px borde `linea`. Botón primario `tinta` 54px radio 12px, mayúsculas tracking .12em. Etiquetas 11px tracking .24em. Título Cormorant 30px/600; cifra hero Cormorant 50px.
- Nav inferior 84px, 5 columnas, botón + circular 54px elevado.

## Motor de reglas (decisión tomada del render)
Regla confiable (≥2 confirmaciones y confianza ≥0,8): `no_itaca` → `confirmado` (no va a Revisar); `itaca` → `sugerido`. Pagos de TC (Abonos) → `no_itaca` confirmado siempre.
