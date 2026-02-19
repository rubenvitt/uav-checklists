interface SunTimesProps {
  sunrise: string
  sunset: string
}

export default function SunTimes({ sunrise, sunset }: SunTimesProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-surface px-4 py-3">
        <span className="text-xl">🌅</span>
        <div>
          <p className="text-xs text-text-muted">Sonnenaufgang</p>
          <p className="text-lg font-bold text-text">{sunrise}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-surface px-4 py-3">
        <span className="text-xl">🌇</span>
        <div>
          <p className="text-xs text-text-muted">Sonnenuntergang</p>
          <p className="text-lg font-bold text-text">{sunset}</p>
        </div>
      </div>
    </div>
  )
}
