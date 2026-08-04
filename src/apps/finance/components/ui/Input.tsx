import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent ${className}`}
      {...rest}
    />
  )
}

export function NumberInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={`no-spinner w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent ${className}`}
      {...rest}
    />
  )
}

export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={`w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}
