import { PiListChecks, PiMagnifyingGlass, PiBinoculars, PiPackage, PiEye, PiNotePencil } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import ChecklistSection from '../ChecklistSection'

type MissionTemplate = 'personensuche' | 'erkundung' | 'transport' | 'ueberwachung' | 'custom'

const MISSION_TEMPLATES: Array<{ key: MissionTemplate; label: string; icon: typeof PiMagnifyingGlass }> = [
  { key: 'personensuche', label: 'Personensuche', icon: PiMagnifyingGlass },
  { key: 'erkundung', label: 'Erkundung', icon: PiBinoculars },
  { key: 'transport', label: 'Transport', icon: PiPackage },
  { key: 'ueberwachung', label: 'Überwachung', icon: PiEye },
  { key: 'custom', label: 'Sonstiges', icon: PiNotePencil },
]

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-muted">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? `${label}...`}
        className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
      />
    </div>
  )
}

export default function EinsatzauftragSection() {
  const [template, setTemplate] = useMissionPersistedState<MissionTemplate | ''>('mission_template', '')

  // Personensuche
  const [personName, setPersonName] = useMissionPersistedState('mission_person_name', '')
  const [personAlter, setPersonAlter] = useMissionPersistedState('mission_person_alter', '')
  const [personGeschlecht, setPersonGeschlecht] = useMissionPersistedState('mission_person_geschlecht', '')
  const [personPosition, setPersonPosition] = useMissionPersistedState('mission_person_position', '')
  const [personKleidung, setPersonKleidung] = useMissionPersistedState('mission_person_kleidung', '')
  const [personVermisst, setPersonVermisst] = useMissionPersistedState('mission_person_vermisst_seit', '')

  // Erkundung
  const [erkundungGebiet, setErkundungGebiet] = useMissionPersistedState('mission_erkundung_gebiet', '')
  const [erkundungArt, setErkundungArt] = useMissionPersistedState('mission_erkundung_art', '')

  // Transport
  const [transportGut, setTransportGut] = useMissionPersistedState('mission_transport_gut', '')
  const [transportZiel, setTransportZiel] = useMissionPersistedState('mission_transport_ziel', '')

  // Überwachung
  const [ueberwachungObjekt, setUeberwachungObjekt] = useMissionPersistedState('mission_ueberwachung_objekt', '')
  const [ueberwachungDauer, setUeberwachungDauer] = useMissionPersistedState('mission_ueberwachung_dauer', '')

  // Freitext
  const [freitext, setFreitext] = useMissionPersistedState('mission_freitext', '')

  return (
    <ChecklistSection title="Einsatzauftrag" icon={<PiListChecks />} defaultOpen>
      <div>
        <p className="mb-2 text-xs text-text-muted">Art des Auftrags</p>
        <div className="flex flex-wrap gap-2">
          {MISSION_TEMPLATES.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTemplate(template === t.key ? '' : t.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  template === t.key
                    ? 'bg-text text-base'
                    : 'bg-surface-alt text-text-muted hover:text-text'
                }`}
              >
                <Icon className="text-sm" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {template === 'personensuche' && (
        <div className="space-y-3">
          <InputField label="Name / Beschreibung der Person" value={personName} onChange={setPersonName} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Alter" value={personAlter} onChange={setPersonAlter} placeholder="z.B. ca. 75" />
            <InputField label="Geschlecht" value={personGeschlecht} onChange={setPersonGeschlecht} placeholder="z.B. männlich" />
          </div>
          <InputField label="Letzte bekannte Position" value={personPosition} onChange={setPersonPosition} placeholder="z.B. Waldrand Nähe Parkplatz" />
          <InputField label="Kleidung / auffällige Merkmale" value={personKleidung} onChange={setPersonKleidung} />
          <InputField label="Seit wann vermisst" value={personVermisst} onChange={setPersonVermisst} placeholder="z.B. seit 14:30 Uhr" />
        </div>
      )}

      {template === 'erkundung' && (
        <div className="space-y-3">
          <InputField label="Erkundungsgebiet / -objekt" value={erkundungGebiet} onChange={setErkundungGebiet} />
          <InputField label="Art der Erkundung" value={erkundungArt} onChange={setErkundungArt} placeholder="z.B. Schadenlage, Hochwasser, Gelände" />
        </div>
      )}

      {template === 'transport' && (
        <div className="space-y-3">
          <InputField label="Transportgut" value={transportGut} onChange={setTransportGut} />
          <InputField label="Zielort" value={transportZiel} onChange={setTransportZiel} />
        </div>
      )}

      {template === 'ueberwachung' && (
        <div className="space-y-3">
          <InputField label="Überwachungsobjekt / -gebiet" value={ueberwachungObjekt} onChange={setUeberwachungObjekt} />
          <InputField label="Dauer / Intervall" value={ueberwachungDauer} onChange={setUeberwachungDauer} placeholder="z.B. 2h, alle 30min" />
        </div>
      )}

      {template && (
        <div>
          <label className="mb-1 block text-xs text-text-muted">Weitere Informationen / Besonderheiten</label>
          <textarea
            value={freitext}
            onChange={(e) => setFreitext(e.target.value)}
            placeholder="Zusätzliche Informationen zum Einsatzauftrag..."
            rows={3}
            className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted resize-none"
          />
        </div>
      )}
    </ChecklistSection>
  )
}
