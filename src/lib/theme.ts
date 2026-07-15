/** Light/dark theme, applied via the `data-theme` attribute on <html>.
 *  The initial value is set before first paint by an inline script in
 *  index.html; this module keeps it and localStorage in sync afterwards. */
export type Theme = 'light' | 'dark'

const KEY = 'fitness-theme'

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark'
  else delete document.documentElement.dataset.theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
  // keep the mobile browser chrome / status bar in step with the theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#181614' : '#b5654a')
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}
