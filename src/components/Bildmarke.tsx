/**
 * Bildmarke der Flugmappe: ein Quadrokopter von oben, im Stil der „Lebenslinie" von
 * Lifeline Hub. Arme und Rumpf tragen die Textfarbe ihres Grundes, die Rotorkreise
 * sind `marke`, Rot bleibt Akzent. Dieselbe Geometrie wie `public/favicon.svg`
 * (64er Raster) und die Marke der Landingpage.
 */
export default function Bildmarke({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="9 9 46 46" aria-hidden="true" className="shrink-0">
      <path
        d="M32 32 19 19M32 32 45 19M32 32 19 45M32 32 45 45"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <g fill="none" stroke="var(--color-marke)" strokeWidth="3.5">
        <circle cx="17.5" cy="17.5" r="6.5" />
        <circle cx="46.5" cy="17.5" r="6.5" />
        <circle cx="17.5" cy="46.5" r="6.5" />
        <circle cx="46.5" cy="46.5" r="6.5" />
      </g>
      <rect x="26.5" y="26.5" width="11" height="11" fill="currentColor" />
    </svg>
  )
}
