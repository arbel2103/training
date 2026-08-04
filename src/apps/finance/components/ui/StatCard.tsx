import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: string
  accent?: boolean
  onClick?: () => void
}

export function StatCard({ label, value, sub, icon, accent, onClick }: StatCardProps) {
  const clickable = !!onClick
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 border shadow-soft transition-shadow ${
        accent
          ? 'bg-accent border-accent text-white'
          : 'bg-surface border-line text-ink'
      } ${clickable ? 'cursor-pointer hover:shadow-card' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium ${accent ? 'text-white' : 'text-muted'}`}
        >
          {label}
        </span>
        {icon && <span className="text-base opacity-80">{icon}</span>}
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
