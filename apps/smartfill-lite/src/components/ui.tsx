// ** import types
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

// ** import core packages
import { Children, cloneElement, isValidElement, useId } from 'react'

export { SelectPicker } from './SelectPicker'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`ui-button ui-button--${variant} ui-button--${size} ${className}`} {...props} />
}

export function IconButton({ className = '', ...props }: ButtonProps) {
  return <Button className={`ui-icon-button ${className}`} {...props} />
}

export function Field({ label, hint, error, children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
}) {
  const id = useId()
  let controlId = `${id}-control`
  let found = false
  const descriptionId = `${id}-description`
  const connectControl = (nodes: ReactNode): ReactNode => Children.map(nodes, child => {
    if (!isValidElement<{ children?: ReactNode, id?: string, 'aria-describedby'?: string, 'aria-invalid'?: boolean }>(child)) return child
    if (!found && typeof child.type === 'string' && ['input', 'select', 'textarea'].includes(child.type)) {
      found = true
      controlId = child.props.id || controlId
      return cloneElement(child, {
        id: controlId,
        'aria-describedby': [child.props['aria-describedby'], (error || hint) ? descriptionId : ''].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : child.props['aria-invalid']
      })
    }
    return child.props.children ? cloneElement(child, {}, connectControl(child.props.children)) : child
  })
  const controls = connectControl(children)
  return <div className={`ui-field ${className}`} {...props}>
    <label className="ui-field-label" htmlFor={controlId}>{label}</label>
    {controls}
    {(error || hint) && <p id={descriptionId} className={`ui-field-hint${error ? ' ui-field-error' : ''}`} role={error ? 'alert' : undefined}>{error || hint}</p>}
  </div>
}

export function Section({ title, description, children, className = '', ...props }: Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title?: ReactNode
  description?: ReactNode
}) {
  return <section className={`ui-section ${className}`} {...props}>
    {(title || description) && <header className="ui-section-head">{title && <h2>{title}</h2>}{description && <p>{description}</p>}</header>}
    {children}
  </section>
}

export function Badge({ tone = 'neutral', className = '', ...props }: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
}) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`} {...props} />
}
