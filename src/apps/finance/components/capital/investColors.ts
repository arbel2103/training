// פלטת צבעים יציבה ומובחנת לחשבונות בגרפי ההשקעה
// גוונים מרוחקים זה מזה (ירוק / כתום / סגול / אדום / כחול / זהב / מג'נטה / טורקיז / חום / אפור)
const PALETTE = [
  '#2f8f5b',
  '#e8843c',
  '#7b5ea7',
  '#d6453f',
  '#2f8fd0',
  '#e0b020',
  '#c84e8f',
  '#1fa6a6',
  '#8a6d3b',
  '#5b6470',
]

export function accountColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}
