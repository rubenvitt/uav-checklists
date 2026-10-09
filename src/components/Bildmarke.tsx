/**
 * Bildmarke der Flugmappe, nach dem Vorbild der „Lebenslinie" von Lifeline Hub:
 * eine helle Flugbahn steigt auf und endet in einem Quadrat in `marke`.
 * Die Linie trägt die Textfarbe ihres Grundes, Rot bleibt Akzent.
 */
export default function Bildmarke({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <path
        d="M1.5 18.5h6l3-4.5 2.5 2 3.5-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <rect x="15" y="1.5" width="6" height="6" fill="var(--color-marke)" />
    </svg>
  )
}
