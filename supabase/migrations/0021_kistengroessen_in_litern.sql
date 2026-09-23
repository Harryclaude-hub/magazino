-- =====================================================================
-- Kistly 0021_kistengroessen_in_litern
--
-- Die Groesse 1 bis 10 gab es seit 0001, aber nur als Wort (winzig bis
-- sperrig). Jetzt bekommt jede Stufe Liter und typische Masse.
--
-- Eine DIN-, EN- oder ISO-Norm fuer Mass oder Volumen von Umzugskartons
-- gibt es nicht; DIN 55468 regelt nur die Guete der Wellpappe. Genormt
-- sind aber gleichmaessige Abstaende: die Normzahlen nach DIN 323, Reihe
-- R40. Von 15 bis 100 Liter ist jede Stufe etwa 23,5 Prozent groesser
-- als die vorige (Faktor (100/15)^(1/9) = 1,2347, auf R40 gerundet).
--
-- Die Grenze zwischen zwei Stufen ist das geometrische Mittel der beiden
-- Literwerte. Ein Karton mit 58,6 Litern (der klassische 61 x 30 x 32)
-- ist damit Groesse 7, der Profi-Karton mit 62 Litern Groesse 8. So hat
-- Karam es am 23.09.2026 entschieden.
--
-- Liter heisst Inhalt, wie ihn der Hersteller angibt. Die Masse sind
-- AUSSENmasse eines typischen Kartons dieser Stufe aus dem Handel. Sie
-- dienen der Stellflaeche und der Stapelhoehe im Raumplan, nicht dem
-- Nachrechnen der Liter: 40 x 30 x 17 cm sind aussen 20 Liter, innen 15.
--
-- Die Tabelle ist die einzige Fassung dieser Zahlen. Die App liest sie
-- von hier und rechnet nichts davon im Browser nach.
-- =====================================================================

create table if not exists public.kisten_groessen (
  stufe      smallint primary key check (stufe between 1 and 10),
  liter      numeric(5,1) not null check (liter > 0),
  -- Bis hierher (ausschliesslich) zaehlt ein Karton zu dieser Stufe.
  -- Die groesste Stufe hat keine obere Grenze.
  bis_liter  numeric(5,1) check (bis_liter is null or bis_liter > liter),
  laenge_cm  smallint not null check (laenge_cm between 5 and 300),
  breite_cm  smallint not null check (breite_cm between 5 and 300),
  hoehe_cm   smallint not null check (hoehe_cm  between 5 and 300)
);

insert into public.kisten_groessen (stufe, liter, bis_liter, laenge_cm, breite_cm, hoehe_cm) values
  --  Stufe  Liter  bis    L   B   H      Vorbild im Handel
  (  1,  15.0,  16.9, 40, 30, 17),  -- Eurobox 40 x 30 x 17, 15 l
  (  2,  19.0,  20.6, 40, 30, 22),  -- Eurobox 40 x 30 x 22, 20 l
  (  3,  22.4,  25.0, 39, 28, 28),  -- Aufbewahrungsbox 22 l
  (  4,  28.0,  31.5, 40, 30, 32),  -- Eurobox 40 x 30 x 32, 30 l
  (  5,  35.5,  38.8, 44, 33, 31),  -- kleiner Umzugskarton 35 l
  (  6,  42.5,  47.5, 41, 33, 34),  -- Buecherkarton 42 bis 47 l
  (  7,  53.0,  59.6, 63, 29, 33),  -- schmaler Umzugskarton 53 l, klassisch 58,6 l
  (  8,  67.0,  73.2, 60, 33, 34),  -- Profi-Umzugskarton 62 bis 67 l
  (  9,  80.0,  89.4, 66, 36, 40),  -- Speditionskarton 84 l
  ( 10, 100.0,  null, 58, 38, 44)   -- XL-Karton 96 l und groesser
on conflict (stufe) do update set
  liter     = excluded.liter,
  bis_liter = excluded.bis_liter,
  laenge_cm = excluded.laenge_cm,
  breite_cm = excluded.breite_cm,
  hoehe_cm  = excluded.hoehe_cm;

-- Lesen darf jeder, auch ohne Anmeldung: es sind feste Zahlen ohne
-- Bezug zu einer Person oder einem Umzug. Schreiben darf niemand ueber
-- die App; eine andere Reihe braucht eine neue Migration.
alter table public.kisten_groessen enable row level security;

drop policy if exists kisten_groessen_lesen on public.kisten_groessen;
create policy kisten_groessen_lesen on public.kisten_groessen
  for select to anon, authenticated using (true);

revoke insert, update, delete, truncate on public.kisten_groessen from anon, authenticated;
grant select on public.kisten_groessen to anon, authenticated;
