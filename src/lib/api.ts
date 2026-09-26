/* Alle Datenbankzugriffe von Kistly.
 * Die Seiten rufen nur diese Funktionen auf. So gibt es genau eine Stelle,
 * an der eine Abfrage steht, und keine zweite Fassung, die spaeter
 * auseinanderlaeuft.
 */
import { supabase, errText } from './supabase'
import { tg } from './i18n'
import { zuPunkten, zuUmriss } from './geometrie'
import type {
  Call,
  CallParticipant,
  EigeneGroesse,
  Grundriss,
  GrundrissAenderung,
  GrundrissDaten,
  GroessenFolgen,
  Item,
  ItemContent,
  ItemEvent,
  ItemPhoto,
  ItemStatus,
  KisteLage,
  KistenGroesse,
  MemberRole,
  Message,
  Objekt,
  PlanKiste,
  PlanLinie,
  MessageLink,
  MessageReaction,
  NotificationPrefs,
  Profile,
  Project,
  ProjectInvite,
  ProjectMember,
  ProjectStats,
  Platz,
  Raum,
  RaumEintrag,
  SuchTreffer,
  Tag,
} from './types'
import { inviteCode } from './util'

/** Wirft mit lesbarer Meldung, statt still null zurueckzugeben.
 *  Der Schluessel zeigt auf einen Satz der Form 'Kisten laden: {grund}'. */
function unwrap<T>(res: { data: T | null; error: unknown }, key: string): T {
  if (res.error) throw new Error(tg(key, { grund: errText(res.error) }))
  if (res.data === null) throw new Error(tg(key, { grund: tg('fehler.keine_daten') }))
  return res.data
}

/* ============================================================= Projekte */

export interface ProjectWithStats {
  project: Project
  stats: ProjectStats
  role: ProjectMember['role']
  members: number
}

const EMPTY_STATS = (id: string): ProjectStats => ({
  project_id: id,
  items_total: 0,
  items_arrived: 0,
  items_transit: 0,
  items_open: 0,
})

export async function listProjects(): Promise<ProjectWithStats[]> {
  const projects = unwrap(
    await supabase.from('projects').select('*').order('created_at', { ascending: false }),
    'fehler.umzuege_laden',
  ) as Project[]
  if (projects.length === 0) return []

  const ids = projects.map((p) => p.id)
  const [statsRes, memberRes] = await Promise.all([
    supabase.from('project_stats').select('*').in('project_id', ids),
    supabase.from('project_members').select('project_id, user_id, role').in('project_id', ids),
  ])
  if (statsRes.error)
    throw new Error(tg('fehler.zaehlwerte_laden', { grund: errText(statsRes.error) }))
  if (memberRes.error)
    throw new Error(tg('fehler.mitglieder_laden', { grund: errText(memberRes.error) }))

  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  const statsById = new Map((statsRes.data as ProjectStats[]).map((s) => [s.project_id, s]))
  const rows = (memberRes.data ?? []) as Array<Pick<ProjectMember, 'project_id' | 'user_id' | 'role'>>

  return projects.map((p) => ({
    project: p,
    stats: statsById.get(p.id) ?? EMPTY_STATS(p.id),
    role: rows.find((m) => m.project_id === p.id && m.user_id === uid)?.role ?? 'viewer',
    members: rows.filter((m) => m.project_id === p.id).length,
  }))
}

export async function getProject(id: string): Promise<Project> {
  const res = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
  if (res.error) throw new Error(tg('fehler.umzug_laden', { grund: errText(res.error) }))
  if (!res.data) throw new Error(tg('fehler.umzug_fehlt'))
  return res.data as Project
}

export async function getStats(projectId: string): Promise<ProjectStats> {
  const res = await supabase
    .from('project_stats')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()
  if (res.error) throw new Error(tg('fehler.zaehlwerte_laden', { grund: errText(res.error) }))
  return (res.data as ProjectStats) ?? EMPTY_STATS(projectId)
}

export async function createProject(
  name: string,
  note?: string,
  withDefaults = true,
): Promise<Project> {
  const res = await supabase.rpc('create_project', {
    p_name: name,
    p_note: note ?? null,
    p_with_defaults: withDefaults,
  })
  return unwrap(res, 'fehler.umzug_anlegen') as Project
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const res = await supabase.from('projects').update(patch).eq('id', id).select('*').single()
  return unwrap(res, 'fehler.umzug_speichern') as Project
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(tg('fehler.umzug_loeschen', { grund: errText(error) }))
}

export async function joinProject(code: string): Promise<Project> {
  const res = await supabase.rpc('join_project', { p_code: code })
  return unwrap(res, 'fehler.beitreten') as Project
}

/* ============================================================ Mitglieder */

/* Die Profile kommen in einer zweiten Abfrage, nicht als eingebettete
 * Beziehung. project_members.user_id zeigt auf auth.users, nicht auf
 * public.profiles. PostgREST kann daraus keine Verknuepfung ableiten und
 * meldete "Could not find a relationship between project_members and
 * profiles". Zwei Abfragen sind hier der ehrlichere Weg als ein
 * zusaetzlicher Fremdschluessel nur fuer die Anzeige. */
export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  const res = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at')
  const rows = unwrap(res, 'fehler.mitglieder_laden') as ProjectMember[]
  if (rows.length === 0) return rows

  const profiles = await listProfiles(rows.map((r) => r.user_id))
  return rows.map((r) => ({ ...r, profile: profiles.get(r.user_id) ?? null }))
}

export async function setMemberRole(
  projectId: string,
  userId: string,
  role: ProjectMember['role'],
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw new Error(tg('fehler.rolle_aendern', { grund: errText(error) }))
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw new Error(tg('fehler.mitglied_entfernen', { grund: errText(error) }))
}

/** Selbst aus einem Umzug aussteigen.
 *
 *  Das ist etwas anderes als loeschen: der Umzug bleibt bestehen, nur man
 *  selbst ist nicht mehr dabei. Was man angelegt hat, bleibt auch da, denn
 *  es gehoert dem Umzug und nicht der Person.
 *
 *  Der letzte Besitzer kommt hier nicht durch, das verhindert der Trigger
 *  guard_last_owner in der Datenbank. Sonst stuende ein Umzug ohne
 *  Besitzer da, den niemand mehr verwalten koennte. */
export async function leaveProject(projectId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) throw new Error(tg('fehler.sitzung_weg'))
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', uid)
  if (error) throw new Error(tg('fehler.umzug_verlassen', { grund: errText(error) }))
}

export async function markRead(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) console.warn('[chat] Lesestand nicht gespeichert:', errText(error))
}

/* =========================================================== Einladungen */

export async function listInvites(projectId: string): Promise<ProjectInvite[]> {
  const res = await supabase
    .from('project_invites')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return unwrap(res, 'fehler.einladungen_laden') as ProjectInvite[]
}

export async function createInvite(
  projectId: string,
  role: ProjectMember['role'] = 'editor',
): Promise<ProjectInvite> {
  const { data: auth } = await supabase.auth.getUser()
  const res = await supabase
    .from('project_invites')
    .insert({
      project_id: projectId,
      code: inviteCode(),
      role,
      created_by: auth.user?.id ?? null,
    })
    .select('*')
    .single()
  return unwrap(res, 'fehler.einladung_anlegen') as ProjectInvite
}

export async function setInviteActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('project_invites').update({ active }).eq('id', id)
  if (error) throw new Error(tg('fehler.einladung_aendern', { grund: errText(error) }))
}

/* ============================================================== Bereiche */

export async function listTags(projectId: string): Promise<Tag[]> {
  const res = await supabase
    .from('tags')
    .select('*')
    .eq('project_id', projectId)
    .order('kind')
    .order('sort')
    .order('name')
  return unwrap(res, 'fehler.bereiche_laden') as Tag[]
}

export async function createTag(input: {
  project_id: string
  kind: Tag['kind']
  name: string
  short: string
  color: string
  /** Freiwilliges Zeichen neben dem Kuerzel. Siehe Migration 0010. */
  symbol?: string | null
  note?: string | null
}): Promise<Tag> {
  const res = await supabase
    .from('tags')
    .insert({ ...input, short: input.short.toUpperCase() })
    .select('*')
    .single()
  return unwrap(res, 'fehler.bereich_anlegen') as Tag
}

export async function updateTag(id: string, patch: Partial<Tag>): Promise<Tag> {
  const clean = { ...patch }
  if (clean.short) clean.short = clean.short.toUpperCase()
  const res = await supabase.from('tags').update(clean).eq('id', id).select('*').single()
  return unwrap(res, 'fehler.bereich_speichern') as Tag
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw new Error(tg('fehler.bereich_loeschen', { grund: errText(error) }))
}

export interface TagStat {
  total: number
  arrived: number
}

/** Zaehlwerte fuer alle Bereiche eines Projekts in einer Abfrage. */
export async function listTagStats(projectId: string): Promise<Map<string, TagStat>> {
  const res = await supabase.rpc('tag_stats', { p_project: projectId })
  if (res.error) throw new Error(tg('fehler.zaehlwerte_bereich', { grund: errText(res.error) }))
  const map = new Map<string, TagStat>()
  for (const row of (res.data ?? []) as Array<{ tag_id: string; total: number; arrived: number }>) {
    map.set(row.tag_id, { total: Number(row.total), arrived: Number(row.arrived) })
  }
  return map
}

/** Zwei Bereiche zusammenfuehren. Alles vom ersten haengt danach am
 *  zweiten, der erste ist weg. Die Codes vergibt die Datenbank neu, die
 *  alten bleiben ueber item_code_history scannbar.
 *  Gibt zurueck, wie viele Eintraege umgehaengt wurden. */
export async function mergeTags(von: string, nach: string): Promise<number> {
  const res = await supabase.rpc('merge_tags', { p_von: von, p_nach: nach })
  if (res.error) throw new Error(tg('fehler.bereiche_zusammenfuehren', { grund: errText(res.error) }))
  return Number(res.data ?? 0)
}

/* ================================================================ Kisten */

export interface ItemFilter {
  search?: string
  status?: ItemStatus | 'all'
  /* Eine Kennung, 'all' fuer alle, oder 'none' fuer die ohne Zuordnung.
   * 'none' macht sichtbar, was sonst stillschweigend fehlt: eine Kiste
   * ohne Zimmer findet beim Ausladen niemand wieder. */
  roomId?: string | 'all' | 'none'
  personId?: string | 'all' | 'none'
  /** Kisten oder Moebel. Moebel sind Eintraege mit kind 'furniture'. */
  kind?: Item['kind'] | 'all'
  /** Moebel aus der Kistenliste heraushalten und umgekehrt. */
  kindNot?: Item['kind']
  /** Nur Kisten ohne Platz im Grundriss (platz_raum_id is null). */
  ohnePlatz?: boolean
  /** Nur Kisten mit Platz in diesem Raum des Grundrisses. */
  platzRaumId?: string
  limit?: number
  offset?: number
  sort?: 'code' | 'newest' | 'size'
}

export interface ItemPage {
  rows: Item[]
  total: number
}

/** Immer begrenzt laden. Grosse Antworten laufen sonst in einen Fehler. */
export async function listItems(projectId: string, f: ItemFilter = {}): Promise<ItemPage> {
  const limit = f.limit ?? 100
  const offset = f.offset ?? 0
  let q = supabase
    .from('items')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .range(offset, offset + limit - 1)

  if (f.status && f.status !== 'all') q = q.eq('status', f.status)
  if (f.kind && f.kind !== 'all') q = q.eq('kind', f.kind)
  if (f.kindNot) q = q.neq('kind', f.kindNot)
  if (f.roomId === 'none') q = q.is('room_id', null)
  else if (f.roomId && f.roomId !== 'all') q = q.eq('room_id', f.roomId)
  if (f.personId === 'none') q = q.is('person_id', null)
  else if (f.personId && f.personId !== 'all') q = q.eq('person_id', f.personId)
  if (f.ohnePlatz) q = q.is('platz_raum_id', null)
  if (f.platzRaumId) q = q.eq('platz_raum_id', f.platzRaumId)
  if (f.search?.trim()) {
    const s = f.search.trim().replace(/[%,()*\\"]/g, '')
    if (s) {
      q = q.or(`code.ilike.%${s}%,title.ilike.%${s}%,note.ilike.%${s}%,target_room.ilike.%${s}%`)
    }
  }

  if (f.sort === 'newest') q = q.order('created_at', { ascending: false })
  else if (f.sort === 'size') q = q.order('size', { ascending: false }).order('code')
  else q = q.order('prefix').order('seq')

  const { data, error, count } = await q
  if (error) throw new Error(tg('fehler.kisten_laden', { grund: errText(error) }))
  return { rows: (data ?? []) as Item[], total: count ?? 0 }
}

/** Nur zaehlen, nichts laden. Die Zahl kommt aus der Datenbank und ist
 *  damit auch dann richtig, wenn die Liste daneben abgeschnitten ist. Wer
 *  aus einer begrenzten Seite zaehlt, zaehlt irgendwann falsch, ohne dass
 *  es jemand merkt. */
export async function countItems(projectId: string, f: ItemFilter = {}): Promise<number> {
  const { total } = await listItems(projectId, { ...f, limit: 1, offset: 0 })
  return total
}

export async function listAllItems(projectId: string): Promise<Item[]> {
  // Fuer Etikettenbogen und Export. Seitenweise, damit auch 2000 Kisten
  // durchlaufen statt in einen Fehler zu kippen.
  const out: Item[] = []
  const step = 500
  for (let offset = 0; ; offset += step) {
    const { rows, total } = await listItems(projectId, { limit: step, offset })
    out.push(...rows)
    if (out.length >= total || rows.length === 0) break
  }
  return out
}

export async function getItem(id: string): Promise<Item> {
  const res = await supabase.from('items').select('*').eq('id', id).maybeSingle()
  if (res.error) throw new Error(tg('fehler.kiste_laden', { grund: errText(res.error) }))
  if (!res.data) throw new Error(tg('fehler.kiste_fehlt'))
  return res.data as Item
}

export async function createItem(input: {
  project_id: string
  kind?: Item['kind']
  title?: string | null
  room_id?: string | null
  person_id?: string | null
  code_source?: Item['code_source']
  size?: number
  /* Eigene Groesse (0027). Die Stufe in der Nummer setzt dann die
   * Datenbank selbst; size wird von ihr ueberschrieben. Einen Platz
   * schickt createItem nie mit: ein abgelehnter Platz darf das Anlegen
   * nicht verhindern, Hinstellen ist ein zweiter Schritt. */
  eigene_groesse_id?: string | null
  note?: string | null
  fragile?: boolean
  target_room?: string | null
  status?: ItemStatus
  /* Nur fuer Moebel, also Eintraege mit kind 'furniture'. Sie stehen in
   * derselben Tabelle, darum stehen sie auch in derselben Funktion. */
  hersteller?: string | null
  modell?: string | null
  masse?: string | null
  zerlegt?: boolean
}): Promise<Item> {
  const res = await supabase.from('items').insert(input).select('*').single()
  return unwrap(res, 'fehler.kiste_anlegen') as Item
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<Item> {
  const res = await supabase.from('items').update(patch).eq('id', id).select('*').single()
  return unwrap(res, 'fehler.kiste_speichern') as Item
}

export async function setItemStatus(id: string, status: ItemStatus): Promise<Item> {
  return updateItem(id, { status })
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw new Error(tg('fehler.kiste_loeschen', { grund: errText(error) }))
}

export async function getItemsByIds(ids: string[]): Promise<Map<string, Item>> {
  const map = new Map<string, Item>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return map
  const res = await supabase.from('items').select('*').in('id', unique)
  if (res.error) {
    console.warn('[items] Vorschau nicht geladen:', res.error.message)
    return map
  }
  for (const i of (res.data ?? []) as Item[]) map.set(i.id, i)
  return map
}

export async function resolveCode(
  projectId: string,
  code: string,
): Promise<Array<{ item_id: string; code: string; is_old: boolean }>> {
  const res = await supabase.rpc('resolve_code', { p_project: projectId, p_code: code })
  if (res.error) throw new Error(tg('fehler.code_suchen', { grund: errText(res.error) }))
  return (res.data ?? []) as Array<{ item_id: string; code: string; is_old: boolean }>
}

/* ------------------------------------------------------- Schnellansicht */

/** Alles, was die Schnellansicht nach einem Scan braucht.
 *
 *  Sie laedt es selbst, statt es sich von der Seite reichen zu lassen.
 *  Nur so laesst sie sich ueberall einsetzen: im Umzug, im globalen
 *  Scanbereich und hinter der QR-Adresse. Wuerde sie tagById und canEdit
 *  als Eigenschaften erwarten, gaebe es sie nur dort, wo der
 *  Umzugs-Zusammenhang schon steht, und der globale Scanbereich braeuchte
 *  eine zweite Fassung. */
export interface SchnellDaten {
  item: Item
  project: Project
  room: Tag | null
  person: Tag | null
  contents: ItemContent[]
  /** Pfad des Deckbilds im Speicher, oder null. */
  coverPath: string | null
  /** Die eigene Rolle in diesem Umzug. Daraus folgt, was man aendern darf. */
  role: MemberRole | null
  /** Wo die Kiste im Grundriss steht (Name des Raums), oder null ohne Platz. */
  platz: { raum: string } | null
}

export async function ladeSchnellansicht(itemId: string): Promise<SchnellDaten> {
  /* Die Kiste samt Namen ihres Raums im Grundriss, in einer Abfrage. Der
   * Verweis ist ausdruecklich benannt: items und raeume haengen auch ueber
   * objekte zusammen. */
  const roh = await supabase
    .from('items')
    .select('*, platz_raum:raeume!items_platz_raum_id_fkey(name, tags(name))')
    .eq('id', itemId)
    .maybeSingle()
  if (roh.error) throw new Error(tg('fehler.kiste_laden', { grund: errText(roh.error) }))
  if (!roh.data) throw new Error(tg('fehler.kiste_fehlt'))
  const { platz_raum: platzRaum, ...itemFelder } = roh.data as Item & {
    platz_raum: { name: string | null; tags: { name: string } | { name: string }[] | null } | null
  }
  const item = itemFelder as Item
  const platzTag = Array.isArray(platzRaum?.tags) ? platzRaum?.tags[0] : platzRaum?.tags
  const platz =
    item.platz_raum_id && platzRaum
      ? { raum: (platzRaum.name ?? '').trim() || (platzTag?.name ?? '').trim() }
      : null
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id ?? null

  /* Nur die beiden Bereiche holen, die wirklich an dieser Kiste haengen,
   * nicht alle Bereiche des Umzugs. Beim Scannen im Treppenhaus zaehlt
   * jede Zehntelsekunde. */
  const tagIds = [item.room_id, item.person_id].filter((x): x is string => Boolean(x))

  const [project, contents, tags, deck, rolle] = await Promise.all([
    getProject(item.project_id),
    listContents(item.id),
    tagIds.length
      ? supabase.from('tags').select('*').in('id', tagIds)
      : Promise.resolve({ data: [] as Tag[], error: null }),
    item.cover_photo_id
      ? supabase.from('item_photos').select('path').eq('id', item.cover_photo_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    uid
      ? supabase
          .from('project_members')
          .select('role')
          .eq('project_id', item.project_id)
          .eq('user_id', uid)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (tags.error) throw new Error(tg('fehler.bereiche_laden', { grund: errText(tags.error) }))
  const liste = (tags.data ?? []) as Tag[]

  return {
    item,
    project,
    room: liste.find((x) => x.id === item.room_id) ?? null,
    person: liste.find((x) => x.id === item.person_id) ?? null,
    contents,
    coverPath: (deck.data as { path?: string } | null)?.path ?? null,
    role: ((rolle.data as { role?: MemberRole } | null)?.role ?? null) as MemberRole | null,
    platz,
  }
}

/* ------------------------------------------------------ Kistengroessen */

/** Die zehn Groessenstufen mit Litern und Massen. Feste Zahlen aus der
 *  Datenbank (0021), fuer alle lesbar. Numeric kommt als Text an und wird
 *  hier zur Zahl, damit niemand dahinter mit Text rechnet. */
export async function ladeKistenGroessen(): Promise<KistenGroesse[]> {
  const res = await supabase.from('kisten_groessen').select('*').order('stufe')
  const zeilen = unwrap(res, 'fehler.groessen_laden') as Array<Record<string, unknown>>
  return zeilen.map((z) => ({
    stufe: Number(z.stufe),
    liter: Number(z.liter),
    bis_liter: z.bis_liter === null ? null : Number(z.bis_liter),
    laenge_cm: Number(z.laenge_cm),
    breite_cm: Number(z.breite_cm),
    hoehe_cm: Number(z.hoehe_cm),
  }))
}

/* ----------------------------------------------------- Eigene Groessen */

/** Was man an einer eigenen Groesse eingibt. Die Stufe fehlt mit Absicht:
 *  die rechnet nur die Datenbank (0027). */
export interface EigeneGroesseWerte {
  name: string
  art: EigeneGroesse['art']
  laenge_cm: number
  breite_cm: number
  hoehe_cm: number
  ausschnitt_breite_cm: number | null
  ausschnitt_tiefe_cm: number | null
}

export async function listEigeneGroessen(projectId: string): Promise<EigeneGroesse[]> {
  const res = await supabase
    .from('eigene_groessen')
    .select('*')
    .eq('project_id', projectId)
    .order('art')
    .order('name')
  return unwrap(res, 'fehler.eigene_groessen_laden') as EigeneGroesse[]
}

export async function legeEigeneGroesseAn(
  projectId: string,
  w: EigeneGroesseWerte,
): Promise<EigeneGroesse> {
  const res = await supabase
    .from('eigene_groessen')
    .insert({ project_id: projectId, ...w })
    .select('*')
    .single()
  return unwrap(res, 'fehler.eigene_groesse_speichern') as EigeneGroesse
}

/** Groesse fuer einen einzelnen Gegenstand: eine eigene Groesse (Art
 *  Kiste) mit genau diesen Massen. Gibt es sie schon, wird sie wieder
 *  benutzt, sonst entsteht eine, die nach ihren Massen heisst ("30 x 30 x
 *  150 cm"). So waechst die Liste nicht mit jedem Gegenstand, und die
 *  Datenbank prueft den Platz mit den echten Massen. */
export async function groesseFuerMasse(
  projectId: string,
  laenge: number,
  breite: number,
  hoehe: number,
): Promise<EigeneGroesse> {
  const res = await supabase
    .from('eigene_groessen')
    .select('*')
    .eq('project_id', projectId)
    .eq('art', 'kiste')
    .eq('laenge_cm', laenge)
    .eq('breite_cm', breite)
    .eq('hoehe_cm', hoehe)
    .is('ausschnitt_breite_cm', null)
    .limit(1)
  const da = unwrap(res, 'fehler.eigene_groessen_laden') as EigeneGroesse[]
  if (da.length > 0) return da[0]
  const name = `${laenge} x ${breite} x ${hoehe} cm`
  const werte = { art: 'kiste' as const, laenge_cm: laenge, breite_cm: breite, hoehe_cm: hoehe, ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null }
  try {
    return await legeEigeneGroesseAn(projectId, { name, ...werte })
  } catch {
    // Der Name ist schon vergeben (etwa eine Moebelgroesse mit denselben
    // Massen): ein zweiter Versuch mit Zusatz, ein Fehler dann wird gemeldet.
    return legeEigeneGroesseAn(projectId, { name: `${name} (${tg('art.other')})`, ...werte })
  }
}

/** Aendern der Masse stuft alle Kisten mit dieser Groesse neu ein. Passt
 *  eine davon dann nicht mehr auf ihren Platz, lehnt die Datenbank ab
 *  (kistly:grundriss.zu_hoch u. a.); der Satz kommt ueber errText. */
export async function aendereEigeneGroesse(
  id: string,
  w: Partial<EigeneGroesseWerte>,
): Promise<EigeneGroesse> {
  const res = await supabase.from('eigene_groessen').update(w).eq('id', id).select('*').single()
  return unwrap(res, 'fehler.eigene_groesse_speichern') as EigeneGroesse
}

/** Eine benutzte Groesse lehnt die Datenbank ab (kistly:groesse.benutzt
 *  mit der Zahl der Kisten und Moebel). */
export async function loescheEigeneGroesse(id: string): Promise<void> {
  const { error } = await supabase.from('eigene_groessen').delete().eq('id', id)
  if (error) throw new Error(tg('fehler.eigene_groesse_loeschen', { grund: errText(error) }))
}

/** Was eine Aenderung der Masse ausloesen wuerde, bevor man speichert. */
export async function eigeneGroesseFolgen(
  id: string,
  laenge: number,
  breite: number,
  hoehe: number,
): Promise<GroessenFolgen> {
  const res = await supabase.rpc('eigene_groesse_folgen', {
    p_id: id,
    p_laenge: laenge,
    p_breite: breite,
    p_hoehe: hoehe,
  })
  const d = unwrap(res, 'fehler.eigene_groesse_folgen') as Record<string, unknown>
  return {
    kisten: Number(d.kisten ?? 0),
    moebel: Number(d.moebel ?? 0),
    stufe_neu: Number(d.stufe_neu ?? 0),
    neue_nummer: Number(d.neue_nummer ?? 0),
  }
}

/* ------------------------------------------------------------ Grundriss */

export async function ladeGrundrisse(projectId: string): Promise<Grundriss[]> {
  const res = await supabase
    .from('grundrisse')
    .select('*')
    .eq('project_id', projectId)
    .order('sort')
    .order('created_at')
  return unwrap(res, 'fehler.grundrisse_laden') as Grundriss[]
}

/** Der erste Grundriss des Umzugs; gibt es keinen, legt ein Bearbeiter
 *  ihn mit diesem Namen an. null bei Betrachtern ohne Grundriss. */
export async function grundrissSicherstellen(projectId: string, name: string): Promise<string | null> {
  const res = await supabase.rpc('grundriss_sicherstellen', { p_project: projectId, p_name: name })
  if (res.error) throw new Error(tg('fehler.grundriss_anlegen', { grund: errText(res.error) }))
  return (res.data as string | null) ?? null
}

export async function legeGrundrissAn(projectId: string, name: string, sort: number): Promise<Grundriss> {
  const res = await supabase
    .from('grundrisse')
    .insert({ project_id: projectId, name: name.trim(), sort })
    .select('*')
    .single()
  return unwrap(res, 'fehler.grundriss_anlegen') as Grundriss
}

/** Name oder Reihenfolge. Die Version zaehlt nur grundriss_speichern hoch. */
export async function aendereGrundriss(id: string, w: { name?: string; sort?: number }): Promise<Grundriss> {
  const patch = w.name === undefined ? w : { ...w, name: w.name.trim() }
  const res = await supabase.from('grundrisse').update(patch).eq('id', id).select('*').single()
  return unwrap(res, 'fehler.grundriss_speichern') as Grundriss
}

/** Loescht Raeume, Tueren, Fenster und Moebel mit. Kisten bleiben, sie
 *  verlieren nur ihren Platz (Kaskade in der Datenbank). */
export async function loescheGrundriss(id: string): Promise<void> {
  const { error } = await supabase.from('grundrisse').delete().eq('id', id)
  if (error) throw new Error(tg('fehler.grundriss_loeschen', { grund: errText(error) }))
}

/** Wie viele Kisten in diesem Grundriss einen Platz haben (fuer die
 *  Frage vor dem Loeschen). */
export async function grundrissKistenZahl(id: string): Promise<number> {
  const res = await supabase.rpc('grundriss_kisten_zahl', { p_grundriss: id })
  if (res.error) throw new Error(tg('fehler.grundriss_laden', { grund: errText(res.error) }))
  return Number(res.data ?? 0)
}

type RohDaten = Omit<GrundrissDaten, 'raeume'> & {
  raeume: Array<Omit<Raum, 'punkte'> & { punkte: number[] }>
}

/** Antwort von grundriss_laden in die Form der Oberflaeche: Umrisse als
 *  Punkte, fehlende Listen leer. */
function datenLesen(d: RohDaten): GrundrissDaten {
  return {
    grundriss: { ...d.grundriss, linien: d.grundriss.linien ?? [] },
    raeume: (d.raeume ?? []).map((r) => ({ ...r, punkte: zuPunkten(r.punkte ?? []) })),
    oeffnungen: d.oeffnungen ?? [],
    objekte: d.objekte ?? [],
    kisten: d.kisten ?? [],
  }
}

/** Alles eines Grundrisses (oder nur eines Raums) mit fertigen Hoehen.
 *  null heisst: diesen Grundriss gibt es nicht (mehr). */
export async function ladeGrundriss(id: string, raumId?: string): Promise<GrundrissDaten | null> {
  const res = await supabase.rpc('grundriss_laden', { p_grundriss: id, p_raum: raumId ?? null })
  if (res.error) throw new Error(tg('fehler.grundriss_laden', { grund: errText(res.error) }))
  const d = res.data as RohDaten | null
  if (!d) return null
  return datenLesen(d)
}

/** Die gestrichelten Hilfslinien eines Grundrisses speichern (0034). Ein
 *  normales update, die Version des Grundrisses bleibt dabei stehen. */
export async function speichereLinien(grundrissId: string, linien: PlanLinie[]): Promise<PlanLinie[]> {
  const res = await supabase.from('grundrisse').update({ linien }).eq('id', grundrissId).select('linien').single()
  const z = unwrap(res, 'fehler.linien_speichern') as { linien: PlanLinie[] | null }
  return z.linien ?? []
}

/** Eine Ablehnung beim Speichern des Grundrisses. Die Nachricht ist der
 *  uebersetzte Satz; kennung und werte braucht der Zeichner, um auf den
 *  Raum oder die Kiste zu zeigen und "veraltet" zu erkennen. */
export class GrundrissFehler extends Error {
  kennung: string | null
  werte: Record<string, unknown>
  /** SQLSTATE der Datenbank (z. B. 23514), sonst null. */
  sqlstate: string | null
  constructor(text: string, kennung: string | null, werte: Record<string, unknown>, sqlstate: string | null = null) {
    super(text)
    this.name = 'GrundrissFehler'
    this.kennung = kennung
    this.werte = werte
    this.sqlstate = sqlstate
  }
}

function grundrissFehlerAus(err: unknown): GrundrissFehler {
  const e = (err ?? {}) as { hint?: unknown; details?: unknown; code?: unknown }
  let kennung: string | null = null
  if (typeof e.hint === 'string' && e.hint.startsWith('kistly:grundriss.')) {
    kennung = e.hint.slice('kistly:grundriss.'.length)
  }
  let werte: Record<string, unknown> = {}
  if (typeof e.details === 'string' && e.details.trim().startsWith('{')) {
    try {
      const roh: unknown = JSON.parse(e.details)
      if (roh && typeof roh === 'object' && !Array.isArray(roh)) werte = roh as Record<string, unknown>
    } catch {
      /* ohne Werte: der Satz kommt trotzdem, nur ohne Platzhalter */
    }
  }
  const sqlstate = typeof e.code === 'string' && /^[0-9A-Z]{5}$/.test(e.code) ? e.code : null
  return new GrundrissFehler(tg('fehler.grundriss_speichern', { grund: errText(err) }), kennung, werte, sqlstate)
}

/** Aenderungen aus dem Zeichner in einem Vorgang speichern. Die Datenbank
 *  prueft am Ende jeden beruehrten Raum vollstaendig; lehnt sie ab, bleibt
 *  nichts stehen. p_version schuetzt vor dem Ueberschreiben fremder
 *  Aenderungen (Ablehnung "veraltet"). */
export async function speichereGrundriss(
  id: string,
  version: number,
  a: GrundrissAenderung,
): Promise<{ version: number; daten: GrundrissDaten }> {
  const aenderung = {
    ...a,
    raeume: a.raeume?.map((r) => ({ ...r, punkte: zuUmriss(r.punkte) })),
  }
  const res = await supabase.rpc('grundriss_speichern', {
    p_grundriss: id,
    p_version: version,
    p_aenderung: aenderung,
  })
  if (res.error) throw grundrissFehlerAus(res.error)
  const d = res.data as { version: number; daten: RohDaten } | null
  if (!d || !d.daten) throw new GrundrissFehler(tg('fehler.grundriss_speichern', { grund: tg('fehler.keine_daten') }), null, {})
  return { version: Number(d.version), daten: datenLesen(d.daten) }
}

/** Alle Raeume des Umzugs ueber alle Grundrisse, fuer Auswahllisten. */
export async function ladeRaeumeDesUmzugs(projectId: string): Promise<RaumEintrag[]> {
  const res = await supabase
    .from('raeume')
    .select('id, grundriss_id, tag_id, name, grundrisse(name)')
    .eq('project_id', projectId)
    .order('sort')
  const zeilen = unwrap(res, 'fehler.raeume_laden') as unknown as Array<{
    id: string
    grundriss_id: string
    tag_id: string | null
    name: string
    grundrisse: { name: string } | { name: string }[] | null
  }>
  return zeilen.map((z) => {
    const g = Array.isArray(z.grundrisse) ? z.grundrisse[0] : z.grundrisse
    return { id: z.id, grundriss_id: z.grundriss_id, tag_id: z.tag_id, name: z.name, grundriss_name: g?.name ?? '' }
  })
}

/** Was im Grundriss in den Raeumen eines Zimmers steht: Moebel, Regale,
 *  Schraenke und alle hingestellten Kisten und Gegenstaende. Ein Zimmer
 *  kann in mehreren Grundrissen gezeichnet sein; alles wird zusammengelegt. */
export async function ladeZimmerPlan(
  projectId: string,
  tagId: string,
): Promise<{ raeume: number; objekte: Objekt[]; kisten: PlanKiste[] }> {
  const raeume = (await ladeRaeumeDesUmzugs(projectId)).filter((r) => r.tag_id === tagId)
  const teile = await Promise.all(raeume.map((r) => ladeGrundriss(r.grundriss_id, r.id)))
  const objekte: Objekt[] = []
  const kisten: PlanKiste[] = []
  for (const d of teile) {
    if (!d) continue
    objekte.push(...d.objekte)
    kisten.push(...d.kisten)
  }
  return { raeume: raeume.length, objekte, kisten }
}

/** Eine Kiste hinstellen. Ob der Platz gilt (im Raum, auf der Unterlage,
 *  unter der Decke), entscheidet die Datenbank; die Antwort ist die neue
 *  Lage. Nicht zu verwechseln mit dem alten setzePlatz (Raster). */
export async function platzSetzen(itemId: string, p: Platz): Promise<KisteLage> {
  const res = await supabase.rpc('platz_setzen', {
    p_item: itemId,
    p_raum: p.raum_id,
    p_x: p.x,
    p_y: p.y,
    p_drehung: p.drehung,
    p_unterlage: p.unterlage,
    p_unterlage_item: p.unterlage_item_id,
    p_unterlage_objekt: p.unterlage_objekt_id,
    p_ebene: p.ebene,
    p_spalte: p.spalte,
  })
  return unwrap(res, 'fehler.platz_setzen') as KisteLage
}

/** Vom Platz nehmen. Was darauf lag, rutscht die Datenbank nach. */
export async function platzRaeumen(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('platz_raeumen', { p_item: itemId })
  if (error) throw new Error(tg('fehler.platz_raeumen', { grund: errText(error) }))
}

/** Wo eine Kiste steht, oder null, wenn sie keinen Platz hat. */
export async function ladeKisteLage(itemId: string): Promise<KisteLage | null> {
  const res = await supabase.rpc('kiste_lage', { p_item: itemId })
  if (res.error) throw new Error(tg('fehler.kiste_lage_laden', { grund: errText(res.error) }))
  return (res.data as KisteLage | null) ?? null
}

/* ---------------------------------------------------------------- Suche */

/** Ein Ding ueber alle Umzuege suchen, in denen man Mitglied ist. Die
 *  Datenbank bereinigt die Anfrage selbst (such_normal) und laesst die
 *  Zeilen-Sicherheit greifen (0024). Seit 0030 kommt der Platz mit:
 *  Grundriss, Raum, Unterlage, Fach und Hoehe, auch fuer Dinge in Moebeln.
 *  Numeric kommt als Text an und wird hier zur Zahl; fehlt eine Spalte
 *  (alte Datenbank), steht dort null statt undefined. */
export async function inhaltSuchen(q: string, max = 60): Promise<SuchTreffer[]> {
  const res = await supabase.rpc('inhalt_suchen', { p_q: q, p_max: max })
  if (res.error) throw new Error(tg('fehler.suchen', { grund: errText(res.error) }))
  const zahl = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  const text = (v: unknown) => (v === null || v === undefined ? null : String(v))
  return ((res.data ?? []) as Array<Record<string, unknown>>).map((z) => ({
    ...(z as unknown as SuchTreffer),
    box_x0: zahl(z.box_x0),
    box_y0: zahl(z.box_y0),
    box_x1: zahl(z.box_x1),
    box_y1: zahl(z.box_y1),
    punkt_x: zahl(z.punkt_x),
    punkt_y: zahl(z.punkt_y),
    grundriss_id: text(z.grundriss_id),
    grundriss_name: text(z.grundriss_name),
    raum_id: text(z.raum_id),
    raum_name: text(z.raum_name),
    unterlage_art: text(z.unterlage_art) as SuchTreffer['unterlage_art'],
    unterlage_code: text(z.unterlage_code),
    objekt_id: text(z.objekt_id),
    objekt_name: text(z.objekt_name),
    objekt_art: text(z.objekt_art) as SuchTreffer['objekt_art'],
    objekt_spalten: zahl(z.objekt_spalten),
    fach_ebene: zahl(z.fach_ebene),
    fach_spalte: zahl(z.fach_spalte),
    platz_x: zahl(z.platz_x),
    platz_y: zahl(z.platz_y),
    stapel_nr: zahl(z.stapel_nr),
    hoehe_von: zahl(z.hoehe_von),
    hoehe_bis: zahl(z.hoehe_bis),
    treffer: Number(z.treffer ?? 0),
    // Fehlt vor 0033 ganz: dann null (nicht angegeben).
    item_fuellstand: zahl(z.item_fuellstand),
  }))
}

/* ------------------------------------------------------------- Inhalte */

export async function listContents(itemId: string): Promise<ItemContent[]> {
  const res = await supabase
    .from('item_contents')
    .select('*')
    .eq('item_id', itemId)
    .order('sort')
    .order('created_at')
  return unwrap(res, 'fehler.inhalt_laden') as ItemContent[]
}

export async function listContentsForItems(itemIds: string[]): Promise<Map<string, ItemContent[]>> {
  const map = new Map<string, ItemContent[]>()
  if (itemIds.length === 0) return map
  const step = 200
  const seite = 1000
  for (let i = 0; i < itemIds.length; i += step) {
    const slice = itemIds.slice(i, i + step)
    // Innerhalb eines Blocks wird weitergeblaettert, bis nichts mehr
    // kommt. Ohne das waere die Antwort irgendwann still gekuerzt und der
    // Etikettenbogen liefe ohne Inhaltsangaben durch, ohne dass etwas zu
    // fehlen scheint.
    for (let von = 0; ; von += seite) {
      const res = await supabase
        .from('item_contents')
        .select('*')
        .in('item_id', slice)
        .order('item_id')
        .order('sort')
        .range(von, von + seite - 1)
      if (res.error) throw new Error(tg('fehler.inhalte_laden', { grund: errText(res.error) }))
      const zeilen = (res.data ?? []) as ItemContent[]
      for (const row of zeilen) {
        const list = map.get(row.item_id) ?? []
        list.push(row)
        map.set(row.item_id, list)
      }
      if (zeilen.length < seite) break
    }
  }
  return map
}

/* project_id wird vom Trigger aus der Kiste gesetzt. Wir schicken es
 * trotzdem mit, damit die Zeile schon vor dem Trigger stimmig ist. */
export async function addContent(
  projectId: string,
  itemId: string,
  text: string,
  qty = 1,
  /** Woher die Zeile kommt. Ein Vorschlag aus einem Foto bleibt als
   *  solcher erkennbar, auch nachdem er uebernommen wurde. */
  quelle: ItemContent['quelle'] = 'hand',
  /** Wo der Gegenstand zu sehen ist: auf welchem Foto, in welcher
   *  Schicht, und an welcher Stelle. Von Hand eingetippte Zeilen haben
   *  keinen Ort, im Bild markierte schon. Mit Rahmen setzt die Datenbank
   *  den Punkt selbst auf die Mitte (0023). */
  ort?: {
    photo_id?: string | null
    schicht?: number | null
    punkt_x?: number | null
    punkt_y?: number | null
    rahmen?: { x0: number; y0: number; x1: number; y1: number } | null
  },
  /** Suchwoerter und Sicherheit aus der Erkennung. */
  extra?: { suchwoerter?: string[]; sicherheit?: number | null },
): Promise<ItemContent> {
  const r = ort?.rahmen ?? null
  const res = await supabase
    .from('item_contents')
    .insert({
      item_id: itemId,
      project_id: projectId,
      text: text.trim(),
      qty,
      quelle,
      photo_id: ort?.photo_id ?? null,
      schicht: ort?.schicht ?? null,
      /* Beide oder keiner. Die Datenbank weist einen halben Punkt
       * ohnehin zurueck, hier wird er gar nicht erst gebaut. */
      punkt_x: ort?.punkt_x != null && ort?.punkt_y != null ? ort.punkt_x : null,
      punkt_y: ort?.punkt_x != null && ort?.punkt_y != null ? ort.punkt_y : null,
      box_x0: r ? r.x0 : null,
      box_y0: r ? r.y0 : null,
      box_x1: r ? r.x1 : null,
      box_y1: r ? r.y1 : null,
      suchwoerter: extra?.suchwoerter ?? [],
      sicherheit: extra?.sicherheit ?? null,
    })
    .select('*')
    .single()
  return unwrap(res, 'fehler.eintrag_anlegen') as ItemContent
}

/** Einen Inhalt in eine andere Kiste umhaengen. Das project_id setzt der
 *  Trigger nicht bei einem Update, darum wird es hier mitgeschickt, damit
 *  die Zeile stimmig bleibt. Beide Kisten muessen im selben Umzug liegen,
 *  sonst laesst die RLS das Schreiben ohnehin nicht zu. */
export async function moveContent(
  contentId: string,
  zielItemId: string,
  projectId: string,
): Promise<void> {
  /* Der Ort bleibt in der alten Kiste: das Foto gehoert ihr, also auch
   * Punkt, Rahmen, Schicht und Antwort. Das raeumt der Trigger aus 0023
   * (contents_bild_pruefen) ab, wenn die Kiste wechselt und photo_id
   * unveraendert ankommt. Darum hier NUR Kiste und Umzug: wer photo_id
   * mitschickt, umgeht das Abraeumen, der Rahmen bleibt stehen, und die
   * Pruefung "Rahmen braucht ein Foto" lehnt das Verschieben ab. */
  const { error } = await supabase
    .from('item_contents')
    .update({ item_id: zielItemId, project_id: projectId })
    .eq('id', contentId)
  if (error) throw new Error(tg('fehler.inhalt_verschieben', { grund: errText(error) }))
}

/** Mehrere Kisten auf einmal aendern. Einzeln, damit der Trigger je Zeile
 *  einen sauberen neuen Code vergeben kann. Fehlschlaege werden gesammelt
 *  gemeldet, nicht verschluckt: wer zehn Kisten markiert und sieben
 *  bekommt, muss das erfahren. */
export async function patchItems(
  ids: string[],
  patch: Partial<Item>,
): Promise<{ ok: number; fehler: string[] }> {
  let okZahl = 0
  const fehler: string[] = []
  for (const id of ids) {
    try {
      await updateItem(id, patch)
      okZahl++
    } catch (err) {
      fehler.push(err instanceof Error ? err.message : String(err))
    }
  }
  return { ok: okZahl, fehler }
}

/** Mehrere Kisten in ein anderes Zimmer oder zu einer anderen Person
 *  haengen. Eigener Name, damit an der Aufrufstelle steht, was gemeint
 *  ist. Der Weg dorthin ist derselbe wie bei patchItems, es gibt ihn nur
 *  einmal. */
export async function moveItems(
  ids: string[],
  patch: { room_id?: string | null; person_id?: string | null; code_source?: Item['code_source'] },
): Promise<{ ok: number; fehler: string[] }> {
  return patchItems(ids, patch)
}

/** Ein Update, das keine Zeile trifft, meldet Supabase nicht als Fehler.
 *  Darum wird die Zeile zurueckgelesen: kommt keine, wurde nichts
 *  gespeichert, und die Oberflaeche darf nicht so tun als ob. */
export async function updateContent(id: string, patch: Partial<ItemContent>): Promise<void> {
  const { data, error } = await supabase
    .from('item_contents')
    .update(patch)
    .eq('id', id)
    .select('id')
  if (error) throw new Error(tg('fehler.eintrag_speichern', { grund: errText(error) }))
  if (!data || data.length === 0) {
    throw new Error(tg('fehler.eintrag_speichern', { grund: tg('fehler.keine_daten') }))
  }
}

/** Einen Eintrag loeschen, und sein Ausschnittbild mit. Bleibt das Bild
 *  liegen, wird das nur gemeldet: der Eintrag ist weg, das zaehlt. */
export async function deleteContent(id: string, ausschnittPfad: string | null = null): Promise<void> {
  const { error } = await supabase.from('item_contents').delete().eq('id', id)
  if (error) throw new Error(tg('fehler.eintrag_loeschen', { grund: errText(error) }))
  if (ausschnittPfad) {
    const rm = await supabase.storage.from('item-photos').remove([ausschnittPfad])
    if (rm.error) console.warn('[storage] Ausschnitt blieb liegen:', rm.error.message)
  }
}

/** Den Rahmen eines Eintrags neu setzen oder wegnehmen, zusammen mit dem
 *  neuen Ausschnittbild. Das alte Bild wird danach weggeraeumt. */
export async function setzeRahmen(
  eintrag: ItemContent,
  rahmen: { x0: number; y0: number; x1: number; y1: number } | null,
  ausschnittPfad: string | null,
): Promise<ItemContent> {
  const res = await supabase
    .from('item_contents')
    .update({
      box_x0: rahmen ? rahmen.x0 : null,
      box_y0: rahmen ? rahmen.y0 : null,
      box_x1: rahmen ? rahmen.x1 : null,
      box_y1: rahmen ? rahmen.y1 : null,
      ausschnitt_pfad: ausschnittPfad,
      // Ein neuer Rahmen ist eine neue Antwort auf "ist es das?".
      bestaetigt: rahmen ? true : eintrag.bestaetigt,
    })
    .eq('id', eintrag.id)
    .select('*')
    .single()
  const neu = unwrap(res, 'fehler.eintrag_speichern') as ItemContent
  if (eintrag.ausschnitt_pfad && eintrag.ausschnitt_pfad !== ausschnittPfad) {
    const rm = await supabase.storage.from('item-photos').remove([eintrag.ausschnitt_pfad])
    if (rm.error) console.warn('[storage] alter Ausschnitt blieb liegen:', rm.error.message)
  }
  return neu
}

/* --------------------------------------------------------------- Fotos */

export async function listPhotos(itemId: string): Promise<ItemPhoto[]> {
  const res = await supabase
    .from('item_photos')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at')
  return unwrap(res, 'fehler.fotos_laden') as ItemPhoto[]
}

export async function addPhotoRecord(
  projectId: string,
  itemId: string,
  path: string,
  caption?: string,
  art: ItemPhoto['art'] = 'foto',
  seite?: string,
  /** Wie tief in der Kiste. 1 ist oben. */
  schicht?: number | null,
): Promise<ItemPhoto> {
  const { data: auth } = await supabase.auth.getUser()
  const res = await supabase
    .from('item_photos')
    .insert({
      item_id: itemId,
      project_id: projectId,
      path,
      art,
      seite: seite ?? null,
      schicht: schicht ?? null,
      caption: caption ?? null,
      created_by: auth.user?.id ?? null,
    })
    .select('*')
    .single()
  return unwrap(res, 'fehler.foto_speichern') as ItemPhoto
}

/** Ein Foto zum Deckbild machen, oder das Deckbild wieder abnehmen.
 *  Die Datenbank prueft, dass das Foto zu diesem Eintrag gehoert. */
export async function setCoverPhoto(itemId: string, photoId: string | null): Promise<Item> {
  return updateItem(itemId, { cover_photo_id: photoId })
}

/** Die Deckbilder mehrerer Eintraege auf einmal holen, fuer Listen und
 *  fuer die Schnellansicht. Begrenzt und seitenweise, damit auch eine
 *  lange Liste nicht in eine zu grosse Antwort laeuft. */
export async function coverPaths(items: Item[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const ids = items.map((i) => i.cover_photo_id).filter((x): x is string => Boolean(x))
  if (ids.length === 0) return out
  const step = 200
  for (let i = 0; i < ids.length; i += step) {
    const res = await supabase
      .from('item_photos')
      .select('id,path')
      .in('id', ids.slice(i, i + step))
    if (res.error) throw new Error(tg('fehler.fotos_laden', { grund: errText(res.error) }))
    const nachId = new Map((res.data ?? []).map((r) => [r.id as string, r.path as string]))
    for (const item of items) {
      const pfad = item.cover_photo_id ? nachId.get(item.cover_photo_id) : undefined
      if (pfad) out.set(item.id, pfad)
    }
  }
  return out
}

/** In welche Schicht der Kiste dieses Foto gehoert. null nimmt die
 *  Angabe wieder weg.
 *
 *  Die Zeilen der Inhaltsliste, die auf diesem Foto zu sehen sind, ziehen
 *  mit. Sonst stuende an der Zeile weiter die alte Schicht, und die Suche
 *  schickte einen spaeter in die falsche Lage der Kiste. */
export async function setPhotoSchicht(id: string, schicht: number | null): Promise<ItemPhoto> {
  const res = await supabase
    .from('item_photos')
    .update({ schicht })
    .eq('id', id)
    .select('*')
    .single()
  // Die Zeilen auf diesem Foto zieht der Trigger aus 0020 im selben
  // Vorgang nach. Ein zweites Update von hier aus konnte bei schnellem
  // Weitertippen die Zeilen auf einer alten Schicht zuruecklassen.
  return unwrap(res, 'fehler.foto_speichern') as ItemPhoto
}

export async function deletePhoto(photo: ItemPhoto): Promise<void> {
  const { error } = await supabase.from('item_photos').delete().eq('id', photo.id)
  if (error) throw new Error(tg('fehler.foto_loeschen', { grund: errText(error) }))
  const rm = await supabase.storage.from('item-photos').remove([photo.path])
  if (rm.error) console.warn('[storage] Datei blieb liegen:', rm.error.message)
}

/* ------------------------------------------------------------- Verlauf */

export async function listItemEvents(itemId: string, limit = 50): Promise<ItemEvent[]> {
  const res = await supabase
    .from('item_events')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return unwrap(res, 'fehler.verlauf_laden') as ItemEvent[]
}

export async function listProjectEvents(projectId: string, limit = 40): Promise<ItemEvent[]> {
  const res = await supabase
    .from('item_events')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return unwrap(res, 'fehler.verlauf_laden') as ItemEvent[]
}

export async function logScan(projectId: string, itemId: string, note?: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase.from('item_events').insert({
    project_id: projectId,
    item_id: itemId,
    user_id: auth.user?.id ?? null,
    type: 'scan',
    data: note ? { note } : {},
  })
  if (error) console.warn('[scan] Verlauf nicht geschrieben:', errText(error))
}

/* ================================================================= Chat */

export interface ChatMessage extends Message {
  reactions: MessageReaction[]
  links: MessageLink[]
}

export async function listMessages(
  projectId: string,
  before?: string,
  limit = 40,
): Promise<ChatMessage[]> {
  let q = supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) q = q.lt('created_at', before)
  const { data, error } = await q
  if (error) throw new Error(tg('fehler.nachrichten_laden', { grund: errText(error) }))

  const msgs = ((data ?? []) as Message[]).reverse()
  if (msgs.length === 0) return []
  const ids = msgs.map((m) => m.id)
  const [reacts, links] = await Promise.all([
    supabase.from('message_reactions').select('*').in('message_id', ids),
    supabase.from('message_links').select('*').in('message_id', ids),
  ])
  if (reacts.error) console.warn('[chat] Reaktionen:', reacts.error.message)
  if (links.error) console.warn('[chat] Verweise:', links.error.message)

  return msgs.map((m) => ({
    ...m,
    reactions: ((reacts.data ?? []) as MessageReaction[]).filter((r) => r.message_id === m.id),
    links: ((links.data ?? []) as MessageLink[]).filter((l) => l.message_id === m.id),
  }))
}

export async function loadMessageExtras(
  ids: string[],
): Promise<{ reactions: MessageReaction[]; links: MessageLink[] }> {
  if (ids.length === 0) return { reactions: [], links: [] }
  const [reacts, links] = await Promise.all([
    supabase.from('message_reactions').select('*').in('message_id', ids),
    supabase.from('message_links').select('*').in('message_id', ids),
  ])
  return {
    reactions: (reacts.data ?? []) as MessageReaction[],
    links: (links.data ?? []) as MessageLink[],
  }
}

export async function sendMessage(input: {
  project_id: string
  body?: string | null
  kind?: Message['kind']
  attachment_path?: string | null
  attachment_meta?: Record<string, unknown>
  reply_to?: string | null
  call_id?: string | null
  links?: Array<{ target_type: 'item' | 'tag'; target_id: string; label?: string }>
}): Promise<Message> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error(tg('fehler.nicht_angemeldet'))
  const { links, ...rest } = input
  const res = await supabase
    .from('messages')
    .insert({ ...rest, sender_id: auth.user.id })
    .select('*')
    .single()
  const msg = unwrap(res, 'fehler.nachricht_senden') as Message

  if (links?.length) {
    const { error } = await supabase.from('message_links').insert(
      links.map((l) => ({
        message_id: msg.id,
        project_id: input.project_id,
        target_type: l.target_type,
        target_id: l.target_id,
        label: l.label ?? null,
      })),
    )
    if (error) console.warn('[chat] Verweise nicht gespeichert:', errText(error))
  }
  return msg
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString(), body: null })
    .eq('id', id)
  if (error) throw new Error(tg('fehler.nachricht_loeschen', { grund: errText(error) }))
}

export async function editMessage(id: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ body, edited_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(tg('fehler.nachricht_aendern', { grund: errText(error) }))
}

export async function toggleReaction(
  projectId: string,
  messageId: string,
  emoji: string,
  on: boolean,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error(tg('fehler.nicht_angemeldet'))
  if (on) {
    const { error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: auth.user.id, emoji, project_id: projectId })
    if (error && !String(error.message).includes('duplicate'))
      throw new Error(tg('fehler.reaktion_setzen', { grund: errText(error) }))
  } else {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', auth.user.id)
      .eq('emoji', emoji)
    if (error) throw new Error(tg('fehler.reaktion_entfernen', { grund: errText(error) }))
  }
}

export async function countUnread(projectId: string, since: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gt('created_at', since)
  if (error) {
    console.warn('[chat] Ungelesene nicht gezaehlt:', errText(error))
    return 0
  }
  return count ?? 0
}

/* ================================================================ Anrufe */

export async function createCall(projectId: string, video: boolean, invitees: string[]): Promise<Call> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error(tg('fehler.nicht_angemeldet'))
  const res = await supabase
    .from('calls')
    .insert({ project_id: projectId, video, created_by: auth.user.id })
    .select('*')
    .single()
  const call = unwrap(res, 'fehler.anruf_starten') as Call

  const rows = [
    { call_id: call.id, user_id: auth.user.id, state: 'joined', joined_at: new Date().toISOString() },
    ...invitees
      .filter((u) => u !== auth.user!.id)
      .map((u) => ({ call_id: call.id, user_id: u, state: 'invited' })),
  ]
  const { error } = await supabase.from('call_participants').insert(rows)
  if (error) throw new Error(tg('fehler.teilnehmer_eintragen', { grund: errText(error) }))
  return call
}

export async function setCallStatus(callId: string, status: Call['status']): Promise<void> {
  const patch: Partial<Call> = { status }
  if (status === 'active') patch.started_at = new Date().toISOString()
  if (status === 'ended' || status === 'declined' || status === 'missed')
    patch.ended_at = new Date().toISOString()
  const { error } = await supabase.from('calls').update(patch).eq('id', callId)
  if (error) throw new Error(tg('fehler.anruf_aendern', { grund: errText(error) }))
}

export async function setParticipantState(
  callId: string,
  userId: string,
  state: CallParticipant['state'],
): Promise<void> {
  const patch: Partial<CallParticipant> = { state }
  if (state === 'joined') patch.joined_at = new Date().toISOString()
  if (state === 'left' || state === 'declined') patch.left_at = new Date().toISOString()
  const { error } = await supabase
    .from('call_participants')
    .update(patch)
    .eq('call_id', callId)
    .eq('user_id', userId)
  if (error) throw new Error(tg('fehler.teilnehmer_aendern', { grund: errText(error) }))
}

export async function getCall(callId: string): Promise<{ call: Call; parts: CallParticipant[] }> {
  const [c, p] = await Promise.all([
    supabase.from('calls').select('*').eq('id', callId).maybeSingle(),
    supabase.from('call_participants').select('*').eq('call_id', callId),
  ])
  if (c.error) throw new Error(tg('fehler.anruf_laden', { grund: errText(c.error) }))
  if (!c.data) throw new Error(tg('fehler.anruf_fehlt'))
  return { call: c.data as Call, parts: (p.data ?? []) as CallParticipant[] }
}

/* ================================================================= Push */

export async function getPrefs(userId: string): Promise<NotificationPrefs> {
  const res = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (res.error) throw new Error(tg('fehler.prefs_laden', { grund: errText(res.error) }))
  if (res.data) return res.data as NotificationPrefs
  const created = await supabase
    .from('notification_prefs')
    .insert({ user_id: userId })
    .select('*')
    .single()
  return unwrap(created, 'fehler.prefs_anlegen') as NotificationPrefs
}

export async function setPrefs(
  userId: string,
  patch: Partial<NotificationPrefs>,
): Promise<void> {
  const { error } = await supabase.from('notification_prefs').update(patch).eq('user_id', userId)
  if (error) throw new Error(tg('fehler.prefs_speichern', { grund: errText(error) }))
}

/* ============================================================== Profile */

export async function listProfiles(ids: string[]): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return map
  const res = await supabase.from('profiles').select('*').in('id', unique)
  if (res.error) {
    console.warn('[profiles] konnten nicht geladen werden:', res.error.message)
    return map
  }
  for (const p of (res.data ?? []) as Profile[]) map.set(p.id, p)
  return map
}
