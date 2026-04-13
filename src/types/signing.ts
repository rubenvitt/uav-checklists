export interface SigningSettings {
  backendUrl: string
}

export interface SignatureInfo {
  signer: string
  timestamp: string | null
  level: string
  intact: boolean
  valid: boolean
  trusted: boolean
  isTimestamp?: boolean
  note?: string
}

export interface VerificationResult {
  valid: boolean
  signatures: SignatureInfo[]
}
