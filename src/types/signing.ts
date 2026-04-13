export interface SigningSettings {
  backendUrl: string
}

export interface VerificationResult {
  valid: boolean
  signatures: Array<{
    signer: string
    timestamp: string
    level: string
    intact: boolean
    valid: boolean
    trusted: boolean
  }>
}
