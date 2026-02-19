interface RecommendationsProps {
  recommendations: string[]
}

export default function Recommendations({ recommendations }: RecommendationsProps) {
  if (recommendations.length === 0) return null

  return (
    <div className="rounded-xl bg-surface px-5 py-4">
      <h2 className="mb-3 text-sm font-semibold text-text">Empfehlungen</h2>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex gap-2 text-sm text-text-muted">
            <span>⚡</span>
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
