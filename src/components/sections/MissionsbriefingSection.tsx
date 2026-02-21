import { PiMegaphone, PiCheck, PiWarning } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import ChecklistSection from '../ChecklistSection'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRIEFING_ITEMS = [
  { key: 'auftrag', label: 'Einsatzauftrag bekannt' },
  { key: 'priorisierung', label: 'Priorisierung bei der Ausführung' },
  { key: 'rollen', label: 'Rollenverteilung bekannt?' },
  { key: 'aufgaben', label: 'Aufgaben klar?' },
  { key: 'kommunikation', label: 'Kommunikation sicher?' },
] as const

const FLUG_ANLASS_LABELS: Record<string, string> = {
  einsatz: 'Einsatz',
  uebung: 'Übung',
  ausbildung: 'Ausbildung',
  testflug: 'Testflug/Wartung',
}

const TEMPLATE_LABELS: Record<string, string> = {
  personensuche: 'Personensuche',
  erkundung: 'Erkundung',
  transport: 'Transport',
  ueberwachung: 'Überwachung',
  custom: 'Sonstiges',
}

const TEMPLATE_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  personensuche: [
    { key: 'mission_person_name', label: 'Name / Beschreibung' },
    { key: 'mission_person_alter', label: 'Alter' },
    { key: 'mission_person_geschlecht', label: 'Geschlecht' },
    { key: 'mission_person_position', label: 'Letzte bekannte Position' },
    { key: 'mission_person_kleidung', label: 'Kleidung / Merkmale' },
    { key: 'mission_person_vermisst_seit', label: 'Seit wann vermisst' },
  ],
  erkundung: [
    { key: 'mission_erkundung_gebiet', label: 'Erkundungsgebiet / -objekt' },
    { key: 'mission_erkundung_art', label: 'Art der Erkundung' },
  ],
  transport: [
    { key: 'mission_transport_gut', label: 'Transportgut' },
    { key: 'mission_transport_ziel', label: 'Zielort' },
  ],
  ueberwachung: [
    { key: 'mission_ueberwachung_objekt', label: 'Überwachungsobjekt / -gebiet' },
    { key: 'mission_ueberwachung_dauer', label: 'Dauer / Intervall' },
  ],
}

const CREW_ROLE_LABELS: Record<string, string> = {
  fernpilot: 'Fernpilot',
  luftraumbeobachter: 'Luftraumbeobachter',
  bildauswerter: 'Bildauswerter',
}

const PRIORITY_PROMPTS = [
  'Was ist das Hauptziel des Einsatzes?',
  'Was hat höchste Priorität, was kann warten?',
  'Gibt es zeitkritische Faktoren?',
  'Abbruchkriterien festgelegt?',
]

const ROLE_TASKS: Record<string, string> = {
  'Führungskraft': 'Einsatzleitung, Briefing, Kommunikation nach außen',
  'Fernpilot': 'Steuerung der Drohne, Flugdurchführung',
  'Luftraumbeobachter': 'Überwachung des Luftraums, Warnung bei Konflikten',
  'Bildauswerter': 'Auswertung des Kamerabilds in Echtzeit',
}

const CRITICAL_ROLES = ['Führungskraft', 'Fernpilot', 'Luftraumbeobachter']

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BriefingCard({
  itemKey,
  label,
  checked,
  onToggle,
  children,
}: {
  itemKey: string
  label: string
  checked: boolean
  onToggle: (key: string) => void
  children?: React.ReactNode
}) {
  return (
    <div className="border-b border-surface-alt last:border-b-0">
      <button
        onClick={() => onToggle(itemKey)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
            checked
              ? 'border-good bg-good text-white'
              : 'border-text-muted/30 text-transparent'
          }`}
        >
          <PiCheck />
        </span>
        <p className={`text-sm font-medium transition-colors ${checked ? 'text-text-muted' : 'text-text'}`}>
          {label}
        </p>
      </button>
      {children && (
        <div className="px-4 pb-3 pt-0">
          <div className="rounded-lg bg-surface-alt p-3 text-sm space-y-2">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-text">
      <span className="text-text-muted">{label}:</span> {value}
    </p>
  )
}

function WarningHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-warning text-xs font-medium">
      <PiWarning className="shrink-0" />
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MissionsbriefingSection() {
  const [checked, setChecked] = useMissionPersistedState<Record<string, boolean>>('briefing:checked', {})

  const checkedCount = BRIEFING_ITEMS.filter((item) => checked[item.key]).length
  const totalCount = BRIEFING_ITEMS.length
  const allChecked = checkedCount === totalCount

  const badge = {
    label: `${checkedCount}/${totalCount}`,
    status: allChecked ? ('good' as const) : checkedCount === 0 ? ('warning' as const) : ('caution' as const),
  }

  function toggleCheck(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // --- Read all mission data reactively via store ---

  const [flugAnlassRaw] = useMissionPersistedState<string>('flugAnlass', 'einsatz')
  const flugAnlass = FLUG_ANLASS_LABELS[flugAnlassRaw] ?? flugAnlassRaw
  const [stichwort] = useMissionPersistedState<string>('einsatzstichwort', '')
  const [alarmzeit] = useMissionPersistedState<string>('alarmzeit', '')
  const [einsatzleiter] = useMissionPersistedState<string>('einsatzleiter', '')
  const [abschnittsleiter] = useMissionPersistedState<string>('abschnittsleiter', '')
  const [anforderndeStelle] = useMissionPersistedState<string>('anforderndeStelle', '')

  const [missionTemplate] = useMissionPersistedState<string>('mission_template', '')
  const [missionFreitext] = useMissionPersistedState<string>('mission_freitext', '')
  const templateLabel = TEMPLATE_LABELS[missionTemplate] || missionTemplate

  // Read template-specific fields
  const templateFieldDefs = TEMPLATE_FIELDS[missionTemplate]
  const [templateField0] = useMissionPersistedState<string>(templateFieldDefs?.[0]?.key ?? '__unused_0', '')
  const [templateField1] = useMissionPersistedState<string>(templateFieldDefs?.[1]?.key ?? '__unused_1', '')
  const [templateField2] = useMissionPersistedState<string>(templateFieldDefs?.[2]?.key ?? '__unused_2', '')
  const [templateField3] = useMissionPersistedState<string>(templateFieldDefs?.[3]?.key ?? '__unused_3', '')
  const [templateField4] = useMissionPersistedState<string>(templateFieldDefs?.[4]?.key ?? '__unused_4', '')
  const [templateField5] = useMissionPersistedState<string>(templateFieldDefs?.[5]?.key ?? '__unused_5', '')
  const templateFieldValues = [templateField0, templateField1, templateField2, templateField3, templateField4, templateField5]

  // Crew
  const [crewFk] = useMissionPersistedState<string>('crew_fk', '')
  const [crewFp] = useMissionPersistedState<string>('crew_fp', '')
  const [crewLrb] = useMissionPersistedState<string>('crew_lrb', '')
  const [crewBa] = useMissionPersistedState<string>('crew_ba', '')
  const [crewAdditional] = useMissionPersistedState<Array<{ role: string; name: string }>>('crew_additional', [])

  const crewMembers: Array<{ role: string; name: string }> = []
  if (crewFk.trim()) crewMembers.push({ role: 'Führungskraft', name: crewFk })
  if (crewFp.trim()) crewMembers.push({ role: 'Fernpilot', name: crewFp })
  if (crewLrb.trim()) crewMembers.push({ role: 'Luftraumbeobachter', name: crewLrb })
  if (crewBa.trim()) crewMembers.push({ role: 'Bildauswerter', name: crewBa })
  for (const m of crewAdditional) {
    if (m.name.trim()) {
      crewMembers.push({ role: CREW_ROLE_LABELS[m.role] || m.role, name: m.name })
    }
  }

  // --- Derived content ---

  const missingRoles = CRITICAL_ROLES.filter(
    (r) => !crewMembers.some((m) => m.role === r),
  )

  // Group crew by role for display
  const crewByRole = new Map<string, string[]>()
  for (const m of crewMembers) {
    const names = crewByRole.get(m.role) ?? []
    names.push(m.name)
    crewByRole.set(m.role, names)
  }

  return (
    <ChecklistSection title="Missionsbriefing" icon={<PiMegaphone />} sectionId="missionsbriefing" badge={badge}>
      <div className="-mx-5 -mb-5">
        <div className="divide-y divide-surface-alt">

          {/* 1. Einsatzauftrag bekannt */}
          <BriefingCard itemKey="auftrag" label="Einsatzauftrag bekannt" checked={!!checked['auftrag']} onToggle={toggleCheck}>
            {flugAnlass && <DataRow label="Anlass" value={flugAnlass} />}
            {stichwort && <DataRow label="Stichwort" value={stichwort} />}
            {alarmzeit && <DataRow label="Alarmzeit" value={alarmzeit} />}
            {missionTemplate && <DataRow label="Auftragsart" value={templateLabel} />}
            {templateFieldDefs && templateFieldDefs.map((f, i) => {
              const v = templateFieldValues[i]
              return v ? <DataRow key={f.key} label={f.label} value={v} /> : null
            })}
            {missionFreitext && <p className="text-text italic">{missionFreitext}</p>}
            {!missionTemplate && !stichwort && (
              <p className="text-text-muted text-xs">Noch kein Einsatzauftrag hinterlegt.</p>
            )}
          </BriefingCard>

          {/* 2. Priorisierung bei der Ausführung */}
          <BriefingCard itemKey="priorisierung" label="Priorisierung bei der Ausführung" checked={!!checked['priorisierung']} onToggle={toggleCheck}>
            <p className="text-xs font-semibold text-text-muted mb-1">Merkhilfe — im Team klären:</p>
            <ul className="space-y-0.5">
              {PRIORITY_PROMPTS.map((prompt) => (
                <li key={prompt} className="text-text text-sm flex gap-2">
                  <span className="text-text-muted shrink-0">•</span>
                  {prompt}
                </li>
              ))}
            </ul>
          </BriefingCard>

          {/* 3. Rollenverteilung bekannt? */}
          <BriefingCard itemKey="rollen" label="Rollenverteilung bekannt?" checked={!!checked['rollen']} onToggle={toggleCheck}>
            {crewByRole.size > 0 ? (
              <div className="space-y-0.5">
                {[...crewByRole.entries()].map(([role, names]) => (
                  <p key={role} className="text-text text-sm">
                    <span className="font-medium">{role}:</span> {names.join(', ')}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-xs">Keine Crew-Mitglieder hinterlegt.</p>
            )}
            {missingRoles.length > 0 && (
              <WarningHint>
                Fehlende Rolle{missingRoles.length > 1 ? 'n' : ''}: {missingRoles.join(', ')}
              </WarningHint>
            )}
          </BriefingCard>

          {/* 4. Aufgaben klar? */}
          <BriefingCard itemKey="aufgaben" label="Aufgaben klar?" checked={!!checked['aufgaben']} onToggle={toggleCheck}>
            {crewByRole.size > 0 ? (
              <div className="space-y-1.5">
                {[...crewByRole.entries()].map(([role, names]) => {
                  const task = ROLE_TASKS[role]
                  if (!task) return null
                  return (
                    <div key={role}>
                      <p className="text-text font-medium text-sm">{role} ({names.join(', ')})</p>
                      <p className="text-text text-sm ml-0.5">{task}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-text-muted text-xs">Aufgabenverteilung individuell klären.</p>
            )}
          </BriefingCard>

          {/* 5. Kommunikation sicher? */}
          <BriefingCard itemKey="kommunikation" label="Kommunikation sicher?" checked={!!checked['kommunikation']} onToggle={toggleCheck}>
            {(abschnittsleiter || einsatzleiter || anforderndeStelle) ? (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-text-muted mb-1">Ansprechpartner</p>
                {abschnittsleiter && <DataRow label="AL" value={abschnittsleiter} />}
                {einsatzleiter && <DataRow label="EL" value={einsatzleiter} />}
                {anforderndeStelle && <DataRow label="Anfordernde Stelle" value={anforderndeStelle} />}
              </div>
            ) : (
              <p className="text-text-muted text-xs">Keine Ansprechpartner hinterlegt.</p>
            )}
            <p className="text-text text-sm italic">Funkkanal / Kommunikationsweg klären</p>
          </BriefingCard>

        </div>
      </div>
    </ChecklistSection>
  )
}
