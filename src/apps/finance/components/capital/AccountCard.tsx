import { useMemo, useState } from 'react'
import type { Account } from '../../lib/types'
import { useStore } from '../../store/useStore'
import {
  accountEffectiveBalance,
  accountRemainingToGoals,
  collectSavingLinks,
  goalAllocated,
  goalRemaining,
} from '../../store/selectors'
import { formatCurrency } from '../../lib/format'
import { formatDate } from '../../lib/date'
import { accountGroups, DEFAULT_GROUPS, groupIcon } from '../../lib/accountGroups'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { NumberInput, TextInput, Field } from '../ui/Input'

export function AccountCard({ account }: { account: Account }) {
  const expenses = useStore((s) => s.expenses)
  const monthsData = useStore((s) => s.months)
  const accounts = useStore((s) => s.accounts)
  const updateAccountBalance = useStore((s) => s.updateAccountBalance)
  const renameAccount = useStore((s) => s.renameAccount)
  const setAccountGroup = useStore((s) => s.setAccountGroup)
  const addGoal = useStore((s) => s.addGoal)
  const removeGoal = useStore((s) => s.removeGoal)
  const removeAccount = useStore((s) => s.removeAccount)

  const [balanceOpen, setBalanceOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [months, setMonths] = useState(12)

  const links = useMemo(
    () => collectSavingLinks(expenses, monthsData, accounts),
    [expenses, monthsData, accounts],
  )
  const effective = accountEffectiveBalance(account, links)
  const remaining = accountRemainingToGoals(account, links)
  const monthlyNeeded = months > 0 ? remaining / months : 0
  const goalsWithTarget = account.goals.some(
    (g) => g.targetAmount !== undefined && g.targetAmount !== null,
  )

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{account.name}</h3>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
              {groupIcon(account.group)} {account.group}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted">
            עודכן {formatDate(account.updatedAt)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditOpen(true)}
            className="text-ink-300 hover:text-ink"
            title="עריכת שם / קבוצה"
          >
            ✏️
          </button>
          <button
            onClick={() => {
              if (window.confirm(`למחוק את החשבון "${account.name}"?`))
                removeAccount(account.id)
            }}
            className="text-ink-300 hover:text-red-500"
            title="מחיקת חשבון"
          >
            🗑️
          </button>
        </div>
      </div>

      <div>
        <div className="text-3xl font-semibold tracking-tight num">
          {formatCurrency(effective)}
        </div>
        {effective !== account.balance && (
          <div className="mt-0.5 text-xs text-muted">
            יתרה רשומה {formatCurrency(account.balance)} · שויכו הוצאות{' '}
            {formatCurrency(account.balance - effective)}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setBalanceOpen(true)}>
          ✏️ עדכן יתרה
        </Button>
        <Button size="sm" variant="subtle" onClick={() => setGoalOpen(true)}>
          + הוסף מטרה
        </Button>
      </div>

      {/* מטרות */}
      {account.goals.length > 0 && (
        <div className="space-y-2 border-t border-line pt-3">
          {account.goals.map((g) => {
            const alloc = goalAllocated(g, links)
            const rem = goalRemaining(g, links)
            const pct =
              g.targetAmount && g.targetAmount > 0
                ? Math.min(100, Math.round((alloc / g.targetAmount) * 100))
                : null
            return (
              <div key={g.id} className="rounded-xl bg-bg px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-800">🎯 {g.name}</span>
                  <span className="flex items-center gap-2">
                    {g.targetAmount ? (
                      <span className="text-muted num">
                        {formatCurrency(alloc)} / {formatCurrency(g.targetAmount)}
                      </span>
                    ) : (
                      <span className="text-muted">ללא יעד</span>
                    )}
                    <button
                      onClick={() => removeGoal(account.id, g.id)}
                      className="text-ink-300 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </span>
                </div>
                {pct !== null && (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {rem !== null && rem > 0 && (
                  <div className="mt-1 text-[11px] text-muted">
                    חסר {formatCurrency(rem)} להשגת המטרה
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* חישוב חכם */}
      {goalsWithTarget && (
        <div className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          {remaining > 0 ? (
            <p className="leading-relaxed">
              נשארו <span className="font-semibold num">{formatCurrency(remaining)}</span>{' '}
              להשלמת כל מטרות הקלף. כדי להגיע ליעד בעוד{' '}
              <input
                type="number"
                value={months}
                min={1}
                onChange={(e) => setMonths(Math.max(1, Number(e.target.value) || 1))}
                className="no-spinner mx-1 w-14 rounded-md border border-line bg-surface px-1.5 py-0.5 text-center text-accent"
              />{' '}
              חודשים, צריך להפקיד{' '}
              <span className="font-semibold num">{formatCurrency(monthlyNeeded)}</span>{' '}
              בחודש.
            </p>
          ) : (
            <p className="font-medium">🎉 כל המטרות עם יעד הושגו!</p>
          )}
        </div>
      )}

      <BalanceModal
        open={balanceOpen}
        current={account.balance}
        onClose={() => setBalanceOpen(false)}
        onSave={(v) => {
          updateAccountBalance(account.id, v)
          setBalanceOpen(false)
        }}
      />
      <GoalModal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        onSave={(name, target) => {
          addGoal(account.id, name, target)
          setGoalOpen(false)
        }}
      />
      <EditAccountModal
        open={editOpen}
        name={account.name}
        group={account.group}
        groupSuggestions={[
          ...new Set([...accountGroups(accounts), ...DEFAULT_GROUPS]),
        ]}
        onClose={() => setEditOpen(false)}
        onSave={(name, group) => {
          if (name.trim()) renameAccount(account.id, name.trim())
          setAccountGroup(account.id, group)
          setEditOpen(false)
        }}
      />
    </Card>
  )
}

function EditAccountModal({
  open,
  name: initName,
  group: initGroup,
  groupSuggestions,
  onClose,
  onSave,
}: {
  open: boolean
  name: string
  group: string
  groupSuggestions: string[]
  onClose: () => void
  onSave: (name: string, group: string) => void
}) {
  const [name, setName] = useState(initName)
  const [group, setGroup] = useState(initGroup)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="עריכת חשבון"
      footer={
        <>
          <Button onClick={() => onSave(name, group)}>שמירה</Button>
          <Button variant="ghost" onClick={onClose}>
            ביטול
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="שם החשבון">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave(name, group)}
          />
        </Field>
        <div>
          <Field label="קבוצה / סוג">
            <TextInput
              list="edit-account-groups"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSave(name, group)}
            />
          </Field>
          <datalist id="edit-account-groups">
            {groupSuggestions.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
      </div>
    </Modal>
  )
}

function BalanceModal({
  open,
  current,
  onClose,
  onSave,
}: {
  open: boolean
  current: number
  onClose: () => void
  onSave: (v: number) => void
}) {
  const [val, setVal] = useState('')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="עדכון יתרת חשבון"
      footer={
        <>
          <Button onClick={() => onSave(Number(val) || 0)}>שמירה</Button>
          <Button variant="ghost" onClick={onClose}>
            ביטול
          </Button>
        </>
      }
    >
      <Field label={`יתרה נוכחית (רשום: ${formatCurrency(current)})`}>
        <NumberInput
          autoFocus
          value={val}
          placeholder={String(current)}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave(Number(val) || 0)}
        />
      </Field>
    </Modal>
  )
}

function GoalModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (name: string, target?: number) => void
}) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const submit = () => {
    if (!name.trim()) return
    onSave(name.trim(), target ? Number(target) : undefined)
    setName('')
    setTarget('')
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="הוספת מטרת חיסכון"
      footer={
        <>
          <Button onClick={submit}>הוספה</Button>
          <Button variant="ghost" onClick={onClose}>
            ביטול
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="שם המטרה (למה אני חוסך?)">
          <TextInput
            autoFocus
            value={name}
            placeholder="למשל: טיול ליפן, רכב חדש"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </Field>
        <Field label="סכום יעד (אופציונלי)">
          <NumberInput
            value={target}
            placeholder="0"
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </Field>
      </div>
    </Modal>
  )
}
