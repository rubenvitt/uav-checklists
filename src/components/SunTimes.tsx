import { WiSunrise, WiSunset } from 'react-icons/wi'

interface SunTimesProps {
  sunrise: string
  sunset: string
}

export default function SunTimes({ sunrise, sunset }: SunTimesProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-surface px-4 py-3">
        <span className="text-2xl flex items-center text-text-muted"><WiSunrise /></span>
        <div>
          <p className="text-xs text-text-muted">Sonnenaufgang</p>
          <p className="font-mono text-lg font-bold text-text">{sunrise}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-surface px-4 py-3">
        <span className="text-2xl flex items-center text-text-muted"><WiSunset /></span>
        <div>
          <p className="text-xs text-text-muted">Sonnenuntergang</p>
          <p className="font-mono text-lg font-bold text-text">{sunset}</p>
        </div>
      </div>
    </div>
  )
}
