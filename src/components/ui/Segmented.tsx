interface Option<T> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  options: Option<T>[]
  value: T | undefined
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}

export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`seg-btn ${active ? 'seg-btn-active' : 'seg-btn-idle'} ${
              size === 'sm' ? 'text-xs px-2.5 py-1' : ''
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
