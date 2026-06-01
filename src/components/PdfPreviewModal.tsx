import { useEffect, useMemo } from 'react'
import { PiX, PiDownloadSimple, PiShareNetwork, PiArrowSquareOut, PiFilePdf } from 'react-icons/pi'
import { downloadPdf, sharePdf, canSharePdf } from '../utils/generateReport'

interface PdfPreviewModalProps {
  /** Das anzuzeigende PDF. */
  blob: Blob
  /** Dateiname für Download/Teilen. */
  filename: string
  onClose: () => void
}

/**
 * Vollbild-Vorschau eines PDF-Blobs (z. B. das Abschlussdokument vor der
 * Unterschrift). Bettet das PDF in einem `<iframe>` ein; da iOS Safari ein
 * Blob-PDF im iframe häufig leer rendert, stehen Teilen/Herunterladen/In neuem
 * Tab IMMER sichtbar als Fallback bereit. Die Blob-URL wird erst beim Schließen
 * freigegeben (nicht sofort), damit die Vorschau nicht abbricht.
 */
export default function PdfPreviewModal({ blob, filename, onClose }: PdfPreviewModalProps) {
  // Blob-URL beim Render ableiten und erst beim Schliessen/Unmount freigeben
  // (nicht sofort wie beim Download — sonst bricht die offene Vorschau ab).
  const url = useMemo(() => URL.createObjectURL(blob), [blob])

  useEffect(() => () => URL.revokeObjectURL(url), [url])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function handleOpenTab() {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleShare() {
    sharePdf(blob, filename).catch(() => {
      /* vom Nutzer abgebrochen */
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-base">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-text-muted/15 bg-surface px-3 py-3">
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
          aria-label="Vorschau schliessen"
        >
          <PiX className="text-xl" />
        </button>
        <h2 className="flex flex-1 items-center gap-2 text-sm font-medium text-text">
          <PiFilePdf className="text-base text-text-muted" />
          Dokument-Vorschau
        </h2>
        <div className="flex items-center gap-1">
          {canSharePdf() && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
              aria-label="PDF teilen"
              title="Teilen"
            >
              <PiShareNetwork className="text-lg" />
            </button>
          )}
          <button
            onClick={handleOpenTab}
            className="flex items-center justify-center rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
            aria-label="In neuem Tab öffnen"
            title="In neuem Tab öffnen"
          >
            <PiArrowSquareOut className="text-lg" />
          </button>
          <button
            onClick={() => downloadPdf(blob, filename)}
            className="flex items-center justify-center rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
            aria-label="PDF herunterladen"
            title="Herunterladen"
          >
            <PiDownloadSimple className="text-lg" />
          </button>
        </div>
      </div>

      {/* PDF-Einbettung (Fallback-Aktionen oben für iOS, wo das iframe leer bleiben kann) */}
      <iframe src={url} title="PDF-Vorschau" className="w-full flex-1 border-0 bg-white" />
    </div>
  )
}
