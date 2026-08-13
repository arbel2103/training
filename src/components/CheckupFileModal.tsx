import { useEffect, useState } from 'react'
import { getFile } from '../lib/fileStore'
import Modal from './ui/Modal'
import Icon from './ui/Icon'

/**
 * Views a stored checkup result on the phone.
 *
 * The old "open in a new tab" trick does not work here: a PWA launched from the
 * iOS home screen has no tab to open into, and Safari blocks navigating to a
 * blob: URL, so tapping the file did nothing. So render it in place instead —
 * images as an image, PDFs in a frame — and offer the iOS share sheet, which is
 * the reliable way to hand a file to Files, Books or Quick Look.
 */
export default function CheckupFileModal({
  checkupId,
  fileName,
  fileType,
  onClose,
}: {
  checkupId: string | null
  fileName?: string
  fileType?: string
  onClose: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!checkupId) return
    let objectUrl: string | null = null
    let cancelled = false
    getFile(checkupId)
      .then((b) => {
        if (cancelled) return
        if (!b) {
          setError('הקובץ לא נמצא במכשיר הזה. אם שחזרת גיבוי ישן — הקבצים לא נכללו בו.')
          return
        }
        objectUrl = URL.createObjectURL(b)
        setBlob(b)
        setUrl(objectUrl)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
      setBlob(null)
      setError(null)
    }
  }, [checkupId])

  const type = fileType || blob?.type || ''
  const isImage = type.startsWith('image/')
  const isPdf = type === 'application/pdf' || (fileName ?? '').toLowerCase().endsWith('.pdf')

  const share = async () => {
    if (!blob) return
    const file = new File([blob], fileName || 'בדיקה', {
      type: type || 'application/octet-stream',
    })
    try {
      await navigator.share({ files: [file], title: fileName })
    } catch (e) {
      // the user dismissing the sheet is not an error worth showing
      if (e instanceof Error && e.name !== 'AbortError') setError(e.message)
    }
  }

  const canShare =
    !!blob &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({
      files: [new File([blob], fileName || 'f', { type: type || 'application/octet-stream' })],
    })

  return (
    <Modal
      open={checkupId !== null}
      onClose={onClose}
      title={fileName || 'תוצאות בדיקה'}
      maxWidth="max-w-3xl"
    >
      {error ? (
        <p className="text-run text-sm leading-relaxed">{error}</p>
      ) : !url ? (
        <p className="text-muted text-sm">טוען…</p>
      ) : (
        <div className="grid gap-3">
          {isImage ? (
            <img
              src={url}
              alt={fileName || 'תוצאות בדיקה'}
              className="w-full h-auto rounded-xl border border-line"
            />
          ) : isPdf ? (
            <>
              <iframe
                src={url}
                title={fileName || 'PDF'}
                className="w-full h-[60vh] rounded-xl border border-line bg-white"
              />
              <p className="text-xs text-muted leading-relaxed">
                אם ה-PDF לא נפתח כאן (קורה באייפון) — לחץ על <b>פתח באפליקציה אחרת</b>
                ובחר "קבצים" או "ספרים".
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">
              סוג הקובץ הזה לא ניתן לתצוגה כאן — פתח אותו באפליקציה אחרת.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {canShare && (
              <button onClick={() => void share()} className="btn-primary gap-1.5">
                <Icon name="upload" className="w-4 h-4" /> פתח באפליקציה אחרת
              </button>
            )}
            <a
              href={url}
              download={fileName || 'checkup'}
              className="btn-ghost gap-1.5"
            >
              <Icon name="download" className="w-4 h-4" /> הורד
            </a>
          </div>
        </div>
      )}
    </Modal>
  )
}
