import { useEffect, useState } from 'react'
import CoachPanel from './CoachPanel'
import { onAskCoach } from '../lib/coachBus'
import Icon from './ui/Icon'

export default function CoachFab() {
  const [open, setOpen] = useState(false)
  // a question sent from elsewhere in the app (a nudge card, a debrief prompt)
  const [ask, setAsk] = useState<string | null>(null)

  useEffect(() => {
    onAskCoach((prompt) => {
      setAsk(prompt)
      setOpen(true)
    })
    return () => onAskCoach(null)
  }, [])

  return (
    <>
      {!open && (
        <button
          data-guide="fab"
          onClick={() => setOpen(true)}
          className="fixed z-40 bottom-20 md:bottom-5 left-4 md:left-5 h-14 px-4 rounded-full bg-accent text-white font-semibold shadow-pop flex items-center gap-2 hover:opacity-90 active:scale-95 transition"
          title="המאמן שלי"
        >
          <Icon name="chat" className="w-6 h-6" />
          <span className="hidden sm:inline">המאמן</span>
        </button>
      )}
      <CoachPanel
        open={open}
        ask={ask}
        onAsked={() => setAsk(null)}
        onClose={() => {
          setOpen(false)
          setAsk(null)
        }}
      />
    </>
  )
}
