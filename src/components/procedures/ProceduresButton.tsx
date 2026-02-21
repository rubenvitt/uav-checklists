import { PiBookOpenText } from 'react-icons/pi'
import { Drawer } from 'vaul'
import ProceduresBottomSheet from './ProceduresBottomSheet'

export default function ProceduresButton() {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <button
          className="flex items-center justify-center gap-2 rounded-xl border border-surface-alt bg-surface px-4 py-3 text-sm text-text-muted transition-colors hover:text-text active:scale-[0.99]"
        >
          <PiBookOpenText className="text-lg" />
          Prozeduren
        </button>
      </Drawer.Trigger>
      <ProceduresBottomSheet />
    </Drawer.Root>
  )
}
