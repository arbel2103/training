import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  accent?: boolean
  onClick?: () => void
}

export function StatCard({ label, value, sub, icon, accent, onClick }: StatCardProps) {
  const clickable = !!onClick
  return (
    <div
      onClick={onClick}
      className={`p-4 ${
        accent
          ? 'rounded-2xl border border-accent bg-accent text-white shadow-soft'
          : 'card text-ink'
      } ${clickable ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium ${accent ? 'text-white' : 'text-muted'}`}
        >
          {label}
        </span>
        {icon && (
          <span className={accent ? 'text-white/90' : 'text-muted'}>{icon}</span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight num">{value}</div>
      {sub && (
        <div className={`mt-1 text-xs ${accent ? 'text-white/90' : 'text-muted'}`}>
          {sub}
        </div>
      )}
    </div>
  )
}
