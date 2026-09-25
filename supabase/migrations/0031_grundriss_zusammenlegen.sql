-- =====================================================================
-- Kistly 0031_grundriss_zusammenlegen
--
-- grundriss_speichern (0028) bekommt den Teil "umhaengen":
-- [{von_raum_id, nach_raum_id}] haengt alle Objekte und alle Kisten des
-- von-Raums in den nach-Raum um (beide im selben Grundriss). Damit kann
-- der Zeichner "Raum teilen" rueckgaengig machen, ohne dass die Kisten im
-- abgeteilten Raum ihren Platz verlieren: alter Raum mit altem Umriss,
-- umhaengen vom abgeteilten in den alten Raum, abgeteilten Raum loeschen.
--
-- Neue Reihenfolge: loeschen (Oeffnungen, Objekte), raeume, umhaengen,
-- verschieben, objekte, zuordnen, oeffnungen, zuletzt raeume_loeschen,
-- dann die Schlusspruefung. Sonst alles wie 0028 (Signatur, Rechte).
-- =====================================================================

-- Speichern aus dem Zeichner: viele Aenderungen in einem Vorgang, am Ende
-- wird jeder beruehrte Raum vollstaendig geprueft. p_aenderung (alle Teile
-- freiwillig; ids vergibt der Browser mit crypto.randomUUID):
-- { "oeffnungen_loeschen": [uuid], "objekte_loeschen": [uuid], "raeume_loeschen": [uuid],
--   "raeume":     [{id, tag_id, name, art, punkte:[x0,y0,...], hoehe_cm, bodenfarbe, wandfarben:[..], sort}],
--   "umhaengen":  [{von_raum_id, nach_raum_id}],  -- alles aus von in nach (Teilen rueckgaengig)
--   "verschieben":[{raum_id, dx, dy}],            -- Raum samt Inhalt verschieben
--   "objekte":    [{id, raum_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, drehung, form,
--                   ausschnitt_breite_cm, ausschnitt_tiefe_cm, ausschnitt_ecke, brett_cm:[..], spalten, farbe, item_id}],
--   "zuordnen":   [{von_raum_id, nach_raum_id}],  -- nach dem Teilen: Inhalt, der im neuen Raum liegt, umhaengen
--   "oeffnungen": [{id, raum_id, art, kante, abstand_cm, breite_cm, hoehe_cm, bruestung_cm, anschlag, aufschlag}] }
create or replace function public.grundriss_speichern(p_grundriss uuid, p_version int, p_aenderung jsonb)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  g        public.grundrisse;
  e        jsonb;
  v_raum   uuid;
  v_raeume uuid[] := '{}';
  v_ids    uuid[];
  v_neu    int;
  v_dx     int;
  v_dy     int;
  rv       public.raeume;
  rn       public.raeume;
  o        public.objekte;
  v_a      jsonb := coalesce(p_aenderung, '{}'::jsonb);
begin
  select * into g from public.grundrisse where id = p_grundriss;
  if g.id is null then
    perform public.grundriss_werfen(public.grundriss_fehler('grundriss_fehlt'));
  end if;
  if not public.is_editor(g.project_id) then
    perform public.grundriss_werfen(public.grundriss_fehler('keine_rechte'));
  end if;
  select * into g from public.grundrisse where id = p_grundriss for update;
  if g.version <> p_version then
    perform public.grundriss_werfen(public.grundriss_fehler('veraltet', jsonb_build_object('version', g.version)));
  end if;

  perform set_config('kistly.spaeter', 'an', true);
  for v_raum in select id from public.raeume where grundriss_id = p_grundriss order by id::text loop
    perform public.raum_sperre(v_raum, true);
  end loop;

  -- Fremde ids: nichts aus einem anderen Grundriss anfassen.
  if exists (select 1 from jsonb_array_elements(coalesce(v_a->'raeume', '[]')) el
               join public.raeume r on r.id = (el->>'id')::uuid
              where r.grundriss_id <> p_grundriss)
     or exists (select 1 from jsonb_array_elements(coalesce(v_a->'objekte', '[]')) el
               join public.objekte o2 on o2.id = (el->>'id')::uuid
               join public.raeume r on r.id = o2.raum_id
              where r.grundriss_id <> p_grundriss)
     or exists (select 1 from jsonb_array_elements(coalesce(v_a->'oeffnungen', '[]')) el
               join public.oeffnungen o3 on o3.id = (el->>'id')::uuid
               join public.raeume r on r.id = o3.raum_id
              where r.grundriss_id <> p_grundriss)
     or exists (select 1 from jsonb_array_elements(coalesce(v_a->'objekte', '[]') || coalesce(v_a->'oeffnungen', '[]')) el
              where (el->>'raum_id')::uuid not in (select id from public.raeume where grundriss_id = p_grundriss)
                and (el->>'raum_id')::uuid not in (
                      select (y->>'id')::uuid from jsonb_array_elements(coalesce(v_a->'raeume', '[]')) y)) then
    perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
  end if;

  -- 1. Loeschen (Oeffnungen, Objekte: Getragenes faellt auf den Boden).
  --    Raeume erst ganz am Ende (7), damit "umhaengen" ihren Inhalt vorher
  --    in einen anderen Raum bringen kann.
  delete from public.oeffnungen o3 using public.raeume r
   where o3.raum_id = r.id and r.grundriss_id = p_grundriss
     and o3.id in (select (el #>> '{}')::uuid from jsonb_array_elements(coalesce(v_a->'oeffnungen_loeschen', '[]')) el);
  v_ids := array(select (el #>> '{}')::uuid from jsonb_array_elements(coalesce(v_a->'objekte_loeschen', '[]')) el);
  v_raeume := v_raeume || array(select o2.raum_id from public.objekte o2 where o2.id = any(v_ids));
  delete from public.objekte o2 using public.raeume r
   where o2.raum_id = r.id and r.grundriss_id = p_grundriss and o2.id = any(v_ids);
  -- Das Zimmer eines Raums, der geloescht wird, ist schon jetzt frei
  -- (sonst stiesse ein anderer Raum, der es in 2 bekommt, auf zimmer_doppelt).
  update public.raeume set tag_id = null
   where grundriss_id = p_grundriss and tag_id is not null
     and id in (select (el #>> '{}')::uuid from jsonb_array_elements(coalesce(v_a->'raeume_loeschen', '[]')) el);

  -- 2. Raeume anlegen oder aendern
  for e in select * from jsonb_array_elements(coalesce(v_a->'raeume', '[]')) loop
    insert into public.raeume as r (id, grundriss_id, tag_id, name, art, punkte, hoehe_cm, bodenfarbe, wandfarben, sort)
    values (coalesce((e->>'id')::uuid, gen_random_uuid()), p_grundriss, nullif(e->>'tag_id', '')::uuid,
            coalesce(e->>'name', ''), coalesce(e->>'art', 'innen'),
            array(select v::int from jsonb_array_elements_text(e->'punkte') with ordinality a(v, n) order by n),
            coalesce((e->>'hoehe_cm')::int, 250), nullif(e->>'bodenfarbe', ''),
            case when jsonb_typeof(e->'wandfarben') = 'array' then
              array(select v from jsonb_array_elements_text(e->'wandfarben') with ordinality a(v, n) order by n) end,
            coalesce((e->>'sort')::int, 0))
    on conflict (id) do update set
      tag_id = excluded.tag_id, name = excluded.name, art = excluded.art, punkte = excluded.punkte,
      hoehe_cm = excluded.hoehe_cm, bodenfarbe = excluded.bodenfarbe, wandfarben = excluded.wandfarben,
      sort = excluded.sort
    where r.grundriss_id = p_grundriss
    returning r.id into v_raum;
    if v_raum is null then
      perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
    end if;
    v_raeume := v_raeume || v_raum;
  end loop;

  -- 2b. Umhaengen: alle Objekte und alle Kisten des von-Raums gehoeren
  --     danach dem nach-Raum (Teilen rueckgaengig: der abgeteilte Raum
  --     wird in 7 geloescht, sein Inhalt bleibt). Objekte zuerst, ihr
  --     Getragenes folgt ihnen (objekte_nachher); dann der Rest.
  for e in select * from jsonb_array_elements(coalesce(v_a->'umhaengen', '[]')) loop
    select * into rv from public.raeume where id = (e->>'von_raum_id')::uuid and grundriss_id = p_grundriss;
    select * into rn from public.raeume where id = (e->>'nach_raum_id')::uuid and grundriss_id = p_grundriss;
    if rv.id is null or rn.id is null or rv.id = rn.id then
      perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
    end if;
    update public.objekte set raum_id = rn.id where raum_id = rv.id;
    update public.items set platz_raum_id = rn.id where platz_raum_id = rv.id;
    v_raeume := v_raeume || rn.id;
  end loop;

  -- 3. Raum samt Inhalt verschieben. Bodenstapel wandern hier, Getragenes
  --    wandert mit seinem Objekt (objekte_nachher).
  for e in select * from jsonb_array_elements(coalesce(v_a->'verschieben', '[]')) loop
    v_raum := (e->>'raum_id')::uuid; v_dx := (e->>'dx')::int; v_dy := (e->>'dy')::int;
    if not exists (select 1 from public.raeume where id = v_raum and grundriss_id = p_grundriss) then
      perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
    end if;
    v_ids := array(select i.id from public.items i cross join lateral public.kiste_basis(i.id) b
                    where i.platz_raum_id = v_raum and b.wurzel_art = 'boden');
    update public.raeume
       set punkte = array(select case when u.n % 2 = 1 then u.v + v_dx else u.v + v_dy end
                            from unnest(punkte) with ordinality u(v, n) order by u.n)
     where id = v_raum;
    update public.objekte set x = x + v_dx, y = y + v_dy where raum_id = v_raum;
    update public.items set platz_x = platz_x + v_dx, platz_y = platz_y + v_dy where id = any(v_ids);
    v_raeume := v_raeume || v_raum;
  end loop;

  -- 4. Objekte anlegen oder aendern
  v_raeume := v_raeume || array(select o2.raum_id from public.objekte o2
     where o2.id in (select (el->>'id')::uuid from jsonb_array_elements(coalesce(v_a->'objekte', '[]')) el));
  for e in select * from jsonb_array_elements(coalesce(v_a->'objekte', '[]')) loop
    begin
    insert into public.objekte as ob (id, raum_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, drehung, form,
                                      ausschnitt_breite_cm, ausschnitt_tiefe_cm, ausschnitt_ecke, brett_cm, spalten,
                                      farbe, item_id)
    values (coalesce((e->>'id')::uuid, gen_random_uuid()), (e->>'raum_id')::uuid, e->>'art', coalesce(e->>'name', ''),
            (e->>'x')::int, (e->>'y')::int, (e->>'breite_cm')::int, (e->>'tiefe_cm')::int, (e->>'hoehe_cm')::int,
            coalesce((e->>'drehung')::smallint, 0), coalesce(e->>'form', 'rechteck'),
            (e->>'ausschnitt_breite_cm')::int, (e->>'ausschnitt_tiefe_cm')::int, nullif(e->>'ausschnitt_ecke', ''),
            case when jsonb_typeof(e->'brett_cm') = 'array' then
              array(select v::int from jsonb_array_elements_text(e->'brett_cm') with ordinality a(v, n) order by n) end,
            coalesce((e->>'spalten')::smallint, 1), nullif(e->>'farbe', ''), nullif(e->>'item_id', '')::uuid)
    on conflict (id) do update set
      raum_id = excluded.raum_id, art = excluded.art, name = excluded.name, x = excluded.x, y = excluded.y,
      breite_cm = excluded.breite_cm, tiefe_cm = excluded.tiefe_cm, hoehe_cm = excluded.hoehe_cm,
      drehung = excluded.drehung, form = excluded.form, ausschnitt_breite_cm = excluded.ausschnitt_breite_cm,
      ausschnitt_tiefe_cm = excluded.ausschnitt_tiefe_cm, ausschnitt_ecke = excluded.ausschnitt_ecke,
      brett_cm = excluded.brett_cm, spalten = excluded.spalten, farbe = excluded.farbe, item_id = excluded.item_id;
    exception when insufficient_privilege then
      -- Die id gehoert zu einem Objekt, das dieser Nutzer nicht sehen darf.
      perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
    end;
    v_raeume := v_raeume || (e->>'raum_id')::uuid;
  end loop;

  -- 5. Nach dem Teilen: was ganz im neuen Raum liegt, gehoert ihm
  for e in select * from jsonb_array_elements(coalesce(v_a->'zuordnen', '[]')) loop
    select * into rv from public.raeume where id = (e->>'von_raum_id')::uuid and grundriss_id = p_grundriss;
    select * into rn from public.raeume where id = (e->>'nach_raum_id')::uuid and grundriss_id = p_grundriss;
    if rv.id is null or rn.id is null then
      perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
    end if;
    for o in select * from public.objekte where raum_id = rv.id loop
      if not exists (select 1 from public.objekt_rechtecke(o) q
                      where not public.geo_rechteck_im_polygon(rn.punkte, q.x0, q.y0, q.x1, q.y1)) then
        update public.objekte set raum_id = rn.id where id = o.id;   -- Getragenes folgt (objekte_nachher)
      end if;
    end loop;
    with recursive wurzeln as (
      select i.id from public.items i
       where i.platz_raum_id = rv.id and i.unterlage_art = 'boden'
         and public.geo_punkt_im_polygon(rn.punkte, i.platz_x, i.platz_y)
         and not public.geo_punkt_im_polygon(rv.punkte, i.platz_x, i.platz_y)),
    baum(id, tiefe) as (
      select id, 0 from wurzeln
      union all
      select i.id, baum.tiefe + 1 from public.items i join baum on i.unterlage_item_id = baum.id
       where baum.tiefe < 60)
    update public.items set platz_raum_id = rn.id where id in (select id from baum);
    v_raeume := v_raeume || rv.id || rn.id;
  end loop;

  -- 6. Oeffnungen anlegen oder aendern
  v_raeume := v_raeume || array(select o3.raum_id from public.oeffnungen o3
     where o3.id in (select (el->>'id')::uuid from jsonb_array_elements(coalesce(v_a->'oeffnungen', '[]')) el));
  for e in select * from jsonb_array_elements(coalesce(v_a->'oeffnungen', '[]')) loop
    insert into public.oeffnungen as oe (id, raum_id, art, kante, abstand_cm, breite_cm, hoehe_cm, bruestung_cm,
                                         anschlag, aufschlag)
    values (coalesce((e->>'id')::uuid, gen_random_uuid()), (e->>'raum_id')::uuid, e->>'art', (e->>'kante')::int,
            (e->>'abstand_cm')::int, (e->>'breite_cm')::int, (e->>'hoehe_cm')::int,
            coalesce((e->>'bruestung_cm')::int, 0), coalesce(e->>'anschlag', 'links'), coalesce(e->>'aufschlag', 'innen'))
    on conflict (id) do update set
      raum_id = excluded.raum_id, art = excluded.art, kante = excluded.kante, abstand_cm = excluded.abstand_cm,
      breite_cm = excluded.breite_cm, hoehe_cm = excluded.hoehe_cm, bruestung_cm = excluded.bruestung_cm,
      anschlag = excluded.anschlag, aufschlag = excluded.aufschlag;
    v_raeume := v_raeume || (e->>'raum_id')::uuid;
  end loop;

  -- 7. Raeume loeschen (Plaetze darin werden leer, Moebel, Tueren und
  --    Fenster gehen mit), dann Version hochzaehlen, Schalter aus, alles
  --    Beruehrte vollstaendig pruefen (geloeschte Raeume liefern nichts)
  delete from public.raeume
   where grundriss_id = p_grundriss
     and id in (select (el #>> '{}')::uuid from jsonb_array_elements(coalesce(v_a->'raeume_loeschen', '[]')) el);
  update public.grundrisse set version = version + 1 where id = p_grundriss returning version into v_neu;
  perform set_config('kistly.spaeter', '', true);
  for v_raum in select distinct ru from unnest(v_raeume) ru where ru is not null order by 1 loop
    perform public.grundriss_werfen(public.raum_fehler(v_raum));
  end loop;
  return jsonb_build_object('version', v_neu, 'daten', public.grundriss_laden(p_grundriss));
end $fn$;

revoke execute on function public.grundriss_speichern(uuid, int, jsonb) from public, anon;
grant execute on function public.grundriss_speichern(uuid, int, jsonb) to authenticated;
