// פלטת צבעים קרירה, מובחנת, שמשתלבת בעיצוב TriLife (בהיר וכהה)
const PALETTE = [
  '#7C6FF2',
  '#22C1D6',
  '#4F86F0',
  '#E1657F',
  '#9C8CF5',
  '#3FB6A8',
  '#C77DF0',
  '#5AA0E8',
  '#8A93E8',
  '#6EC6C0',
]

export function accountColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}
