import Icon from '../../../components/ui/Icon'
import PageHeader from '../../../components/ui/PageHeader'
import { useStore } from '../store/useStore'

/**
 * Placeholder for the habits app's first page. Kept deliberately empty — the
 * scaffolding around it (shell wiring, store, backup, navigation, theming) is
 * what this file is here to prove works.
 */
export default function TodayPage() {
  // touching the store on mount is what creates the `habits-store` key, so the
  // backup already carries this app before it holds any data. Replace this with
  // a real read as soon as there is one.
  useStore((s) => s.ready)

  return (
    <div>
      <PageHeader
        title="הרגלים"
        subtitle="המקום שבו יופיעו ההרגלים היומיים שלך."
      />
      <div className="card p-10 text-center">
        <Icon name="checkCircle" className="w-10 h-10 mx-auto mb-3 text-accent" />
        <h3 className="font-display text-xl font-bold mb-2">עוד לא בנינו את זה</h3>
        <p className="text-muted text-sm max-w-md mx-auto leading-relaxed">
          התשתית מוכנה — האפליקציה מחוברת לתפריט, לעיצוב ולגיבוי. ברגע שתגיד לי
          מה אתה רוצה שיהיה כאן, נתחיל לבנות.
        </p>
      </div>
    </div>
  )
}
