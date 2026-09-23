import type { ReactNode } from 'react'
import { PiArrowSquareOut, PiBookOpen, PiCaretDown } from 'react-icons/pi'
import type { ArcClass } from './ArcDetermination'
import type { OsoRobustness, SoraAnnexId, SoraCitation } from '../types/sora'
import {
  ADJACENT_AREA_CITATION,
  ADJACENT_AREA_TEXT,
  AIR_RISK_CITATION,
  ARC_DESCRIPTIONS,
  GROUND_MITIGATION_CITATION,
  GROUND_MITIGATION_RULE,
  GROUND_RISK_MITIGATIONS,
  INITIAL_ARC_TEXT,
  INTRINSIC_GRC_CITATION,
  INTRINSIC_GRC_COLUMNS,
  INTRINSIC_GRC_ROWS,
  OSO_CITATION,
  OSO_GROUPS,
  OSO_ROBUSTNESS_LABELS,
  OSO_TRANSLATION_NOTE,
  OSOS,
  PDRA_CITATION,
  PDRA_INTRO,
  PDRA_OVERVIEW,
  SAIL_ROMAN,
  SORA_ANNEXES,
  SORA_VERSION,
  STRATEGIC_AIR_MITIGATION_TEXT,
  STS_BOS_AIRSPACE_CITATION,
  STS_BOS_AIRSPACE_RULES,
  STS_BOS_BUFFER_CITATION,
  STS_BOS_BUFFER_TABLES,
  STS_BOS_CITATION,
  STS_BOS_COMMON_CONDITIONS,
  STS_BOS_DENSITY_HINTS,
  STS_BOS_GROUND_CITATION,
  STS_BOS_GROUND_MITIGATIONS,
  STS_BOS_NOTES,
  STS_BOS_SCENARIOS,
  TMPR_BVLOS_TEXT,
  TMPR_CITATION,
  TMPR_REQUIREMENTS,
  TMPR_TABLE_CITATION,
  TMPR_VLOS_TEXT,
  formatCitation,
  formatOsoNumber,
  getOsoRobustness,
  getTmpr,
  groupOsosByRobustness,
  soraAnnexElementId,
  toSoraArc,
} from '../data/sora'

// ── Bausteine ────────────────────────────────────────────────────────────

const robustnessStyles: Record<OsoRobustness, string> = {
  O: 'bg-surface-alt text-text-muted',
  L: 'bg-good-bg text-good',
  M: 'bg-caution-bg text-caution',
  H: 'bg-warning-bg text-warning',
}

function RobustnessBadge({ value }: { value: OsoRobustness }) {
  return (
    <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-0.5 text-[11px] font-semibold ${robustnessStyles[value]}`}>
      {value}
    </span>
  )
}

function Citation({ citation }: { citation: SoraCitation }) {
  return (
    <p className="text-[11px] text-text-muted">
      Quelle:{' '}
      <a
        href={citation.source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-text-muted/40 underline-offset-2 hover:text-text"
      >
        {formatCitation(citation)}
        <PiArrowSquareOut className="ml-0.5 inline align-[-2px]" />
      </a>
    </p>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{title}</p>
      {children}
    </div>
  )
}

function Text({ children }: { children: ReactNode }) {
  return <p className="text-sm text-text">{children}</p>
}

function Hint({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'caution'; children: ReactNode }) {
  const tones = {
    neutral: 'border-surface-alt bg-surface-alt text-text',
    good: 'border-good/30 bg-good-bg text-good',
    caution: 'border-caution/30 bg-caution-bg text-caution',
  }
  return <div className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}>{children}</div>
}

// ── Anhänge ──────────────────────────────────────────────────────────────

function BodenrisikoAnnex() {
  return (
    <div className="space-y-4">
      <Block title="Drohnenbezogene Bodenrisikoklasse (GRC)">
        <div className="overflow-x-auto rounded-lg bg-surface-alt">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface">
                <th className="px-2 py-1.5 text-left font-medium text-text-muted">Einsatzszenario</th>
                {INTRINSIC_GRC_COLUMNS.map((c) => (
                  <th key={c.dimension} className="whitespace-nowrap px-2 py-1.5 text-center font-medium text-text-muted">
                    {c.dimension}
                    <span className="block text-[10px] font-normal">{c.energy}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INTRINSIC_GRC_ROWS.map((row) => (
                <tr key={row.scenario} className="border-b border-surface last:border-0">
                  <td className="min-w-36 px-2 py-1.5 text-text">{row.scenario}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="px-2 py-1.5 text-center text-text">{v ?? '–'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Citation citation={INTRINSIC_GRC_CITATION} />
      </Block>

      <Block title="Minderungen des Bodenrisikos (M1–M3)">
        <div className="overflow-x-auto rounded-lg bg-surface-alt">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface">
                <th className="px-2 py-1.5 text-left font-medium text-text-muted">Minderung</th>
                <th className="px-2 py-1.5 text-center font-medium text-text-muted">Niedrig/keine</th>
                <th className="px-2 py-1.5 text-center font-medium text-text-muted">Mittel</th>
                <th className="px-2 py-1.5 text-center font-medium text-text-muted">Hoch</th>
              </tr>
            </thead>
            <tbody>
              {GROUND_RISK_MITIGATIONS.map((m) => (
                <tr key={m.id} className="border-b border-surface last:border-0">
                  <td className="px-2 py-1.5 text-text">
                    <span className="font-semibold">{m.id}</span> {m.label}
                  </td>
                  <td className="px-2 py-1.5 text-center text-text">{m.lowOrNone}</td>
                  <td className="px-2 py-1.5 text-center text-text">{m.medium}</td>
                  <td className="px-2 py-1.5 text-center text-text">{m.high}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Text>{GROUND_MITIGATION_RULE}</Text>
        <Citation citation={GROUND_MITIGATION_CITATION} />
      </Block>

      <Block title="Konkretisierung in den STS-BOS">
        <ul className="space-y-2">
          {STS_BOS_GROUND_MITIGATIONS.map((m) => (
            <li key={m.label} className="text-sm">
              <p className="font-medium text-text">{m.label}</p>
              <p className="text-text-muted">{m.text}</p>
            </li>
          ))}
        </ul>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-muted">
          {STS_BOS_DENSITY_HINTS.map((h) => <li key={h}>{h}</li>)}
        </ul>
        <Citation citation={STS_BOS_GROUND_CITATION} />
      </Block>

      <Block title="Grenzabstand (Contingency Volume + Ground Risk Buffer)">
        <p className="text-xs text-text-muted">Multikopter, max. charakteristische Dimension 1,5 m, ballistischer Ansatz</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {STS_BOS_BUFFER_TABLES.map((t) => (
            <div key={t.title} className="space-y-1.5">
              <div className="overflow-hidden rounded-lg bg-surface-alt">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface">
                      <th colSpan={3} className="px-2 py-1.5 text-left font-medium text-text">{t.title}</th>
                    </tr>
                    <tr className="border-b border-surface">
                      <th className="px-2 py-1 text-left font-medium text-text-muted">Flughöhe</th>
                      <th className="px-2 py-1 text-right font-medium text-text-muted">Grenzabstand</th>
                      <th className="px-2 py-1 text-right font-medium text-text-muted">CV + GRB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r) => (
                      <tr key={r.height} className="border-b border-surface last:border-0">
                        <td className="px-2 py-1 text-text">{r.height} m</td>
                        <td className="px-2 py-1 text-right font-medium text-text">{r.total}</td>
                        <td className="px-2 py-1 text-right text-text-muted">{r.parts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-text-muted">Tipp: {t.tip}</p>
            </div>
          ))}
        </div>
        <Citation citation={STS_BOS_BUFFER_CITATION} />
      </Block>
    </div>
  )
}

function LuftrisikoAnnex({ arc }: { arc: ArcClass | null }) {
  const soraArc = toSoraArc(arc)
  return (
    <div className="space-y-4">
      <Block title="Initiale Luftrisikokategorie (ARC)">
        <Text>{INITIAL_ARC_TEXT}</Text>
        <ul className="space-y-1.5">
          {(['a', 'b', 'c', 'd'] as const).map((k) => {
            const active = soraArc === k
            return (
              <li
                key={k}
                className={`rounded-lg px-3 py-2 text-sm ${active ? 'bg-text/5 ring-1 ring-text/20' : 'bg-surface-alt'}`}
              >
                <span className="font-semibold text-text">ARC-{k}{active && ' (aktuell)'}</span>
                <span className="block text-text-muted">{ARC_DESCRIPTIONS[k]}</span>
              </li>
            )
          })}
        </ul>
        {arc === 'c-star' && (
          <Hint tone="caution">ARC-c* ist keine Luftrisikoklasse der SORA 2.0, sondern eine Einstufung aus dem Betriebshandbuch.</Hint>
        )}
        <Citation citation={AIR_RISK_CITATION} />
      </Block>

      <Block title="Strategische Minderung (optional)">
        <Text>{STRATEGIC_AIR_MITIGATION_TEXT}</Text>
        <Citation citation={AIR_RISK_CITATION} />
      </Block>

      <Block title="Angrenzende Flächen/Lufträume">
        <Text>{ADJACENT_AREA_TEXT}</Text>
        <Citation citation={ADJACENT_AREA_CITATION} />
      </Block>

      <Block title="Kontrollzone und ED-R (STS-BOS)">
        <ul className="space-y-2">
          {STS_BOS_AIRSPACE_RULES.map((r) => (
            <li key={r.label} className="text-sm">
              <p className="font-medium text-text">{r.label}</p>
              <p className="text-text-muted">{r.text}</p>
            </li>
          ))}
        </ul>
        <Citation citation={STS_BOS_AIRSPACE_CITATION} />
      </Block>
    </div>
  )
}

function TmprAnnex({ arc, flightType }: { arc: ArcClass | null; flightType: 'vlos' | 'bvlos' | null }) {
  const result = getTmpr(flightType, arc)
  const activeArc = result.kind === 'bvlos' ? result.requirement.arc : null

  return (
    <div className="space-y-4">
      {result.kind === 'vlos' && (
        <Hint tone="good">VLOS-Betrieb: keine weiteren TMPR erforderlich – De-Confliction-Schema dokumentieren.</Hint>
      )}
      {result.kind === 'bvlos' && result.requirement.arc === 'a' && (
        <Hint tone="good">BVLOS-Betrieb in ARC-a: keine TMPR-Anforderung.</Hint>
      )}
      {result.kind === 'bvlos' && result.requirement.arc !== 'a' && (
        <Hint tone="caution">
          BVLOS-Betrieb in ARC-{result.requirement.arc}: TMPR {result.requirement.tmpr} · Robustheit {result.requirement.robustness}
        </Hint>
      )}
      {result.kind === 'bvlos-unmapped' && (
        <Hint tone="caution">
          BVLOS-Betrieb: Die aktuelle Luftrisikoklasse lässt sich keiner SORA-ARC eindeutig zuordnen – TMPR gemäß Betriebshandbuch festlegen.
        </Hint>
      )}

      <Block title="VLOS-/EVLOS-Betrieb">
        <Text>{TMPR_VLOS_TEXT}</Text>
        <Citation citation={TMPR_CITATION} />
      </Block>

      <Block title="BVLOS-Betrieb">
        <Text>{TMPR_BVLOS_TEXT}</Text>
        <div className="overflow-x-auto rounded-lg bg-surface-alt">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface">
                <th className="px-2 py-1.5 text-left font-medium text-text-muted">Verbleibende ARC</th>
                <th className="px-2 py-1.5 text-left font-medium text-text-muted">TMPR</th>
                <th className="px-2 py-1.5 text-left font-medium text-text-muted">TMPR-Robustheit</th>
              </tr>
            </thead>
            <tbody>
              {TMPR_REQUIREMENTS.map((r) => {
                const active = activeArc === r.arc
                return (
                  <tr key={r.arc} className={`border-b border-surface last:border-0 ${active ? 'bg-text/5 font-semibold' : ''}`}>
                    <td className="px-2 py-1.5 text-text">{active ? '→ ' : ''}ARC-{r.arc}</td>
                    <td className="px-2 py-1.5 text-text">{r.tmpr}</td>
                    <td className="px-2 py-1.5 text-text">{r.robustness}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Citation citation={TMPR_CITATION} />
        <Citation citation={TMPR_TABLE_CITATION} />
      </Block>
    </div>
  )
}

function OsoAnnex({ sail }: { sail: number | null }) {
  const groups = sail !== null ? groupOsosByRobustness(sail) : []

  return (
    <div className="space-y-4">
      {sail !== null && (
        <div className="space-y-1.5 rounded-lg bg-surface-alt px-3 py-2.5">
          <p className="text-sm font-medium text-text">Geforderte Robustheit für SAIL {SAIL_ROMAN[sail - 1]}</p>
          {groups.map((g) => (
            <div key={g.robustness} className="flex items-start gap-2 text-xs">
              <RobustnessBadge value={g.robustness} />
              <span className="text-text-muted">
                <span className="font-medium text-text">{OSO_ROBUSTNESS_LABELS[g.robustness]}:</span>{' '}
                {g.numbers.map((n) => `#${String(n).padStart(2, '0')}`).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
        {(Object.keys(OSO_ROBUSTNESS_LABELS) as OsoRobustness[]).map((r) => (
          <span key={r} className="inline-flex items-center gap-1">
            <RobustnessBadge value={r} /> {OSO_ROBUSTNESS_LABELS[r]}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg bg-surface-alt">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col />
            {SAIL_ROMAN.map((s) => <col key={s} className="w-7" />)}
          </colgroup>
          <thead>
            <tr className="border-b border-surface">
              <th className="px-2 py-1.5 text-left font-medium text-text-muted">OSO</th>
              {SAIL_ROMAN.map((s, i) => (
                <th
                  key={s}
                  className={`px-0.5 py-1.5 text-center font-medium ${sail === i + 1 ? 'bg-text/10 text-text' : 'text-text-muted'}`}
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {OSO_GROUPS.map((group) => (
              <GroupRows key={group.id} label={group.label} groupId={group.id} sail={sail} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-muted">{OSO_TRANSLATION_NOTE}</p>
      <Citation citation={OSO_CITATION} />
    </div>
  )
}

function GroupRows({ label, groupId, sail }: { label: string; groupId: string; sail: number | null }) {
  return (
    <>
      <tr className="border-b border-surface">
        <td colSpan={7} className="px-2 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</td>
      </tr>
      {OSOS.filter((o) => o.group === groupId).map((oso) => (
        <tr key={oso.number} className="border-b border-surface last:border-0">
          <td className="px-2 py-1.5 align-top text-text hyphens-auto wrap-break-word">
            <span className="font-semibold">{formatOsoNumber(oso.number)}</span>
            <span className="block text-text-muted">{oso.label}</span>
          </td>
          {SAIL_ROMAN.map((s, i) => (
            <td key={s} className={`px-0.5 py-1.5 text-center align-top ${sail === i + 1 ? 'bg-text/10' : ''}`}>
              <RobustnessBadge value={getOsoRobustness(oso, i + 1)} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function PdraAnnex() {
  return (
    <div className="space-y-4">
      <Block title="Predefined Risk Assessments (PDRA)">
        {PDRA_INTRO.map((p) => <Text key={p}>{p}</Text>)}
        <div className="grid gap-2 sm:grid-cols-2">
          {PDRA_OVERVIEW.map((p) => (
            <div key={p.id} className="rounded-lg bg-surface-alt px-3 py-2 text-xs">
              <p className="text-sm font-semibold text-text">
                {p.id}
                {p.note && <span className="font-normal text-text-muted"> ({p.note})</span>}
              </p>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                <dt className="text-text-muted">Betriebsart</dt><dd className="text-text">{p.betriebsart}</dd>
                <dt className="text-text-muted">Einsatzgebiet</dt><dd className="text-text">{p.einsatzgebiet}</dd>
                <dt className="text-text-muted">Luftraum</dt><dd className="text-text">{p.luftraum}</dd>
                <dt className="text-text-muted">Max. Flughöhe</dt><dd className="text-text">{p.maxFlughoehe}</dd>
              </dl>
            </div>
          ))}
        </div>
        <Citation citation={PDRA_CITATION} />
      </Block>

      <Block title="BOS-Standardszenarien (STS-BOS)">
        <ul className="list-disc space-y-1 pl-5 text-sm text-text">
          {STS_BOS_COMMON_CONDITIONS.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <div className="space-y-2">
          {STS_BOS_SCENARIOS.map((s) => (
            <div key={s.id} className="space-y-2 rounded-lg bg-surface-alt px-3 py-2.5">
              <p className="text-sm font-semibold text-text">
                {s.id} {s.title} <span className="font-normal text-text-muted">({s.subtitle})</span>
              </p>
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-text-muted">
                {s.conditions.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
                <dt className="font-medium text-text">VLOS ≤ 1 m</dt><dd className="text-text">{s.vlos.upTo1m}</dd>
                <dt className="font-medium text-text">VLOS &gt; 1 m bis &lt; 3 m</dt><dd className="text-text">{s.vlos.upTo3m}</dd>
                <dt className="font-medium text-text">BVLOS ≤ 1 m</dt><dd className="text-text">{s.bvlos.upTo1m}</dd>
                <dt className="font-medium text-text">BVLOS &gt; 1 m bis &lt; 3 m</dt><dd className="text-text">{s.bvlos.upTo3m}</dd>
              </dl>
            </div>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-text-muted">
          {STS_BOS_NOTES.map((n) => <li key={n}>{n}</li>)}
        </ul>
        <Citation citation={STS_BOS_CITATION} />
      </Block>
    </div>
  )
}

// ── Container ────────────────────────────────────────────────────────────

interface SoraAnnexesProps {
  idPrefix: string
  openAnnex: SoraAnnexId | null
  onToggle: (annex: SoraAnnexId) => void
  sail: number | null
  arc: ArcClass | null
  flightType: 'vlos' | 'bvlos' | null
}

export default function SoraAnnexes({ idPrefix, openAnnex, onToggle, sail, arc, flightType }: SoraAnnexesProps) {
  const renderAnnex = (annex: SoraAnnexId) => {
    switch (annex) {
      case 'bodenrisiko': return <BodenrisikoAnnex />
      case 'luftrisiko': return <LuftrisikoAnnex arc={arc} />
      case 'tmpr': return <TmprAnnex arc={arc} flightType={flightType} />
      case 'oso': return <OsoAnnex sail={sail} />
      case 'pdra': return <PdraAnnex />
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-muted">
        Referenz nach EGRED 2 (Anlage III) und STS-BOS auf Basis der SORA {SORA_VERSION}.
      </p>
      {SORA_ANNEXES.map((annex) => {
        const isOpen = openAnnex === annex.id
        return (
          <div key={annex.id} id={soraAnnexElementId(idPrefix, annex.id)} className="scroll-mt-4 overflow-hidden rounded-lg border border-surface-alt">
            <button
              onClick={() => onToggle(annex.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-alt"
            >
              <PiBookOpen className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text">{annex.title}</span>
                <span className="block text-xs text-text-muted">{annex.subtitle}</span>
              </span>
              <PiCaretDown className={`shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="border-t border-surface-alt px-3 py-3">{renderAnnex(annex.id)}</div>}
          </div>
        )
      })}
    </div>
  )
}

interface SoraAnnexLinkProps {
  annex: SoraAnnexId
  onOpen: (annex: SoraAnnexId) => void
}

/** Verweis aus der Risikoklassifizierung auf einen SORA-Anhang */
export function SoraAnnexLink({ annex, onOpen }: SoraAnnexLinkProps) {
  const meta = SORA_ANNEXES.find((a) => a.id === annex)
  if (!meta) return null
  return (
    <button
      onClick={() => onOpen(annex)}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
    >
      <PiBookOpen className="shrink-0" />
      {meta.title}
    </button>
  )
}
