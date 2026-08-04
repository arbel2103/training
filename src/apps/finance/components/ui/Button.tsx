import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'subtle' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent shadow-soft',
  subtle: 'bg-accent-soft text-accent hover:bg-accent-soft',
  ghost: 'bg-transparent text-ink hover:bg-ink/5',
  outline: 'bg-surface text-ink border border-line hover:bg-bg',
  danger: 'bg-transparent text-red-600 hover:bg-red-50',
}

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2 rounded-xl gap-2',
  lg: 'text-base px-5 py-2.5 rounded-xl gap-2',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
