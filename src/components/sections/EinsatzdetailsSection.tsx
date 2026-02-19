import { PiClipboardText } from 'react-icons/pi'
import { useMissionPersistedState } from '../../hooks/useMissionPersistedState'
import AutocompleteInput from '../AutocompleteInput'
import FlightPurposeSelector, { type FlightPurpose } from '../FlightPurposeSelector'
import ChecklistSection from '../ChecklistSection'

const STICHWORT_OPTIONS = ['Personensuche', 'B3Y', 'B4Y', 'W2Y', 'W3Y', 'n/a', 'Übung']
const ALARMIERUNG_OPTIONS = ['Leitstelle']
const ANFORDERNDE_STELLE_OPTIONS = ['Polizei', 'Feuerwehr', 'Eigene BOS']

export default function EinsatzdetailsSection() {
  const [flugAnlass, setFlugAnlass] = useMissionPersistedState<FlightPurpose>('flugAnlass', 'einsatz')
  const [stichwort, setStichwort] = useMissionPersistedState('einsatzstichwort', '')
  const [alarmzeit, setAlarmzeit] = useMissionPersistedState('alarmzeit', '')
  const [alarmierungDurch, setAlarmierungDurch] = useMissionPersistedState('alarmierungDurch', '')
  const [anforderndeStelle, setAnforderndeStelle] = useMissionPersistedState('anforderndeStelle', '')
  const [einsatzleiter, setEinsatzleiter] = useMissionPersistedState('einsatzleiter', '')
  const [abschnittsleiter, setAbschnittsleiter] = useMissionPersistedState('abschnittsleiter', '')

  return (
    <ChecklistSection title="Einsatzdetails" icon={<PiClipboardText />} defaultOpen>
      <div className="-mx-5 -mb-5 -mt-1 divide-y divide-surface-alt">
        <FlightPurposeSelector value={flugAnlass} onChange={setFlugAnlass} />
        <AutocompleteInput
          label="Einsatzstichwort"
          value={stichwort}
          onChange={setStichwort}
          suggestions={STICHWORT_OPTIONS}
          placeholder="z.B. Personensuche, B3Y..."
        />
        <div className="px-4 py-3">
          <label className="mb-1 block text-xs text-text-muted">Alarmzeit</label>
          <input
            type="time"
            value={alarmzeit}
            onChange={(e) => setAlarmzeit(e.target.value)}
            className="w-full rounded-lg bg-surface-alt px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
          />
        </div>
        <AutocompleteInput
          label="Alarmierung durch"
          value={alarmierungDurch}
          onChange={setAlarmierungDurch}
          suggestions={ALARMIERUNG_OPTIONS}
          placeholder="z.B. Leitstelle"
        />
        <AutocompleteInput
          label="Anfordernde Stelle"
          value={anforderndeStelle}
          onChange={setAnforderndeStelle}
          suggestions={ANFORDERNDE_STELLE_OPTIONS}
          placeholder="z.B. Polizei, Feuerwehr..."
        />
        <AutocompleteInput
          label="Einsatzleiter"
          value={einsatzleiter}
          onChange={setEinsatzleiter}
          suggestions={[]}
          placeholder="Name eingeben..."
        />
        <AutocompleteInput
          label="Abschnittsleiter (eigene BOS)"
          value={abschnittsleiter}
          onChange={setAbschnittsleiter}
          suggestions={[]}
          placeholder="Name eingeben..."
        />
      </div>
    </ChecklistSection>
  )
}
