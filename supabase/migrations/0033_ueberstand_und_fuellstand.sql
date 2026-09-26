-- =====================================================================
-- Kistly 0033_ueberstand_und_fuellstand
--
-- Zwei Wuensche von Karam:
--
-- A. Ueberstand im Fach. Eine Kiste in einem Regal oder Schrank (Unterlage
--    'fach') darf in der Tiefe vorne oder hinten bis zu 40 cm aus dem
--    Objekt herausragen (ueberstand_max_cm). Ihre Mitte bleibt wie bisher
--    in Spalte und Tiefe. Gerechnet wird ganzzahlig mit dem doppelten
--    Ueberstand (kiste_ueberstand2, halbe cm sind moeglich), gezeigt wird
--    er aufgerundet in ganzen cm (kiste_ueberstand_cm). Mehr als 40 cm:
--    Hinweis 'kistly:grundriss.ueberstand_zu_gross' mit {code, name, cm,
--    max}. Der Ueberstand wird nie gespeichert; grundriss_laden und
--    kiste_lage liefern ihn als ueberstand_cm (0, wenn keiner). Weil die
--    Regel in platz_fehler steht, gilt sie ueberall, wo Plaetze geprueft
--    werden: Kiste setzen, Groesse aendern, Objekt schmaler/flacher
--    machen oder drehen, Zeichner (raum_fehler am Ende).
--    Spiegel im Browser: kisteUeberstand2 und UEBERSTAND_MAX_CM in
--    src/lib/geometrie.ts; Aenderungen immer an beiden Stellen.
--
-- B. Fuellstand. items.fuellstand in Prozent, 0 = leer, 100 = voll,
--    null = nicht angegeben. Gilt fuer alle Eintraege (Kisten, Taschen,
--    Moebel). Die vorhandenen Policies an items (0004) gelten auch fuer
--    diese Spalte. grundriss_laden, kiste_lage und inhalt_suchen liefern
--    ihn mit.
--
-- Geaendert: platz_fehler, platz_nachruecken, grundriss_laden, kiste_lage
-- (alle 0028) und inhalt_suchen (0030), jeweils vollstaendig uebernommen.
-- =====================================================================

-- ================================================ 1. Fuellstand
alter table public.items add column fuellstand smallint;
alter table public.items add constraint items_fuellstand_check
  check (fuellstand is null or fuellstand between 0 and 100);

-- ================================================ 2. Ueberstand (Spiegel: src/lib/geometrie.ts)
-- Wie weit eine Kiste hoechstens in der Tiefe aus einem Fach ragen darf.
create function public.ueberstand_max_cm() returns int
language sql immutable parallel safe set search_path = public as $fn$
  select 40
$fn$;

-- Doppelter Ueberstand in der Tiefe (lokal y des Objekts, vorne oder
-- hinten, der groessere) einer Kiste mit Mitte (x,y). Die Ausdehnung der
-- Kiste in Objekt-Tiefe: Breite, wenn Kiste und Objekt "gleich" liegen
-- (Kiste 0 und Objekt 0/180, oder Kiste 90 und Objekt 90/270), sonst Laenge.
create function public.kiste_ueberstand2(o public.objekte, p_x int, p_y int, p_drehung smallint,
  p_laenge int, p_breite int) returns int
language sql immutable parallel safe set search_path = public as $fn$
  select greatest(0, e.t - 2 * l.ly, 2 * l.ly + e.t - 2 * o.tiefe_cm)
    from public.objekt_lokal(o, p_x, p_y) l
    cross join lateral (
      select case when (o.drehung in (0, 180)) = (coalesce(p_drehung, 0) = 0)
                  then p_breite else p_laenge end as t) e
$fn$;

-- Ueberstand einer Kiste in ganzen cm (aufgerundet). 0 ausser im Fach.
create function public.kiste_ueberstand_cm(i public.items) returns int
language sql stable set search_path = public as $fn$
  select coalesce((
    select (public.kiste_ueberstand2(o, i.platz_x, i.platz_y, i.platz_drehung, m.laenge_cm, m.breite_cm) + 1) / 2
      from public.objekte o
      cross join lateral public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id) m
     where i.unterlage_art = 'fach' and i.platz_raum_id is not null and o.id = i.unterlage_objekt_id), 0)
$fn$;
-- ================================================ 3. Platz im Fach pruefen (ersetzt 0028)
-- Wie 0028, dazu nach "nicht_im_fach" der Ueberstand.
create or replace function public.platz_fehler(k public.items, p_mit_baum boolean default false)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare
  r        public.raeume;
  u        public.items;
  o        public.objekte;
  m        record;
  mu       record;
  b        record;
  v_unten  int;
  v_grenze int;
  v_oben   int;
  v_id     uuid;
  v_i      int := 0;
  v_code   text;
  v_max    int;
  v_u2     int;
begin
  if k.platz_raum_id is null then
    return null;
  end if;
  if k.kind = 'furniture' then
    return public.grundriss_fehler('moebel_kein_platz', jsonb_build_object('code', k.code));
  end if;
  select * into r from public.raeume where id = k.platz_raum_id;
  if r.id is null or r.project_id <> k.project_id then
    return public.grundriss_fehler('raum_fehlt', jsonb_build_object('code', k.code));
  end if;
  if not public.geo_punkt_im_polygon(r.punkte, k.platz_x, k.platz_y) then
    return public.grundriss_fehler('draussen', jsonb_build_object('code', k.code));
  end if;
  select * into m from public.kiste_masse(k.size, k.eigene_hoehe_cm, k.eigene_groesse_id);

  if k.unterlage_art = 'boden' then
    v_unten := 0;
    v_grenze := r.hoehe_cm;

  elsif k.unterlage_art = 'kiste' then
    select * into u from public.items where id = k.unterlage_item_id;
    if u.id is null or u.id = k.id or u.platz_raum_id is null then
      return public.grundriss_fehler('unterlage_fehlt', jsonb_build_object('code', k.code));
    end if;
    if u.platz_raum_id <> k.platz_raum_id then
      return public.grundriss_fehler('unterlage_anderer_raum', jsonb_build_object('code', k.code));
    end if;
    v_id := u.unterlage_item_id;                   -- kein Kreis in "liegt auf"
    while v_id is not null loop
      v_i := v_i + 1;
      if v_id = k.id or v_i > 60 then
        return public.grundriss_fehler('kreis', jsonb_build_object('code', k.code, 'unter', u.code));
      end if;
      select i.unterlage_item_id into v_id from public.items i where i.id = v_id;
    end loop;
    select * into mu from public.kiste_masse(u.size, u.eigene_hoehe_cm, u.eigene_groesse_id);
    if not public.kiste_traegt(u.platz_x, u.platz_y, u.platz_drehung, mu.laenge_cm, mu.breite_cm,
                               k.platz_x, k.platz_y) then
      return public.grundriss_fehler('nicht_darauf', jsonb_build_object('code', k.code, 'unter', u.code));
    end if;
    select * into b from public.kiste_basis(u.id);
    if b.unten_cm is null then
      return public.grundriss_fehler('unterlage_fehlt', jsonb_build_object('code', k.code));
    end if;
    v_unten := b.unten_cm + mu.hoehe_cm;
    v_grenze := b.grenze_cm;

  else   -- 'objekt' oder 'fach'
    select * into o from public.objekte where id = k.unterlage_objekt_id;
    if o.id is null then
      return public.grundriss_fehler('unterlage_fehlt', jsonb_build_object('code', k.code));
    end if;
    if o.raum_id <> k.platz_raum_id then
      return public.grundriss_fehler('unterlage_anderer_raum', jsonb_build_object('code', k.code));
    end if;
    if k.unterlage_art = 'objekt' then
      if not public.objekt_enthaelt(o, k.platz_x, k.platz_y) then
        return public.grundriss_fehler('nicht_darauf_objekt',
          jsonb_build_object('code', k.code, 'name', o.name, 'art', o.art));
      end if;
      v_unten := o.hoehe_cm;
      v_grenze := r.hoehe_cm;
    else
      if o.art = 'moebel' then
        return public.grundriss_fehler('kein_regal', jsonb_build_object('code', k.code, 'name', o.name));
      end if;
      if k.fach_ebene > coalesce(array_length(o.brett_cm, 1), 0) or k.fach_spalte > o.spalten then
        return public.grundriss_fehler('fach_fehlt',
          jsonb_build_object('code', k.code, 'name', o.name, 'ebene', k.fach_ebene, 'spalte', k.fach_spalte));
      end if;
      if not public.objekt_im_fach(o, k.fach_spalte, k.platz_x, k.platz_y) then
        return public.grundriss_fehler('nicht_im_fach',
          jsonb_build_object('code', k.code, 'name', o.name, 'ebene', k.fach_ebene, 'spalte', k.fach_spalte));
      end if;
      -- In der Tiefe darf sie vorne oder hinten hoechstens ueberstand_max_cm
      -- herausragen (0033); die Mitte bleibt in Spalte und Tiefe (oben).
      v_u2 := public.kiste_ueberstand2(o, k.platz_x, k.platz_y, k.platz_drehung, m.laenge_cm, m.breite_cm);
      if v_u2 > 2 * public.ueberstand_max_cm() then
        return public.grundriss_fehler('ueberstand_zu_gross',
          jsonb_build_object('code', k.code, 'name', o.name, 'cm', (v_u2 + 1) / 2,
                             'max', public.ueberstand_max_cm()));
      end if;
      v_unten := o.brett_cm[k.fach_ebene];
      v_grenze := public.fach_decke(o, k.fach_ebene);
    end if;
  end if;

  v_oben := v_unten + m.hoehe_cm;
  if v_oben > v_grenze then
    return public.grundriss_fehler('zu_hoch',
      jsonb_build_object('code', k.code, 'oben', v_oben, 'grenze', v_grenze));
  end if;

  if p_mit_baum then
    select c.code into v_code from public.items c
     where c.unterlage_item_id = k.id and c.platz_raum_id is not null
       and (c.platz_raum_id <> k.platz_raum_id
            or not public.kiste_traegt(k.platz_x, k.platz_y, k.platz_drehung,
                                       m.laenge_cm, m.breite_cm, c.platz_x, c.platz_y))
     limit 1;
    if v_code is not null then
      return public.grundriss_fehler('nicht_darauf', jsonb_build_object('code', v_code, 'unter', k.code));
    end if;
    with recursive baum(id, code, oben, tiefe) as (
      select c.id, c.code, v_oben + (public.kiste_masse(c.size, c.eigene_hoehe_cm, c.eigene_groesse_id)).hoehe_cm, 1
        from public.items c
       where c.unterlage_item_id = k.id and c.platz_raum_id is not null
      union all
      select c.id, c.code, baum.oben + (public.kiste_masse(c.size, c.eigene_hoehe_cm, c.eigene_groesse_id)).hoehe_cm,
             baum.tiefe + 1
        from public.items c join baum on c.unterlage_item_id = baum.id
       where baum.tiefe < 60 and c.platz_raum_id is not null)
    select baum.code, baum.oben into v_code, v_max
      from baum where baum.oben > v_grenze order by baum.tiefe limit 1;
    if v_code is not null then
      return public.grundriss_fehler('zu_hoch',
        jsonb_build_object('code', v_code, 'oben', v_max, 'grenze', v_grenze));
    end if;
  end if;
  return null;
end $fn$;

-- ================================================ 4. Nachruecken (ersetzt 0028)
-- Wie 0028; ragt eine nachrueckende Kiste zu weit aus dem Fach, versucht
-- sie wie bei "nicht_im_fach" die alte Mitte der Kiste darunter.
-- p_alt: die Kiste vorher, p_neu: nachher (null beim Loeschen). Kisten, die
-- auf ihr lagen und nicht mehr darauf liegen, uebernehmen ihre alte
-- Unterlage (START 5.2). Sie behalten ihren Mittelpunkt, wenn er dort
-- gilt, sonst nehmen sie den alten Mittelpunkt der Kiste darunter. Was auf
-- ihnen liegt, faehrt mit. Danach muss alles, was auf p_neu geblieben ist,
-- weiter unter die Grenze passen.
create or replace function public.platz_nachruecken(p_alt public.items, p_neu public.items)
returns void language plpgsql set search_path = public as $fn$
declare
  c        public.items;
  v_try    public.items;
  v_k      public.items;
  d        record;
  v_f      jsonb;
  v_x      int;
  v_y      int;
  v_ml     int;       -- Masse von p_neu (bleiben null, wenn p_neu keinen Platz hat)
  v_mb     int;
  v_bleibt boolean;
begin
  if p_neu.id is not null and p_neu.platz_raum_id is not null then
    select laenge_cm, breite_cm into v_ml, v_mb
      from public.kiste_masse(p_neu.size, p_neu.eigene_hoehe_cm, p_neu.eigene_groesse_id);
  end if;
  for c in select * from public.items
            where unterlage_item_id = p_alt.id and platz_raum_id is not null order by id loop
    v_bleibt := false;
    if p_neu.id is not null and p_neu.platz_raum_id is not null
       and p_neu.platz_raum_id = c.platz_raum_id then
      v_bleibt := public.kiste_traegt(p_neu.platz_x, p_neu.platz_y, p_neu.platz_drehung,
                                      v_ml, v_mb, c.platz_x, c.platz_y);
    end if;
    if v_bleibt then
      continue;   -- liegt weiter darauf
    end if;
    v_try := c;
    v_try.platz_raum_id       := p_alt.platz_raum_id;
    v_try.unterlage_art       := p_alt.unterlage_art;
    v_try.unterlage_item_id   := p_alt.unterlage_item_id;
    v_try.unterlage_objekt_id := p_alt.unterlage_objekt_id;
    v_try.fach_ebene          := p_alt.fach_ebene;
    v_try.fach_spalte         := p_alt.fach_spalte;
    v_f := public.platz_fehler(v_try, false);
    if v_f is not null and (v_f->>'kennung') in ('draussen', 'nicht_darauf', 'nicht_darauf_objekt', 'nicht_im_fach',
                                                      'ueberstand_zu_gross') then
      v_x := p_alt.platz_x; v_y := p_alt.platz_y;
    else
      v_x := c.platz_x; v_y := c.platz_y;
    end if;
    update public.items
       set platz_raum_id = p_alt.platz_raum_id, platz_x = v_x, platz_y = v_y,
           unterlage_art = p_alt.unterlage_art, unterlage_item_id = p_alt.unterlage_item_id,
           unterlage_objekt_id = p_alt.unterlage_objekt_id,
           fach_ebene = p_alt.fach_ebene, fach_spalte = p_alt.fach_spalte
     where id = c.id;
    if v_x <> c.platz_x or v_y <> c.platz_y then
      for d in
        with recursive baum(id, tiefe) as (
          select i.id, 1 from public.items i where i.unterlage_item_id = c.id
          union all
          select i.id, baum.tiefe + 1 from public.items i join baum on i.unterlage_item_id = baum.id
           where baum.tiefe < 60)
        select baum.id from baum order by baum.tiefe, baum.id
      loop
        update public.items
           set platz_x = platz_x + (v_x - c.platz_x), platz_y = platz_y + (v_y - c.platz_y)
         where id = d.id;
      end loop;
    end if;
  end loop;
  if p_neu.id is not null and p_neu.platz_raum_id is not null then
    select * into v_k from public.items where id = p_neu.id;
    perform public.grundriss_werfen(public.platz_fehler(v_k, true));
  end if;
end $fn$;

-- ================================================ 5. Laden und Lage (ersetzt 0028)
-- Alles eines Grundrisses (oder nur eines Raums) mit fertigen Hoehen,
-- Ueberstand und Fuellstand.
create or replace function public.grundriss_laden(p_grundriss uuid, p_raum uuid default null)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare
  g public.grundrisse;
begin
  select * into g from public.grundrisse where id = p_grundriss;
  if g.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'grundriss', to_jsonb(g),
    'raeume', coalesce((
      select jsonb_agg(to_jsonb(r) || jsonb_build_object('tag_name', t.name, 'tag_short', t.short, 'tag_color', t.color)
                       order by r.sort, r.created_at)
        from public.raeume r left join public.tags t on t.id = r.tag_id
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb),
    'oeffnungen', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.raum_id, o.kante, o.abstand_cm)
        from public.oeffnungen o join public.raeume r on r.id = o.raum_id
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb),
    'objekte', coalesce((
      select jsonb_agg(to_jsonb(o) || jsonb_build_object('item_code', i.code, 'item_title', i.title)
                       order by o.created_at)
        from public.objekte o join public.raeume r on r.id = o.raum_id
        left join public.items i on i.id = o.item_id
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb),
    'kisten', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id, 'code', i.code, 'prefix', i.prefix, 'size', i.size, 'seq', i.seq,
               'kind', i.kind, 'status', i.status, 'title', i.title, 'room_id', i.room_id,
               'room_color', t.color, 'mark_color', i.mark_color, 'eigene_groesse_name', e.name,
               'platz_raum_id', i.platz_raum_id, 'platz_x', i.platz_x, 'platz_y', i.platz_y,
               'platz_drehung', i.platz_drehung, 'unterlage_art', i.unterlage_art,
               'unterlage_item_id', i.unterlage_item_id, 'unterlage_objekt_id', i.unterlage_objekt_id,
               'fach_ebene', i.fach_ebene, 'fach_spalte', i.fach_spalte,
               'laenge_cm', m.laenge_cm, 'breite_cm', m.breite_cm, 'hoehe_cm', m.hoehe_cm,
               'unten_cm', b.unten_cm, 'oben_cm', b.unten_cm + m.hoehe_cm, 'grenze_cm', b.grenze_cm,
               'wurzel_art', b.wurzel_art, 'nr', b.tiefe + 1,
               'ueberstand_cm', public.kiste_ueberstand_cm(i), 'fuellstand', i.fuellstand)
             order by b.tiefe, i.code)
        from public.items i
        join public.raeume r on r.id = i.platz_raum_id
        left join public.tags t on t.id = i.room_id
        left join public.eigene_groessen e on e.id = i.eigene_groesse_id
        cross join lateral public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id) m
        cross join lateral public.kiste_basis(i.id) b
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb));
end $fn$;

-- Wo steht eine Kiste (oder ein Moebel ueber sein Objekt)? null = kein Platz.
create or replace function public.kiste_lage(p_item uuid)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare
  i     public.items;
  u     public.items;
  o     public.objekte;
  r     public.raeume;
  g     public.grundrisse;
  v_tag text;
  m     record;
  b     record;
begin
  select * into i from public.items where id = p_item;
  if i.id is null then
    return null;
  end if;
  if i.kind = 'furniture' then
    select * into o from public.objekte where item_id = i.id;
    if o.id is null then return null; end if;
    select * into r from public.raeume where id = o.raum_id;
    select * into g from public.grundrisse where id = r.grundriss_id;
    select name into v_tag from public.tags where id = r.tag_id;
    return jsonb_build_object(
      'art', 'moebel',
      'grundriss', jsonb_build_object('id', g.id, 'name', g.name),
      'raum', jsonb_build_object('id', r.id, 'name', coalesce(nullif(r.name, ''), v_tag), 'tag_id', r.tag_id),
      'objekt', jsonb_build_object('id', o.id, 'name', o.name, 'art', o.art),
      'unten_cm', 0, 'oben_cm', o.hoehe_cm, 'fuellstand', i.fuellstand);
  end if;
  if i.platz_raum_id is null then
    return null;
  end if;
  select * into r from public.raeume where id = i.platz_raum_id;
  select * into g from public.grundrisse where id = r.grundriss_id;
  select name into v_tag from public.tags where id = r.tag_id;
  select * into m from public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id);
  select * into b from public.kiste_basis(i.id);
  if i.unterlage_art = 'kiste' then
    select * into u from public.items where id = i.unterlage_item_id;
  elsif i.unterlage_art in ('objekt', 'fach') then
    select * into o from public.objekte where id = i.unterlage_objekt_id;
  end if;
  return jsonb_build_object(
    'art', 'kiste',
    'grundriss', jsonb_build_object('id', g.id, 'name', g.name),
    'raum', jsonb_build_object('id', r.id, 'name', coalesce(nullif(r.name, ''), v_tag), 'tag_id', r.tag_id),
    'platz_x', i.platz_x, 'platz_y', i.platz_y, 'drehung', i.platz_drehung,
    'unterlage_art', i.unterlage_art, 'unterlage_item_id', i.unterlage_item_id, 'unterlage_code', u.code,
    'objekt', case when o.id is null then null
                   else jsonb_build_object('id', o.id, 'name', o.name, 'art', o.art) end,
    'fach_ebene', i.fach_ebene, 'fach_spalte', i.fach_spalte,
    'laenge_cm', m.laenge_cm, 'breite_cm', m.breite_cm, 'hoehe_cm', m.hoehe_cm,
    'unten_cm', b.unten_cm, 'oben_cm', b.unten_cm + m.hoehe_cm, 'grenze_cm', b.grenze_cm,
    'nr', b.tiefe + 1,
    'ueberstand_cm', public.kiste_ueberstand_cm(i), 'fuellstand', i.fuellstand,
    'auf_ihr', coalesce((select jsonb_agg(c.code order by c.code) from public.items c
                          where c.unterlage_item_id = i.id), '[]'::jsonb));
end $fn$;

-- ================================================ 6. Suche (ersetzt 0030)
-- Wie 0030, dazu am Ende item_fuellstand. Neue Spalte heisst neuer
-- Rueckgabetyp, darum drop und create (wie 0030).
drop function public.inhalt_suchen(text, int);

create function public.inhalt_suchen(p_q text, p_max int default 60)
returns table (
  content_id uuid, inhalt text, menge int, schicht smallint, photo_id uuid, foto_pfad text,
  box_x0 numeric, box_y0 numeric, box_x1 numeric, box_y1 numeric, punkt_x numeric, punkt_y numeric,
  ausschnitt_pfad text, bestaetigt boolean,
  item_id uuid, item_code text, item_kind text, item_title text, item_status text,
  project_id uuid, project_name text,
  room_id uuid, room_name text, room_color text,
  grundriss_id uuid, grundriss_name text,
  raum_id uuid, raum_name text,
  unterlage_art text,          -- boden | kiste | objekt | fach | moebel (Ding in einem Moebel)
  unterlage_code text,         -- bei kiste: Nummer der Kiste darunter
  objekt_id uuid, objekt_name text, objekt_art text,
  objekt_spalten smallint,     -- Spalten des Regals, damit "Fach 2/1" eindeutig ist
  fach_ebene smallint, fach_spalte smallint,
  platz_x int, platz_y int,
  stapel_nr int,               -- 1 = unten
  hoehe_von int, hoehe_bis int,
  treffer real,
  item_fuellstand smallint)    -- 0033: Fuellstand der Kiste in Prozent, null = nicht angegeben
language sql stable security invoker set search_path = public, extensions as $fn$
  with q as (select public.such_normal(p_q) as n)
  select
    c.id, c.text, c.qty, c.schicht, c.photo_id, f.path,
    c.box_x0, c.box_y0, c.box_x1, c.box_y1, c.punkt_x, c.punkt_y,
    c.ausschnitt_pfad, c.bestaetigt,
    i.id, i.code, i.kind::text, i.title, i.status::text,
    p.id, p.name,
    t.id, t.name, t.color,
    gr.id, gr.name,
    r.id, coalesce(nullif(r.name, ''), rt.name),
    case when mo.id is not null then 'moebel' else i.unterlage_art end,
    ui.code,
    coalesce(uo.id, mo.id), coalesce(uo.name, mo.name), coalesce(uo.art, mo.art),
    coalesce(uo.spalten, mo.spalten),
    i.fach_ebene, i.fach_spalte,
    i.platz_x, i.platz_y,
    case when i.platz_raum_id is not null then b.tiefe + 1 end,
    case when mo.id is not null then 0 else b.unten_cm end,
    case when mo.id is not null then mo.hoehe_cm else b.unten_cm + m.hoehe_cm end,
    (case
      when c.such_text = q.n then 1.0
      when strpos(' ' || c.such_text || ' ', ' ' || q.n || ' ') > 0 then 0.95
      when strpos(' ' || c.such_text, ' ' || q.n) > 0 then 0.9
      when strpos(c.such_text, q.n) > 0 then 0.8
      else least(extensions.word_similarity(q.n, c.such_text), 0.79)
    end)::real,
    i.fuellstand
  from q
  join public.item_contents c
    on strpos(c.such_text, q.n) > 0
    or extensions.word_similarity(q.n, c.such_text) >= 0.45
  join public.items i on i.id = c.item_id
  join public.projects p on p.id = i.project_id
  left join public.item_photos f on f.id = c.photo_id
  left join public.tags t on t.id = i.room_id
  left join public.objekte mo on mo.item_id = i.id and i.kind = 'furniture'
  left join public.raeume r on r.id = coalesce(i.platz_raum_id, mo.raum_id)
  left join public.tags rt on rt.id = r.tag_id
  left join public.grundrisse gr on gr.id = r.grundriss_id
  left join public.objekte uo on uo.id = i.unterlage_objekt_id
  left join public.items ui on ui.id = i.unterlage_item_id
  left join lateral public.kiste_basis(i.id) b on true
  left join lateral public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id) m on true
  where length(q.n) >= 2
  order by 42 desc, length(c.text), c.text
  limit least(greatest(coalesce(p_max, 60), 1), 200)
$fn$;

revoke execute on function public.inhalt_suchen(text, int) from public, anon;
grant  execute on function public.inhalt_suchen(text, int) to authenticated;

-- ================================================ 7. Rechte (wie 0028)
revoke execute on function
  public.ueberstand_max_cm(),
  public.kiste_ueberstand2(public.objekte, int, int, smallint, int, int),
  public.kiste_ueberstand_cm(public.items),
  public.platz_fehler(public.items, boolean),
  public.platz_nachruecken(public.items, public.items),
  public.grundriss_laden(uuid, uuid),
  public.kiste_lage(uuid)
from public, anon;

grant execute on function
  public.ueberstand_max_cm(),
  public.kiste_ueberstand2(public.objekte, int, int, smallint, int, int),
  public.kiste_ueberstand_cm(public.items),
  public.platz_fehler(public.items, boolean),
  public.platz_nachruecken(public.items, public.items),
  public.grundriss_laden(uuid, uuid),
  public.kiste_lage(uuid)
to authenticated;
