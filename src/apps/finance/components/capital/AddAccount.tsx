import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { accountGroups, DEFAULT_GROUPS, groupIconName } from '../../lib/accountGroups'
import Icon from '../../../../components/ui/Icon'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { TextInput, Field } from '../ui/Input'

export function AddAccount() {
  const addAccount = useStore((s) => s.addAccount)
  const accounts = useStore((s) => s.accounts)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [group, setGroup] = useState('חיסכון')

  // קבוצות קיימות + ברירות מחדל (ללא כפילויות) להצעה מהירה
  const suggestions = [
    ...new Set([...accountGroups(accounts), ...DEFAULT_GROUPS]),
  ]

  const submit = () => {
    if (!name.trim() || !group.trim()) return
    addAccount(name.trim(), group.trim())
    setName('')
    setGroup('חיסכון')
    setOpen(false)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        + הוספת חשבון
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="הוספת חשבון חדש"
        footer={
          <>
            <Button onClick={submit}>יצירה</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              ביטול
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="שם החשבון">
            <TextInput
              autoFocus
              value={name}
              placeholder="למשל: קופת גמל, פיקדון, מניות"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </Field>

          <div>
            <Field label="קבוצה / סוג (שם חופשי)">
              <TextInput
                list="account-group-suggestions"
                value={group}
                placeholder="למשל: חיסכון, השקעה, פנסיה, קרן השתלמות"
                onChange={(e) => setGroup(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </Field>
            <datalist id="account-group-suggestions">
              {suggestions.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            {/* בחירה מהירה של קבוצות קיימות */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    group === g
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-surface text-muted hover:bg-bg'
                  } inline-flex items-center gap-1`}
                >
                  <Icon name={groupIconName(g)} className="w-3 h-3" /> {g}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              כל קבוצה חדשה תופיע כקלף סיכום נפרד בראש הדף.
            </p>
          </div>
        </div>
      </Modal>
    </>
  )
}
