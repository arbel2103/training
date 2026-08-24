import { chartColor } from '../../../../lib/chartPalette'

/** One colour per investment account, from the app-wide chart sequence. */
export function accountColor(index: number): string {
  return chartColor(index)
}
