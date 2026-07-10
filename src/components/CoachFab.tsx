import { useState } from 'react'
import CoachPanel from './CoachPanel'

export default function CoachFab() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-40 bottom-5 left-5 h-14 px-4 rounded-full bg-accent text-white font-semibold shadow-pop flex items-center gap-2 hover:opacity-90 active:scale-95 transition"
          title="המאמן שלי"
        >
          <span className="text-xl leading-none">🏋️</span>
          <span className="hidden sm:inline">המאמן</span>
        </button>
      )}
      <CoachPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
