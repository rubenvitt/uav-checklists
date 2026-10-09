import { PiBookOpenText } from 'react-icons/pi'
import { Drawer } from 'vaul'
import ProceduresBottomSheet from './ProceduresBottomSheet'

export default function ProceduresButton() {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm font-medium text-text-2 transition-colors hover:border-control-border hover:text-text active:scale-[0.99]"
        >
          <PiBookOpenText className="text-lg" />
          Prozeduren
        </button>
      </Drawer.Trigger>
      <ProceduresBottomSheet />
    </Drawer.Root>
  )
}
