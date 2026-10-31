// ** import lib
import { AlertIcon, CheckIcon } from "./icons"

export type StatusTone = 'idle' | 'loading' | 'success' | 'warning' | 'error'

export interface StatusState {
  tone: StatusTone
  message: string
}

export const IDLE: StatusState = { tone: 'idle', message: '' }

export function Status({ status, action }: { status: StatusState, action?: { label: string, onClick: () => void } }) {
  if (status.tone === 'idle' || !status.message) return null
  return (
    <div className={`status ${status.tone}`} role={status.tone === 'error' ? 'alert' : 'status'}>
      {status.tone === 'loading' && <span className="spinner" aria-hidden="true" />}
      {status.tone === 'success' && <CheckIcon size={14} />}
      {(status.tone === 'warning' || status.tone === 'error') && <AlertIcon size={14} />}
      <span className="status-text">
        {status.message}
        {action && (
          <button type="button" className="inline-link" onClick={action.onClick}>{action.label}</button>
        )}
      </span>
    </div>
  )
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}
