import { CANONICAL_CATEGORIES } from '../lib/categories'
import { useStore } from '../store/useStore'
import { Select } from './ui/Input'

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
}

const ADD_SENTINEL = '__add_category__'

export function CategorySelect({ value, onChange, className }: Props) {
  const customCategories = useStore((s) => s.customCategories)
  const addCustomCategory = useStore((s) => s.addCustomCategory)

  const allNames = [
    ...CANONICAL_CATEGORIES.map((c) => ({ name: c.name, icon: c.icon })),
    ...customCategories.map((c) => ({ name: c.name, icon: c.icon })),
  ]
  const inList = allNames.some((c) => c.name === value)

  const handleChange = (v: string) => {
    if (v === ADD_SENTINEL) {
      const name = window.prompt('שם הקטגוריה החדשה:')?.trim()
      if (name) {
        addCustomCategory(name)
        onChange(name)
      }
      return
    }
    onChange(v)
  }

  return (
    <Select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className={className}
    >
      {!inList && value && <option value={value}>{value}</option>}
      {allNames.map((c) => (
        <option key={c.name} value={c.name}>
          {c.icon} {c.name}
        </option>
      ))}
      <option value={ADD_SENTINEL}>➕ הוסף קטגוריה חדשה…</option>
    </Select>
  )
}
