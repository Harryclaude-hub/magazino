import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, Clock, Crosshair, Eye, Flower2, Footprints, Hand, Layers, ChevronUp, Lightbulb, LightbulbOff, Map as KarteIcon, Maximize2, Mic, MicOff, Minimize2, Moon, Rotate3d, SlidersHorizontal, Square, Sun, Users, X } from 'lucide-react'
import { displayNameOf, useAuth } from '../../lib/auth'
import { standardLook } from '../../lib/avatar'
import { wohnungBeitreten, type WohnungVerbindung } from '../../lib/anwesenheit'
import { useSprache } from '../../lib/i18n'
import { Sprechen, type SprechZustand } from '../../lib/sprechen'
import type { GrundrissDaten } from '../../lib/types'
import { cx } from '../../lib/util'
import { useProjektOptional } from '../../pages/ProjectLayout'
import { Button, useToast } from '../ui'
import { flaecheQm, innenPunkt, raumTitel } from '../plan/hilfe'
import { baueUmgebung } from './aussen3d'
import { baueFigur } from './avatar3d'
import KistenKarte from './KistenKarte'
import { motorStarten, type Blick, type Figur3D, type Haltung, type Motor, type Pose3D, type Treffer3D } from './motor'
import { Knueppel } from './Knueppel'
import { farbenLesen } from './farben3d'
import { baueSzene, hervorMitte, lichter, type Farben3D } from './szene'
import { umgebungAus } from './umgebungRahmen'

/* Die 3D-Ansicht am Computer (START 5.5, BAUPLAN 5.4).
 *
 * Eigener Code-Teil samt three: geladen nur ueber oeffnen.tsx mit
 * lazy(), erst wenn jemand "3D" oeffnet. Am Handy dreht ein Finger, zwei
 * Finger verschieben und zoomen (OrbitControls).
 *
 * Massstab 1 = 1 m. Boden, Waende in Raumhoehe (Wandfarbe je Kante,
 * sonst --plan-wand-3d, Kopf in --plan-wand), Tueren orange, Fenster
 * blau, Moebel, Regale mit Brettern, Kisten in echter Groesse; die
 * gesuchte Kiste rot, die anderen gedaempft (szene.ts). Kamera drehen,
 * zoomen, verschieben; Waende, die zwischen Kamera und Raum stehen, werden
 * halbdurchsichtig.
 *
 * Begehen: in Augenhoehe durch die Wohnung (W A S D oder Pfeiltasten,
 * ziehen schaut umher, am Handy der Knueppel). Waende halten auf, Tueren
 * und Durchgaenge sind offen. Esc oder der Knopf beendet es.
 *
 * E82: Beim Begehen setzt man sich hin oder legt sich hin (Antippen),
 * hebt kleine Dinge auf, schaltet Fernseher und Wasser, schliesst Tueren
 * ab. Eine angetippte Kiste zeigt ihre Karte mit Zurueck zur Begehung.
 * Wer im selben Umzug gerade auch durch die Wohnung geht, erscheint als
 * Figur, und mit Mikrofon hoert man sich, lauter, je naeher man steht.
 * Draussen gibt es eine ruhige Umgebung (aussen3d.ts).
 *
 * Die Farben kommen aus den Tokens (getComputedStyle) und werden bei
 * Hell/Dunkel neu gelesen. Ohne WebGL steht ein Hinweis da, 2D bleibt.
 */

export interface Raum3DProps {
  daten: GrundrissDaten
  /** Nur diesen Raum zeigen (Kistenseite, Suche). */
  raumId?: string | null
  /** Item-Id der gesuchten oder gewaehlten Kiste (oder eines Moebels). */
  hervor?: string | null
  /** Knopf "3D schliessen" in der Leiste. */
  onSchliessen?: () => void
  /** Moebel, Regal oder Schrank wurde um dx, dy cm gezogen (nur im
   *  Zeichner). Ohne diese Angabe laesst sich nichts ziehen. */
  onObjektZiehen?: (id: string, dxCm: number, dyCm: number) => void
  /** Kurzer Klick in die Szene (nicht auf eine Tuer), Stelle im Plan in
   *  cm: der Zeichner stellt dort eine Kiste oder ein Moebel hin. */
  onTippen?: (xCm: number, yCm: number, treffer: Treffer3D | null) => void
  /** Gewaehltes Moebel (Objekt-Id): leuchtet in 3D auf. */
  markiert?: string | null
  className?: string
}


/** Wo das Begehen anfaengt: im gezeigten Raum, sonst im groessten Raum
 *  innen (meist Wohnzimmer oder Wohnkueche). Punkt im Plan in cm. */
function startPunkt(daten: GrundrissDaten, raumId: string | null): [number, number] | null {
  const kandidaten = raumId ? daten.raeume.filter((r) => r.id === raumId) : daten.raeume.filter((r) => r.art === 'innen')
  let best: (typeof daten.raeume)[number] | null = null
  for (const r of kandidaten) if (!best || flaecheQm(r.punkte) > flaecheQm(best.punkte)) best = r
  return best ? innenPunkt(best.punkte) : null
}

/** Eine ruhige Farbe je Person, fest aus der Kennung. */
function farbeFuer(uid: string): string {
  const farben = ['#4f6d8f', '#7a5c8e', '#4f8a6e', '#a0663f', '#8a4f5c', '#5c7a8a']
  let h = 0
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0
  return farben[h % farben.length]
}

/** Kiste -> Objekt, auf oder in dem ihr Stapel steht (ueber Kisten hinweg). */
function traegerKarte(daten: GrundrissDaten): Map<string, string> {
  const nachId = new Map(daten.kisten.map((k) => [k.id, k]))
  const out = new Map<string, string>()
  for (const k of daten.kisten) {
    let jetzt = nachId.get(k.id)
    for (let i = 0; jetzt && i < 50; i++) {
      if ((jetzt.unterlage_art === 'objekt' || jetzt.unterlage_art === 'fach') && jetzt.unterlage_objekt_id) {
        out.set(k.id, jetzt.unterlage_objekt_id)
        break
      }
      if (jetzt.unterlage_art !== 'kiste' || !jetzt.unterlage_item_id) break
      jetzt = nachId.get(jetzt.unterlage_item_id)
    }
  }
  return out
}

export default function Raum3D({ daten, raumId = null, hervor = null, markiert = null, onSchliessen, onObjektZiehen, onTippen, className }: Raum3DProps) {
  const { t } = useSprache()
  const nav = useNavigate()
  const toast = useToast()
  const { user, profile } = useAuth()
  const projekt = useProjektOptional()
  const host = useRef<HTMLDivElement>(null)
  const motor = useRef<Motor | null>(null)
  const [geht, setGeht] = useState<'pruefen' | 'ja' | 'nein'>('pruefen')
  const [farben, setFarben] = useState<Farben3D>(farbenLesen)
  const [halb, setHalb] = useState(true)
  // Drehen (Standard) oder Hand (verschieben, Moebel greifen) fuer die linke
  // Maustaste; das Geraet merkt es sich. Neuer Schluessel, damit alle mit
  // Drehen anfangen.
  const [hand, setHand] = useState(() => {
    try {
      return localStorage.getItem('kistly.3d.hand') === '1'
    } catch {
      return false
    }
  })
  const handSetzen = (an: boolean) => {
    setHand(an)
    try {
      if (an) localStorage.setItem('kistly.3d.hand', '1')
      else localStorage.removeItem('kistly.3d.hand')
    } catch {
      /* ohne Speicher gilt es bis zum Neuladen */
    }
  }
  const ausgerichtet = useRef<string | null>(null)
  const [gehen, setGehen] = useState(false)
  // Vollbild (E76): die Ansicht fuellt den ganzen Bildschirm, am Handy auch
  // quer. Mit der Fullscreen-Schnittstelle, wo es sie gibt (Android, Computer);
  // sonst (iPhone) deckt sie die Seite als feste Ebene ab.
  const wurzel = useRef<HTMLDivElement>(null)
  const [vollbild, setVollbild] = useState(false)
  // Leiste einklappen (E78): dann bleibt nur ein kleiner Knopf zum Aufklappen.
  const [leisteZu, setLeisteZu] = useState(false)
  const vollbildUmschalten = () => {
    if (!vollbild) {
      setVollbild(true)
      const el = wurzel.current
      if (el && typeof el.requestFullscreen === 'function') void el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
    } else {
      setVollbild(false)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }
  useEffect(() => {
    // Mit der Zurueck-Geste oder Esc beendet: dann auch hier aus.
    const weg = () => {
      if (!document.fullscreenElement) setVollbild(false)
    }
    document.addEventListener('fullscreenchange', weg)
    return () => document.removeEventListener('fullscreenchange', weg)
  }, [])

  // Licht (E71): Automatisch nach Uhrzeit (7 bis 19 Uhr Tag), oder fest.
  const [licht, setLicht] = useState<'auto' | 'tag' | 'abend'>('auto')
  const [stunde, setStunde] = useState(() => new Date().getHours())
  useEffect(() => {
    const uhr = window.setInterval(() => setStunde(new Date().getHours()), 60_000)
    return () => window.clearInterval(uhr)
  }, [])
  const lichtJetzt: 'tag' | 'abend' = licht === 'auto' ? (stunde >= 7 && stunde < 19 ? 'tag' : 'abend') : licht
  // Licht je Raum (E74): ohne eigene Wahl folgt es Tag (aus) und Abend (an).
  // Ein Klick auf einen Schalter an der Wand oder in der Liste schaltet um.
  const [raumLicht, setRaumLicht] = useState<Record<string, boolean>>({})
  const [lichtListeAuf, setLichtListeAuf] = useState(false)
  const [teppiche, setTeppiche] = useState(true)
  // Deko und Spielzeug (E82): eigene Ebene wie die Teppiche.
  const [deko, setDeko] = useState(true)
  // Karte einer angetippten Kiste und die Kiste, die offen gezeigt wird (E82).
  const [karte, setKarte] = useState<string | null>(null)
  const [offeneKiste, setOffeneKiste] = useState<string | null>(null)
  // Beim Begehen: stehen, sitzen, liegen; und was man in der Hand haelt.
  const [haltung, setHaltung] = useState<Haltung>('stehen')
  const [inHand, setInHand] = useState<string | null>(null)
  const lichtRaeumeListe = useMemo(
    () => daten.raeume.filter((r) => r.punkte.length >= 3 && (!raumId || r.id === raumId)),
    [daten.raeume, raumId],
  )
  const raumAn = (id: string) => raumLicht[id] ?? lichtJetzt === 'abend'
  const lichtAnSet = useMemo(
    () => new Set(lichtRaeumeListe.filter((r) => raumLicht[r.id] ?? lichtJetzt === 'abend').map((r) => r.id)),
    [lichtRaeumeListe, raumLicht, lichtJetzt],
  )
  const lichtJetztRef = useRef(lichtJetzt)
  useLayoutEffect(() => {
    lichtJetztRef.current = lichtJetzt
  })

  // Hell/Dunkel: die Klasse an <html> wechselt, die Tokens auch.
  useEffect(() => {
    const beob = new MutationObserver(() => setFarben(farbenLesen()))
    beob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => beob.disconnect()
  }, [])

  useEffect(() => {
    const el = host.current
    if (!el) return
    const m = motorStarten(el)
    motor.current = m
    setGeht(m ? 'ja' : 'nein')
    return () => {
      m?.dispose()
      motor.current = null
      ausgerichtet.current = null
    }
  }, [])

  const koerper = useMemo(
    () => baueSzene(daten, farben, { raumId, hervor, markiert, teppiche, deko, offeneKiste }),
    [daten, farben, raumId, hervor, markiert, teppiche, deko, offeneKiste],
  )
  const hatKiste = useMemo(() => hervorMitte(koerper) !== null, [koerper])
  const leer = koerper.length === 0

  useEffect(() => {
    const m = motor.current
    if (!m || geht !== 'ja') return
    // Die Kamera nur beim ersten Bild und bei einem anderen Raum neu setzen,
    // sonst bleibt sie, wo man sie hingedreht hat (Zeichner aendert live).
    const schluessel = `${daten.grundriss.id}|${raumId ?? ''}`
    const neu = ausgerichtet.current !== schluessel && koerper.length > 0
    m.setzen(koerper, farben.grund, neu)
    if (neu) ausgerichtet.current = schluessel
  }, [koerper, farben.grund, geht, daten.grundriss.id, raumId])

  useEffect(() => {
    motor.current?.waendeHalb(halb)
  }, [halb, geht])

  const lichtListe = useMemo(() => lichter(daten, raumId), [daten, raumId])
  useEffect(() => {
    motor.current?.lichter(lichtListe)
  }, [lichtListe, geht])
  useEffect(() => {
    motor.current?.lichtModus(lichtJetzt)
  }, [lichtJetzt, geht])
  useEffect(() => {
    motor.current?.lichtRaeume(lichtAnSet)
  }, [lichtAnSet, geht])
  useEffect(() => {
    motor.current?.schalter((id) =>
      setRaumLicht((vorher) => ({ ...vorher, [id]: !(vorher[id] ?? lichtJetztRef.current === 'abend') })),
    )
  }, [geht])

  useEffect(() => {
    motor.current?.hand(hand)
  }, [hand, geht])

  // Der Rueckruf liegt in einer Ref, damit ein neuer Wert den Motor nicht neu anmeldet.
  const ziehRueck = useRef(onObjektZiehen)
  useLayoutEffect(() => {
    ziehRueck.current = onObjektZiehen
  })
  const kannZiehen = Boolean(onObjektZiehen)
  // Klicken zum Hinstellen: der Rueckruf in einer Ref wie beim Ziehen.
  const tippRueck = useRef(onTippen)
  useLayoutEffect(() => {
    tippRueck.current = onTippen
  })
  // Eine Kiste zeigt beim Begehen immer ihre Karte (E82), in der
  // Drehansicht nur dort, wo niemand sonst den Klick braucht (nicht im
  // Zeichner, der damit auswaehlt und hinstellt).
  const gehenRef = useRef(gehen)
  useLayoutEffect(() => {
    gehenRef.current = gehen
  })
  useEffect(() => {
    motor.current?.tippen((x, y, tr) => {
      if (tr?.kiste && (gehenRef.current || !tippRueck.current)) {
        setKarte(tr.kiste)
        return
      }
      tippRueck.current?.(x, y, tr)
    })
  }, [geht])
  // Solange die Karte offen ist, ruhen Gehen und Umschauen.
  useEffect(() => {
    motor.current?.eingabe(karte === null)
  }, [karte, geht])
  useEffect(() => {
    const m = motor.current
    if (!m) return
    m.haltung(setHaltung)
    m.inHand(setInHand)
    return () => {
      m.haltung(null)
      m.inHand(null)
    }
  }, [geht])
  // Spiegel spiegeln echt, solange man geht (kostet Rechenzeit).
  useEffect(() => {
    motor.current?.spiegel(gehen)
  }, [gehen, geht])

  // Draussen (E82): Himmel, Wiese, Weg, Baeume, Nachbarhaeuser. Nur fuer die
  // ganze Wohnung, nicht beim Blick in einen einzelnen Raum.
  const umgebung = useMemo(
    () => (raumId ? null : umgebungAus({ raeume: daten.raeume, oeffnungen: daten.oeffnungen })),
    [daten.raeume, daten.oeffnungen, raumId],
  )
  useEffect(() => {
    const m = motor.current
    if (!m || geht !== 'ja' || !umgebung) return
    let welt: ReturnType<typeof baueUmgebung>
    try {
      welt = baueUmgebung({ rahmen: umgebung.rahmen, frei: umgebung.frei, farben, stockwerkHoehe: 0 })
    } catch (err) {
      // Ohne Aussenwelt geht die Wohnung weiter; der Fehler wird gezeigt.
      console.warn('[3d] Aussenwelt:', err)
      return
    }
    m.umgebung({ gruppe: welt.gruppe, nebel: welt.nebel, himmel: welt.himmel })
    return () => {
      m.umgebung(null)
      welt.dispose()
    }
  }, [umgebung, farben, geht])
  /** Bedienung mit Fingern (Handy, Tablet): anderer Hinweis. */
  const beruehren = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  const traeger = useMemo(() => traegerKarte(daten), [daten])
  useEffect(() => {
    motor.current?.ziehen(kannZiehen ? (id, dx, dy) => ziehRueck.current?.(id, dx, dy) : null, traeger)
  }, [kannZiehen, traeger, geht])

  const blick = (b: Blick) => {
    setGehen(false)
    motor.current?.blick(b)
  }

  // Begehen an und aus; der Motor merkt sich die Kamera von vorher.
  useEffect(() => {
    if (geht !== 'ja') return
    motor.current?.begehen(gehen, gehen ? startPunkt(daten, raumId) : null)
    // Nur beim Umschalten, nicht bei jeder Aenderung am Plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gehen, geht])

  // Esc der Reihe nach (E82): erst die Kistenkarte, dann aufstehen, dann
  // das Begehen beenden, dann das Vollbild; erst danach schliesst 3D.
  const escLage = useRef({ karte, haltung, gehen, vollbild })
  useLayoutEffect(() => {
    escLage.current = { karte, haltung, gehen, vollbild }
  })
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const z = escLage.current
      if (z.karte) setKarte(null)
      else if (z.gehen && z.haltung !== 'stehen') motor.current?.aufstehen()
      else if (z.gehen) setGehen(false)
      else if (z.vollbild) setVollbild(false)
      else return
      e.stopPropagation()
      e.preventDefault()
    }
    window.addEventListener('keydown', taste, true)
    return () => window.removeEventListener('keydown', taste, true)
  }, [])

  // ------------------------------------------------ Mitspieler und Sprechen
  // Nur beim Begehen und nur im eigenen Umzug: wer gleichzeitig geht, sieht
  // die anderen als Figur; Ton nur mit eingeschaltetem Mikrofon (E82).
  const uid = user?.id ?? null
  const projectId = daten.grundriss.project_id
  const live = gehen && geht === 'ja' && !!uid && !!projekt && projekt.project.id === projectId
  const mitgliederRef = useRef(projekt?.members ?? [])
  useLayoutEffect(() => {
    mitgliederRef.current = projekt?.members ?? []
  })
  const [leuteDa, setLeuteDa] = useState<string[]>([])
  const [sprech, setSprech] = useState<SprechZustand | null>(null)
  const sprechenRef = useRef<Sprechen | null>(null)
  const figuren = useRef(new Map<string, Figur3D>())
  useEffect(() => {
    const m = motor.current
    if (!live || !m || !uid) return
    const grundrissId = daten.grundriss.id
    const figurenKarte = figuren.current
    const eigene = { p: null as Pose3D | null }
    const fremde = new Map<string, Pose3D>()
    const abstand = (a: Pose3D, b: Pose3D) => Math.hypot(a.x - b.x, a.z - b.z)
    let verbindung: WohnungVerbindung | null = null
    const sprechen = new Sprechen({ signal: (an, d) => verbindung?.signal(an, d) }, uid)
    sprechen.on('zustand', setSprech)
    sprechenRef.current = sprechen
    const figurenSetzen = (uids: string[]) => {
      const karte = figurenKarte
      for (const u of [...karte.keys()]) if (!uids.includes(u)) karte.delete(u)
      for (const u of uids) {
        if (karte.has(u)) continue
        const mit = mitgliederRef.current.find((x) => x.user_id === u)
        const prof = mit?.profile ?? null
        karte.set(u, baueFigur(prof?.avatar3d ?? standardLook(u), displayNameOf(prof, '?'), farbeFuer(u)))
      }
      // Der Motor gibt Figuren frei, die nicht mehr in der Liste stehen.
      m.leute([...karte].map(([u, figur]) => ({ uid: u, figur })))
    }
    verbindung = wohnungBeitreten({
      projectId,
      grundrissId,
      uid,
      onWer: (leute) => {
        const hier = leute.filter((l) => l.grundrissId === grundrissId).map((l) => l.uid)
        // Synchron, damit fruehe Signale nicht verloren gehen (sprechen.ts).
        sprechen.leute(hier)
        for (const u of [...fremde.keys()]) if (!hier.includes(u)) fremde.delete(u)
        figurenSetzen(hier)
        setLeuteDa(hier)
      },
      onPose: (u, p) => {
        fremde.set(u, p)
        motor.current?.leutePose(u, p)
        if (eigene.p) sprechen.lautstaerke(u, abstand(eigene.p, p))
      },
      onSignal: (von, d) => sprechen.empfangen(von, d),
      onFehler: (text) => toast(text, 'error'),
    })
    m.eigenePose((p) => {
      eigene.p = p
      verbindung?.pose(p)
      for (const [u, q] of fremde) sprechen.lautstaerke(u, abstand(p, q))
    })
    return () => {
      m.eigenePose(null)
      sprechen.beenden()
      verbindung?.verlassen()
      sprechenRef.current = null
      figurenKarte.clear()
      m.leute([])
      setSprech(null)
      setLeuteDa([])
    }
    // toast ist stabil genug; ein neuer Wert soll die Verbindung nicht neu aufbauen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, uid, projectId, daten.grundriss.id])

  // Die eigene Figur, nur im Spiegel zu sehen (E82).
  useEffect(() => {
    const m = motor.current
    if (!m || !gehen || geht !== 'ja') return
    const figur = baueFigur(profile?.avatar3d ?? (uid ? standardLook(uid) : null), '', uid ? farbeFuer(uid) : '#4f6d8f')
    m.ich(figur)
    return () => {
      m.ich(null)
      figur.dispose()
    }
  }, [gehen, geht, uid, profile])

  const karteKiste = karte ? (daten.kisten.find((k) => k.id === karte) ?? null) : null
  const karteRaum = karteKiste?.platz_raum_id ? daten.raeume.find((r) => r.id === karteKiste.platz_raum_id) : null

  return (
    <div
      ref={wurzel}
      className={cx(
        // plan3d-flaeche: langes Druecken markiert nichts und oeffnet kein
        // Menue (E81, am iPhone wurde beim Gehen die ganze Seite blau).
        'plan3d-flaeche flex min-h-0 flex-col overflow-hidden bg-paper',
        vollbild ? 'fixed inset-0 z-[70]' : 'relative h-full',
        className && !vollbild ? className : null,
      )}
    >
      {/* Knopfleiste. Am Handy nur Zeichen, gleich gross, in genau zwei
          Reihen (E78): oben Ansicht und Bewegen, unten Licht und Anzeige.
          Ab sm eine Reihe mit Namen. Sie beginnt unter der Statusleiste des
          Handys (safe-area), im Vollbild liegt sie halbdurchsichtig ueber
          dem Bild, und sie laesst sich einklappen. */}
      {leisteZu ? null : (
      <div
        className={cx(
          // Hochkant zwei Reihen, quer (ab md) eine Reihe nur mit Zeichen, ab lg mit Namen.
          // Abstand zur Kamera-Aussparung oben und, quer gehalten, links und rechts.
          'flex flex-col items-center gap-1 pb-2 pe-[calc(env(safe-area-inset-right,0px)+0.5rem)] ps-[calc(env(safe-area-inset-left,0px)+0.5rem)] pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] md:flex-row md:flex-wrap md:justify-center md:gap-1.5 lg:justify-start lg:gap-2 lg:pt-2',
          vollbild ? 'absolute inset-x-0 top-0 z-20 bg-surface/85 backdrop-blur' : 'border-b border-line bg-surface',
        )}
      >
        <div className="flex items-center justify-center gap-1 md:contents">
          <Knopf zeichen={KarteIcon} name={t('plan3d.ansicht_oben')} onClick={() => blick('oben')} disabled={geht !== 'ja' || leer} />
          <Knopf zeichen={Eye} name={t('plan3d.ansicht_schraeg')} onClick={() => blick('schraeg')} disabled={geht !== 'ja' || leer} />
          {hatKiste ? (
            <Knopf zeichen={Crosshair} farbe="var(--plan-hervor)" name={t('plan3d.zur_kiste')} onClick={() => blick('kiste')} disabled={geht !== 'ja'} />
          ) : null}
          <Knopf
            zeichen={Footprints}
            name={t(gehen ? 'plan3d.begehen_ende' : 'plan3d.begehen')}
            hilfe={t('plan3d.begehen_hilfe')}
            an={gehen}
            onClick={() => setGehen((v) => !v)}
            disabled={geht !== 'ja' || leer}
          />
          <div className={cx('flex rounded-xl border-2 border-line p-0.5', gehen && 'pointer-events-none opacity-40')} role="group" aria-label={t('plan3d.modus')}>
            <Teil zeichen={Hand} name={t('plan3d.hand')} hilfe={t('plan3d.hand_hilfe')} an={hand} onClick={() => handSetzen(true)} />
            <Teil zeichen={Rotate3d} name={t('plan3d.drehen')} hilfe={t('plan3d.drehen_hilfe')} an={!hand} onClick={() => handSetzen(false)} />
          </div>
          <Knopf
            zeichen={vollbild ? Minimize2 : Maximize2}
            name={t(vollbild ? 'plan3d.vollbild_ende' : 'plan3d.vollbild')}
            an={vollbild}
            onClick={vollbildUmschalten}
          />
        </div>
        <div className="flex items-center justify-center gap-1 md:contents">
          <div className="flex rounded-xl border-2 border-line p-0.5" role="group" aria-label={t('plan3d.licht')}>
            {(
              [
                ['tag', Sun, 'plan3d.licht_tag'],
                ['abend', Moon, 'plan3d.licht_abend'],
                ['auto', Clock, 'plan3d.licht_auto'],
              ] as const
            ).map(([wert, Zeichen, schluessel]) => (
              <Teil
                key={wert}
                zeichen={Zeichen}
                name={t(schluessel)}
                an={licht === wert}
                onClick={() => {
                  // Tag, Abend oder Automatisch gilt wieder fuer alle Raeume.
                  setLicht(wert)
                  setRaumLicht({})
                }}
              />
            ))}
          </div>
          <Knopf
            zeichen={Lightbulb}
            name={t('plan3d.licht_raeume')}
            hilfe={t('plan3d.licht_schalter_hilfe')}
            an={lichtListeAuf}
            aufklapp
            onClick={() => setLichtListeAuf((v) => !v)}
            disabled={geht !== 'ja' || leer}
          />
          <Knopf zeichen={Layers} name={t('plan3d.waende_halb')} an={halb} onClick={() => setHalb((v) => !v)} disabled={geht !== 'ja'} />
          <Knopf zeichen={Square} name={t('plan3d.teppiche')} an={teppiche} onClick={() => setTeppiche((v) => !v)} disabled={geht !== 'ja'} />
          <Knopf zeichen={Flower2} name={t('plan3d.deko')} an={deko} onClick={() => setDeko((v) => !v)} disabled={geht !== 'ja'} />
          <p className="t-sub hidden min-w-0 flex-1 truncate px-1 lg:block">
            {geht !== 'ja'
              ? null
              : gehen
                ? t(beruehren ? 'plan3d.begehen_bedienung_handy' : 'plan3d.begehen_bedienung')
                : t(`${beruehren ? 'plan3d.bedienung_handy' : kannZiehen ? 'plan3d.bedienung_ziehen' : 'plan3d.bedienung'}${hand ? '_hand' : ''}`)}
          </p>
          <Knopf zeichen={ChevronUp} name={t('plan3d.leiste_zu')} onClick={() => setLeisteZu(true)} />
          {onSchliessen && !vollbild ? <Knopf zeichen={X} name={t('plan3d.schliessen')} onClick={onSchliessen} /> : null}
        </div>
      </div>
      )}
      {/* Plaene werden nie gespiegelt, auch nicht im Arabischen. */}
      <div dir="ltr" className="relative min-h-0 flex-1" style={{ background: 'var(--plan-grund)' }}>
        <div
          ref={host}
          className={cx('absolute inset-0', geht === 'nein' && 'hidden')}
          role="img"
          aria-label={t('plan3d.leinwand')}
        />
        {leisteZu ? (
          <div className="absolute start-[calc(env(safe-area-inset-left,0px)+0.5rem)] top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-30 flex gap-1">
            <Knopf zeichen={SlidersHorizontal} name={t('plan3d.leiste_auf')} onClick={() => setLeisteZu(false)} />
            {onSchliessen && !vollbild ? <Knopf zeichen={X} name={t('plan3d.schliessen')} onClick={onSchliessen} /> : null}
          </div>
        ) : null}
        {geht === 'ja' && lichtListeAuf && !leer ? (
          // Licht je Raum: an, aus, alle. Auch ein Klick auf einen Schalter an der Wand schaltet.
          <div
            dir="auto"
            className={cx(
              'absolute end-3 z-30 w-64 max-w-[calc(100%-1.5rem)] rounded-2xl border border-line bg-surface/95 p-2 shadow-lg',
              vollbild && !leisteZu ? 'top-28 md:top-16' : 'top-3',
            )}
          >
            <p className="t-sub px-1 pb-1">{t('plan3d.licht_schalter_hilfe')}</p>
            <div className="flex flex-wrap gap-1 pb-1">
              <Button size="sm" variant="outline" onClick={() => setRaumLicht(Object.fromEntries(lichtRaeumeListe.map((r) => [r.id, true])))}>
                {t('plan3d.licht_alle_an')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRaumLicht(Object.fromEntries(lichtRaeumeListe.map((r) => [r.id, false])))}>
                {t('plan3d.licht_alle_aus')}
              </Button>
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {lichtRaeumeListe.map((r) => {
                const an = raumAn(r.id)
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-pressed={an}
                      onClick={() => setRaumLicht((vorher) => ({ ...vorher, [r.id]: !an }))}
                      className={cx('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm font-bold hover:bg-raised', an ? 'text-ink' : 'text-muted')}
                    >
                      {an ? <Lightbulb size={16} style={{ color: 'var(--plan-strom)' }} /> : <LightbulbOff size={16} />}
                      <span className="min-w-0 flex-1 truncate">{raumTitel(r)}</span>
                      <span className="t-sub">{t(an ? 'plan3d.licht_an' : 'plan3d.licht_aus')}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
        {geht === 'nein' ? (
          <div dir="auto" className="absolute inset-0 flex items-center justify-center p-6">
            <p className="max-w-md rounded-2xl border border-line bg-surface p-4 text-center font-bold text-ink" role="status">
              {t('plan3d.geht_nicht')}
            </p>
          </div>
        ) : geht === 'ja' && gehen && !karte ? (
          <>
            {/* Gehen per Steuerknueppel (E81): schieben, loslassen bleibt stehen. */}
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] start-[calc(env(safe-area-inset-left,0px)+1rem)]">
              <Knueppel name={t('plan3d.knueppel')} onLage={(x, y) => motor.current?.gehenStick(x, y)} />
            </div>
            {/* Rechts unten (E82): aufstehen, ablegen, Mikrofon, wer da ist. */}
            <div dir="auto" className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] end-[calc(env(safe-area-inset-right,0px)+1rem)] flex max-w-[60%] flex-col items-end gap-2">
              {sprech?.tonGesperrt && leuteDa.length > 0 ? (
                <p className="rounded-xl border border-line bg-surface/95 px-3 py-2 text-sm font-bold text-ink shadow">{t('plan3d.ton_tippen')}</p>
              ) : null}
              {sprech?.fehler ? (
                <p className="rounded-xl border border-danger bg-surface/95 px-3 py-2 text-sm font-bold text-danger shadow" role="alert">{sprech.fehler}</p>
              ) : null}
              {haltung !== 'stehen' ? (
                <Button size="sm" onClick={() => motor.current?.aufstehen()}>
                  <ArrowUpFromLine size={17} /> {t('plan3d.aufstehen')}
                </Button>
              ) : null}
              {inHand ? (
                <Button size="sm" onClick={() => motor.current?.ablegen()}>
                  <ArrowDownToLine size={17} /> {t('plan3d.ablegen')}
                </Button>
              ) : null}
              {live ? (
                <div className="flex items-center gap-1.5">
                  <span
                    className="flex h-10 items-center gap-1 rounded-knopf border-2 border-line bg-surface/95 px-2.5 text-sm font-bold text-ink shadow"
                    title={t('plan3d.leute_da', { n: leuteDa.length })}
                    aria-label={t('plan3d.leute_da', { n: leuteDa.length })}
                  >
                    <Users size={16} /> <span className="t-serial">{leuteDa.length}</span>
                  </span>
                  <Button
                    size="sm"
                    variant={sprech?.mikrofon ? 'aktiv' : 'outline'}
                    aria-pressed={!!sprech?.mikrofon}
                    aria-label={t(sprech?.mikrofon ? 'plan3d.mikro_aus' : 'plan3d.mikro_an')}
                    title={t('plan3d.mikro_hilfe')}
                    // Direkt im Klick: der Browser gibt nur so Mikrofon und Ton frei.
                    onClick={() => void sprechenRef.current?.mikrofon(!sprech?.mikrofon)}
                    className="h-10 w-10 justify-center px-0"
                  >
                    {sprech?.mikrofon ? <Mic size={18} /> : <MicOff size={18} />}
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        ) : geht === 'ja' && leer ? (
          <div dir="auto" className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
            <p className="rounded-xl border border-line bg-surface px-3 py-2 text-muted">{t('plan3d.leer')}</p>
          </div>
        ) : null}
        {karteKiste ? (
          // Karte der angetippten Kiste (E82): im 3D-Behaelter, damit sie auch
          // im Vollbild zu sehen ist. Zurueck fuehrt in die Begehung.
          <div className={cx('absolute inset-x-0 bottom-0 z-40', vollbild && !leisteZu ? 'top-28 md:top-16' : 'top-0')}>
            <KistenKarte
              kiste={karteKiste}
              raumName={karteRaum ? raumTitel(karteRaum) : null}
              projectId={projectId}
              offen={offeneKiste === karteKiste.id}
              begehen={gehen}
              onOeffnen={() => setOffeneKiste((v) => (v === karteKiste.id ? null : karteKiste.id))}
              onZurueck={() => setKarte(null)}
              onGanzOeffnen={(pfad) => {
                setKarte(null)
                if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
                onSchliessen?.()
                nav(pfad)
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Ein Knopf der 3D-Leiste: am Handy nur das Zeichen (Name als Hilfe und
 *  fuer Vorleser), ab sm mit Namen. an: gedrueckt (dunkel). */
function Knopf({
  zeichen: Zeichen,
  name,
  hilfe,
  an,
  aufklapp,
  farbe,
  onClick,
  disabled,
}: {
  zeichen: typeof Sun
  name: string
  hilfe?: string
  an?: boolean
  aufklapp?: boolean
  farbe?: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      size="sm"
      variant={an ? 'aktiv' : 'outline'}
      aria-pressed={an === undefined ? undefined : an}
      aria-expanded={aufklapp ? an : undefined}
      aria-label={name}
      title={hilfe ?? name}
      onClick={onClick}
      disabled={disabled}
      className="h-10 w-10 justify-center px-0 lg:w-auto lg:min-w-10 lg:px-3.5"
    >
      <Zeichen size={17} style={farbe ? { color: farbe } : undefined} />
      <span className="hidden lg:inline">{name}</span>
    </Button>
  )
}

/** Ein Teil einer Gruppe (Hand oder Drehen, Tag, Abend, Automatisch). */
function Teil({
  zeichen: Zeichen,
  name,
  hilfe,
  an,
  onClick,
}: {
  zeichen: typeof Sun
  name: string
  hilfe?: string
  an: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={an}
      aria-label={name}
      onClick={onClick}
      title={hilfe ?? name}
      className={cx(
        'flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 text-sm font-bold leading-tight lg:px-2',
        an ? 'bg-ink text-paper' : 'text-ink hover:bg-raised',
      )}
    >
      <Zeichen size={15} /> <span className="hidden lg:inline">{name}</span>
    </button>
  )
}
