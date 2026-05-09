import type { SigningSettings, VerificationResult } from '../types/signing'

const STORAGE_KEY = 'uav-signing:settings'

export function getSigningSettings(): SigningSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SigningSettings
  } catch {
    return null
  }
}

export function setSigningSettings(settings: SigningSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function clearSigningSettings(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function isSigningConfigured(): boolean {
  const settings = getSigningSettings()
  return !!settings && settings.backendUrl.trim().length > 0
}

function getBaseUrl(): string {
  const settings = getSigningSettings()
  if (!settings || !settings.backendUrl.trim()) {
    throw new Error('Signatur-Backend ist nicht konfiguriert.')
  }
  return settings.backendUrl.replace(/\/+$/, '')
}

function buildRequest(blob: Blob, filename: string, accessToken?: string): { headers: Record<string, string>; body: FormData } {
  const formData = new FormData()
  formData.append('file', blob, filename)

  const headers: Record<string, string> = {}
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return { headers, body: formData }
}

function throwAuthError(): never {
  throw new Error('Authentifizierung fehlgeschlagen. Bitte erneut anmelden.')
}

export async function signPdf(blob: Blob, filename: string, accessToken?: string): Promise<Blob> {
  const baseUrl = getBaseUrl()
  const { headers, body } = buildRequest(blob, filename, accessToken)

  const response = await fetch(`${baseUrl}/api/v1/sign`, {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    if (response.status === 401) throwAuthError()
    if (response.status === 413) {
      throw new Error('Die PDF-Datei ist zu groß für die Signatur.')
    }
    throw new Error(`Signatur fehlgeschlagen (Fehler ${response.status}). Bitte später erneut versuchen.`)
  }

  return response.blob()
}

export async function verifyPdf(blob: Blob, filename: string, accessToken?: string): Promise<VerificationResult> {
  const baseUrl = getBaseUrl()
  const { headers, body } = buildRequest(blob, filename, accessToken)

  const response = await fetch(`${baseUrl}/api/v1/verify`, {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    if (response.status === 401) throwAuthError()
    throw new Error(`Verifizierung fehlgeschlagen (Fehler ${response.status}).`)
  }

  return response.json() as Promise<VerificationResult>
}
