export function signerError(err: unknown): string {
  return err instanceof Error ? err.message : 'Signer error';
}
