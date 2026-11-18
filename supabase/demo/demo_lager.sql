-- =====================================================================
-- Magazino Demo: zwei Lager mit Regalen, Kisten, Inhalt und Bestand (E103)
--
-- Reine Beispieldaten, ausgedachte Masse (Karam: "sehr fiktional"). Nichts
-- Haram, nichts mit Party. Gehoert dem ersten Admin. Laeuft nur, wenn es
-- noch kein Lager mit diesen Namen gibt; ein zweiter Lauf tut nichts.
-- Entfernen: die beiden Lager im Programm loeschen (Lager-Einstellungen),
-- alles haengt per "on delete cascade" daran.
--
-- Aufruf (nach Karams Ja): npx.cmd --yes supabase@2.120.0 db query --linked
--   --project-ref vqpirkgvclfsduklnnzv -f supabase/demo/demo_lager.sql
-- =====================================================================

create function pg_temp.lager_bauen(p_admin uuid, p_name text, p_notiz text, p_w int, p_h int, p_zeilen int, p_je_zeile int, p_extra jsonb)
returns text
language plpgsql as $fn$
declare
  v_p uuid; v_g uuid; v_r uuid;
  v_kat text[] := array['Kreatives und Basteln', 'Essen und Snacks', 'Verkaufsstand', 'Sport und Spiel', 'Bücher und Papier', 'Technik'];
  v_kurz text[] := array['BA', 'ES', 'VK', 'SP', 'BU', 'TE'];
  v_farbe text[] := array['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#7C3AED', '#0891B2'];
  v_tag uuid[] := '{}'; v_tid uuid;
  v_regale uuid[] := '{}'; v_obj uuid;
  i int; j int; z int; n int := 0;
  v_item public.items; v_pos int := 0; v_reg int; v_ebene int; v_spalte int;
  k record; c text; v_b public.bestand; v_kid uuid; v_gesetzt int := 0; v_fehl int := 0; v_msg text := '';
  v_namen text[] := array['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
begin
  if exists (select 1 from public.projects where name = p_name) then return p_name || ': gibt es schon, nichts getan'; end if;
  insert into public.projects (name, note, owner_id) values (p_name, p_notiz, p_admin) returning id into v_p;
  insert into public.project_members (project_id, user_id, role) values (v_p, p_admin, 'owner');
  for i in 1..6 loop
    insert into public.lager_kategorien (project_id, name, sort, zustaendig_id) values (v_p, v_kat[i], i * 10, case when i = 2 then p_admin else null end);
    insert into public.tags (project_id, kind, name, short, color, sort) values (v_p, 'room', v_kat[i], v_kurz[i], v_farbe[i], i * 10) returning id into v_tid;
    v_tag := v_tag || v_tid;
  end loop;

  -- Grundriss: ein grosser Raum, Tuer unten, zwei Fenster oben.
  insert into public.grundrisse (project_id, name) values (v_p, 'Lagerhalle') returning id into v_g;
  insert into public.raeume (grundriss_id, project_id, name, art, punkte, hoehe_cm)
    values (v_g, v_p, 'Lagerraum', 'innen', array[0, 0, p_w, 0, p_w, p_h, 0, p_h], 350) returning id into v_r;
  insert into public.oeffnungen (raum_id, project_id, art, kante, abstand_cm, breite_cm, hoehe_cm, anschlag, aufschlag)
    values (v_r, v_p, 'tuer', 2, (p_w / 2) - 100, 200, 230, 'links', 'aussen');
  insert into public.oeffnungen (raum_id, project_id, art, kante, abstand_cm, breite_cm, hoehe_cm, bruestung_cm)
    values (v_r, v_p, 'fenster', 0, p_w / 4, 180, 140, 120), (v_r, v_p, 'fenster', 0, (p_w * 3) / 4 - 180, 180, 140, 120);

  -- Regale: Reihen mit je p_je_zeile Regalen (200 x 50 x 200 cm, 4 Boeden, 2 Spalten).
  for z in 1..p_zeilen loop
    for j in 1..p_je_zeile loop
      n := n + 1;
      insert into public.objekte (raum_id, project_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, drehung, brett_cm, spalten, farbe)
        values (v_r, v_p, 'regal', 'Regal ' || v_namen[n], 80 + (j - 1) * 260, 60 + (z - 1) * (p_h - 240) / greatest(p_zeilen - 1, 1), 200, 50, 200, 0,
                array[0, 50, 100, 150], 2, '#9CA3AF')
        returning id into v_obj;
      v_regale := v_regale || v_obj;
    end loop;
  end loop;
  -- Tische und Grosses: p_extra ist eine Liste aus {name, x, y, b, t, h}.
  for k in select * from jsonb_to_recordset(p_extra) as e(name text, x int, y int, b int, t int, h int) loop
    insert into public.objekte (raum_id, project_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, drehung, farbe)
      values (v_r, v_p, 'moebel', k.name, k.x, k.y, k.b, k.t, k.h, 0, '#60A5FA');
  end loop;

  -- Kisten mit Inhalt, der Reihe nach in die Faecher gestellt.
  for k in select * from jsonb_to_recordset(current_setting('magazino.demo_kisten')::jsonb)
           as e(titel text, kat int, groesse int, inhalt text[]) loop
    insert into public.items (project_id, title, room_id, size, status)
      values (v_p, k.titel, v_tag[k.kat], k.groesse, 'arrived') returning * into v_item;
    for c in select unnest(k.inhalt) loop
      insert into public.item_contents (item_id, project_id, text, qty, sort)
        values (v_item.id, v_p, regexp_replace(c, '^[0-9]+ ', ''), coalesce(nullif(substring(c from '^[0-9]+'), '')::int, 1), 0);
    end loop;
    v_reg := (v_pos / 8) % array_length(v_regale, 1) + 1;
    v_ebene := (v_pos % 8) / 2 + 1;
    v_spalte := v_pos % 2 + 1;
    v_pos := v_pos + 1;
    begin
      update public.items set
        platz_raum_id = v_r,
        platz_x = (select x + ((v_spalte * 2 - 1) * 50) from public.objekte where id = v_regale[v_reg]),
        platz_y = (select y + 25 from public.objekte where id = v_regale[v_reg]),
        platz_drehung = 0, unterlage_art = 'fach', unterlage_objekt_id = v_regale[v_reg], fach_ebene = v_ebene, fach_spalte = v_spalte
       where id = v_item.id;
      v_gesetzt := v_gesetzt + 1;
    exception when others then
      v_fehl := v_fehl + 1;
      if v_msg = '' then v_msg := sqlerrm; end if;
    end;
  end loop;

  -- Bestand (Mengen, Verbrauch und Ausleihe).
  for k in select * from jsonb_to_recordset(current_setting('magazino.demo_bestand')::jsonb)
           as e(name text, kat int, menge numeric, einheit text, mindest numeric, art text, ort text) loop
    select id into v_kid from public.lager_kategorien where project_id = v_p and name = v_kat[k.kat];
    insert into public.bestand (project_id, kategorie_id, name, einheit, menge, mindestmenge, art, ort, created_by,
                                knapp_seit)
      values (v_p, v_kid, k.name, k.einheit, k.menge, k.mindest, k.art, k.ort, p_admin,
              case when k.mindest > 0 and k.menge <= k.mindest then now() else null end);
  end loop;

  return p_name || ': ' || n || ' Regale, ' || v_gesetzt || ' Kisten platziert, ' || v_fehl || ' ohne Platz' || case when v_msg <> '' then ' (' || v_msg || ')' else '' end;
end $fn$;

do $demo$
declare
  v_admin uuid; v_kisten jsonb; v_bestand jsonb; v_a text; v_b text;
begin
  select user_id into v_admin from public.app_admins order by created_at limit 1;
  if v_admin is null then raise exception 'Kein Admin vorhanden'; end if;
  -- Die Nummernvergabe der Kisten prueft die Mitgliedschaft des angemeldeten Kontos: als Admin handeln.
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  v_kisten := $k$[
   {"titel":"Papierbecher und Teller","kat":1,"groesse":8,"inhalt":["400 Papierbecher","250 Papierteller","1 Karton Servietten"]},
   {"titel":"Buntpapier und Kleber","kat":1,"groesse":5,"inhalt":["800 Blatt Buntpapier A4","24 Klebestifte","15 Kinderscheren"]},
   {"titel":"Filzstifte und Malbücher","kat":1,"groesse":4,"inhalt":["30 Sets Filzstifte","60 Malbücher","1 Dose Glitzer (Notfallreserve, wird nie weniger)"]},
   {"titel":"Notfall-Datteln für Iftar","kat":2,"groesse":6,"inhalt":["40 Packungen Datteln","20 Packungen Mandeln","1 Zettel: Nicht vor Sonnenuntergang öffnen"]},
   {"titel":"Fruchtgummi (halal) und Kekse","kat":2,"groesse":5,"inhalt":["100 Beutel Fruchtgummi halal","60 Packungen Kekse"]},
   {"titel":"Wasser und Tee","kat":2,"groesse":9,"inhalt":["55 Flaschen Wasser 0,5 l","400 Teebeutel","2 Packungen Zucker","1 Dose geheimer Tee-Vorrat (Admin)"]},
   {"titel":"Kuchenständer und Preisschilder","kat":3,"groesse":6,"inhalt":["4 Kuchenständer","200 Preisschilder","1 Wechselgeldkasse (leer, wirklich)"]},
   {"titel":"Verkaufsschürzen","kat":3,"groesse":3,"inhalt":["12 Schürzen","12 Namensschilder"]},
   {"titel":"Bälle und Springseile","kat":4,"groesse":9,"inhalt":["8 Fußbälle","12 Springseile","3 Kegel-Sets"]},
   {"titel":"Trikots und Leibchen","kat":4,"groesse":7,"inhalt":["20 Leibchen blau","20 Leibchen weiß","1 Trillerpfeife (nur mit Erlaubnis)"]},
   {"titel":"Kinderbücher Teil 1","kat":5,"groesse":8,"inhalt":["40 Kinderbücher","10 Geschichtenbücher über Propheten"]},
   {"titel":"Kinderbücher Teil 2","kat":5,"groesse":8,"inhalt":["40 Kinderbücher","6 Koran-Ständer","5 Lesezeichen (ein Buch behauptet, sie zu kennen)"]},
   {"titel":"Beamer und Kabel","kat":6,"groesse":7,"inhalt":["1 Beamer (zeigt auch Montagmorgen-Gesichter)","10 Verlängerungskabel","1 Fernbedienung (Batterien fehlen immer)"]},
   {"titel":"Mikrofon-Set","kat":6,"groesse":4,"inhalt":["2 Mikrofone","2 Ständer","1 Kabeltrommel"]},
   {"titel":"Die Kiste ohne Namen","kat":1,"groesse":2,"inhalt":["1 Socke (links)","1 Socke (links, andere Farbe)","1 Pappeinhorn (nur anschauen)"]},
   {"titel":"Kiste 42: die Antwort auf alles","kat":5,"groesse":3,"inhalt":["1 Handtuch","1 Buch: Per Anhalter durch die Galaxis","1 Keks (als Fisch verkleidet)"]},
   {"titel":"Erste Hilfe","kat":6,"groesse":2,"inhalt":["1 Erste-Hilfe-Koffer","20 Pflaster mit Dinos"]},
   {"titel":"Gebetsteppiche","kat":5,"groesse":10,"inhalt":["30 Gebetsteppiche (sauber, Stapel A)","10 Kopftücher Ersatz"]}
  ]$k$::jsonb;
  perform set_config('magazino.demo_kisten', v_kisten::text, false);

  v_bestand := $b$[
   {"name":"Papierbecher","kat":1,"menge":400,"einheit":"Stk","mindest":100,"art":"verbrauch","ort":"Regal A, Fach 1"},
   {"name":"Papierteller","kat":1,"menge":250,"einheit":"Stk","mindest":80,"art":"verbrauch","ort":"Regal A, Fach 1"},
   {"name":"Buntpapier A4","kat":1,"menge":800,"einheit":"Blatt","mindest":200,"art":"verbrauch","ort":"Regal A, Fach 2"},
   {"name":"Klebestifte","kat":1,"menge":5,"einheit":"Stk","mindest":6,"art":"verbrauch","ort":"Regal A, Fach 2"},
   {"name":"Glitzer (Notfallreserve)","kat":1,"menge":12,"einheit":"Dose","mindest":2,"art":"verbrauch","ort":"Regal A, Fach 3"},
   {"name":"Kinderscheren","kat":1,"menge":15,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Regal A, Fach 2"},
   {"name":"Datteln (Iftar-Reserve)","kat":2,"menge":40,"einheit":"Packung","mindest":10,"art":"verbrauch","ort":"Regal B, Fach 1"},
   {"name":"Fruchtgummi halal","kat":2,"menge":100,"einheit":"Beutel","mindest":20,"art":"verbrauch","ort":"Regal B, Fach 2"},
   {"name":"Wasserflaschen 0,5 l","kat":2,"menge":55,"einheit":"Flasche","mindest":60,"art":"verbrauch","ort":"Regal B, Fach 3"},
   {"name":"Teebeutel","kat":2,"menge":400,"einheit":"Stk","mindest":100,"art":"verbrauch","ort":"Regal B, Fach 3"},
   {"name":"Kuchenständer","kat":3,"menge":4,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Regal C, Fach 1"},
   {"name":"Wechselgeldkasse (leer, wirklich)","kat":3,"menge":1,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Regal C, Fach 2"},
   {"name":"Preisschilder","kat":3,"menge":200,"einheit":"Stk","mindest":50,"art":"verbrauch","ort":"Regal C, Fach 2"},
   {"name":"Fußballtor klappbar","kat":4,"menge":2,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Halle, links an der Wand"},
   {"name":"Fußbälle","kat":4,"menge":8,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Regal D, Fach 1"},
   {"name":"Springseile","kat":4,"menge":12,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Regal D, Fach 1"},
   {"name":"Kinderbücher","kat":5,"menge":80,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Regal E, Fach 1 und 2"},
   {"name":"Koran-Ständer","kat":5,"menge":6,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Regal E, Fach 3"},
   {"name":"Malbücher","kat":5,"menge":60,"einheit":"Stk","mindest":15,"art":"verbrauch","ort":"Regal E, Fach 3"},
   {"name":"Beamer","kat":6,"menge":1,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Regal F, Fach 1"},
   {"name":"Verlängerungskabel","kat":6,"menge":10,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Regal F, Fach 2"},
   {"name":"Mikrofone","kat":6,"menge":2,"einheit":"Stk","mindest":0,"art":"ausleihe","ort":"Regal F, Fach 2"}
  ]$b$::jsonb;
  perform set_config('magazino.demo_bestand', v_bestand::text, false);

  v_a := pg_temp.lager_bauen(v_admin, 'Lager Klein (10 x 10 m)', 'Demo mit erfundenen Massen', 1000, 1000, 2, 3,
         '[{"name":"Packtisch","x":420,"y":640,"b":240,"t":90,"h":80},{"name":"Fußballtor klappbar (aufgeklappt)","x":60,"y":820,"b":300,"t":40,"h":200}]'::jsonb);
  v_b := pg_temp.lager_bauen(v_admin, 'Lager Groß (20 x 20 m)', 'Demo mit erfundenen Massen', 2000, 2000, 3, 5,
         '[{"name":"Verkaufstisch","x":300,"y":1500,"b":300,"t":90,"h":80},{"name":"Packtisch","x":900,"y":1500,"b":240,"t":90,"h":80},{"name":"Pavillon 3 x 3 (zusammengeklappt)","x":1500,"y":1500,"b":300,"t":40,"h":120},{"name":"Fußballtor klappbar (aufgeklappt)","x":120,"y":1800,"b":300,"t":40,"h":200}]'::jsonb);
  raise notice '%', v_a;
  raise notice '%', v_b;
  perform set_config('magazino.demo_bericht', v_a || ' | ' || v_b, false);
end $demo$;
