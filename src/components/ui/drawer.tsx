import { useEffect } from "react"
import { X } from "lucide-react"

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel — slides up from bottom */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-zinc-900 shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Handle */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
          <span className="text-sm font-semibold text-zinc-100">{title}</span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </>
  )
}
