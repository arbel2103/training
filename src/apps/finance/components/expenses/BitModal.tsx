import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { CategorySelect } from '../CategorySelect'
import type { Expense } from '../../lib/types'
import { formatCurrency } from '../../lib/format'
import { formatDate } from '../../lib/date'
import { effectiveAmount } from '../../store/selectors'

interface Props {
  open: boolean
  rows: Expense[]
  onChangeCategory: (id: string, category: string) => void
  onConfirm: () => void
}

export function BitModal({ open, rows, onChangeCategory, onConfirm }: Props) {
  return (
    <Modal
      open={open}
      onClose={onConfirm}
      title="קטלוג העברות ביט"
      size="lg"
      footer={
        <Button onClick={onConfirm}>אישור ושמירה</Button>
      }
    >
      <p className="mb-4 text-sm text-muted">
        אלו ההעברות שזוהו תחת "שונות" (בדרך כלל העברות ביט). בחר/י קטגוריה מתאימה
        לכל אחת — הסיווג יישמר עם הייבוא.
      </p>

      {rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted">
          לא זוהו העברות ביט בקובץ זה.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-12 items-center gap-3 rounded-xl border border-line bg-bg/50 px-3 py-2.5"
            >
              <div className="col-span-12 sm:col-span-5">
                <div className="text-sm font-medium text-ink truncate">
                  {r.merchant}
                </div>
                <div className="text-xs text-muted">{formatDate(r.date)}</div>
              </div>
              <div className="col-span-4 sm:col-span-3 text-sm font-semibold num">
                {formatCurrency(effectiveAmount(r), true)}
              </div>
              <div className="col-span-8 sm:col-span-4">
                <CategorySelect
                  value={r.category}
                  onChange={(c) => onChangeCategory(r.id, c)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
