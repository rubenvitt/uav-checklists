export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-alt border-t-text" />
      <p className="text-text-muted text-sm">Wetterdaten werden geladen...</p>
    </div>
  )
}
