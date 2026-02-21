import { useState } from 'react'
import { PiSiren } from 'react-icons/pi'
import EmergencyModal from './EmergencyModal'

export default function EmergencyFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-1"
        title="Notfall-Prozeduren"
      >
        {/* Pulse ring */}
        <span className="relative flex h-14 w-14 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-warning/20 animate-ping" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-warning text-white shadow-lg shadow-warning/30 transition-transform hover:scale-105 active:scale-95">
            <PiSiren className="text-2xl" />
          </span>
        </span>
        {/* SOS label */}
        <span className="text-[9px] font-bold text-warning">SOS</span>
      </button>
      {open && <EmergencyModal onClose={() => setOpen(false)} />}
    </>
  )
}
