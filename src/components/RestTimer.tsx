import { useEffect, useRef, useState } from 'react'

const PRESETS = [30, 45, 60, 90, 120, 180]

function mmss(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Short beep + vibration when a rest period ends. Web Audio needs no asset
 *  and is unlocked by the user's tap on a preset. */
function chime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    const ctx = new Ctx()
    const beep = (start: number, freq: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.22)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + 0.24)
    }
    beep(0, 880)
    beep(0.28, 1175)
    setTimeout(() => ctx.close(), 800)
  } catch {
    /* audio not available — vibration still fires */
  }
  navigator.vibrate?.([180, 80, 180])
}

/** Rest-between-sets timer, shown inside a specific strength workout. */
export default function RestTimer() {
  const [total, setTotal] = useState(60)
  const [left, setLeft] = useState(60)
  const [running, setRunning] = useState(false)
  const endRef = useRef<number>(0)

  useEffect(() => {
    if (!running) return
    const tick = () => {
      const remain = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setLeft(remain)
      if (remain <= 0) {
        setRunning(false)
        chime()
      }
    }
    const id = setInterval(tick, 200)
    tick()
    return () => clearInterval(id)
  }, [running])

  const start = (sec: number) => {
    setTotal(sec)
    setLeft(sec)
    endRef.current = Date.now() + sec * 1000
    setRunning(true)
  }

  const toggle = () => {
    if (running) {
      setRunning(false)
    } else {
      if (left <= 0) return
      endRef.current = Date.now() + left * 1000
      setRunning(true)
    }
  }

  const reset = () => {
    setRunning(false)
    setLeft(total)
  }

  const pct = total > 0 ? (left / total) * 100 : 0
  const done = left <= 0 && !running

  return (
    <div className="card p-4 mb-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">⏱️</span>
          <div>
            <div className="font-semibold leading-tight">טיימר מנוחה</div>
            <div className="text-sm text-muted">בין סטים</div>
          </div>
        </div>
        <div
          className={`font-display text-4xl font-black tabular-nums ${
            done ? 'text-accent' : ''
          }`}
          dir="ltr"
        >
          {mmss(left)}
        </div>
      </div>

      {/* progress bar */}
      <div className="h-2 rounded-full bg-line overflow-hidden my-3">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* presets */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((sec) => (
          <button
            key={sec}
            onClick={() => start(sec)}
            className={`seg-btn ${
              total === sec ? 'seg-btn-active' : 'seg-btn-idle'
            }`}
          >
            {sec < 60 ? `${sec} שנ׳` : mmss(sec)}
          </button>
        ))}
      </div>

      {/* controls */}
      <div className="flex gap-2">
        <button onClick={toggle} className="btn-accent flex-1">
          {running ? '⏸ השהה' : left <= 0 ? 'נגמר' : '▶ התחל'}
        </button>
        <button onClick={reset} className="btn-ghost">
          איפוס
        </button>
      </div>
    </div>
  )
}
