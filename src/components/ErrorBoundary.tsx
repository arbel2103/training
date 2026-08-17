import { Component, type ErrorInfo, type ReactNode } from 'react'
import Icon from './ui/Icon'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Catches render errors in a subtree and shows a small fallback instead of
 * blanking the whole app. All pages mount at once (App's snap scroller), so
 * without this a single bad tab would take everything down.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Page error:', error, info)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="card p-6 text-center text-muted grid gap-3">
          <Icon name="warning" className="w-8 h-8 mx-auto text-run" />
          <p className="leading-relaxed">
            אירעה שגיאה בטעינת החלק הזה. נסה לרענן את הדף.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-soft justify-self-center"
          >
            נסה שוב
          </button>
          {/* the message itself, so a bug report doesn't have to be "it broke" */}
          <details className="text-right">
            <summary className="text-xs cursor-pointer">פרטים טכניים</summary>
            <p className="text-xs mt-1 font-mono break-words" dir="ltr">
              {this.state.error.message}
            </p>
          </details>
        </div>
      )
    }
    return this.props.children
  }
}
