import { useState } from 'react'
import { signPdf, isSigningConfigured } from '../services/signingApi'
import { downloadPdf } from '../utils/generateReport'

export function useSignPdf(accessToken?: string): {
  signAndDownload: (blob: Blob, filename: string) => Promise<void>
  signing: boolean
  error: string | null
  clearError: () => void
  available: boolean
} {
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const available = isSigningConfigured()

  const clearError = () => setError(null)

  const signAndDownload = async (blob: Blob, filename: string) => {
    setSigning(true)
    setError(null)
    try {
      const signedBlob = await signPdf(blob, filename, accessToken)
      const signedFilename = filename.replace(/\.pdf$/i, '_signiert.pdf')
      downloadPdf(signedBlob, signedFilename)
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Signatur fehlgeschlagen. Bitte spaeter erneut versuchen.'
      setError(message)
    } finally {
      setSigning(false)
    }
  }

  return { signAndDownload, signing, error, clearError, available }
}
