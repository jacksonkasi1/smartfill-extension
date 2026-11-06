// ** import types
import type { CSSProperties, KeyboardEvent } from 'react'

// ** import core packages
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ** import lib
import { CheckIcon, ChevronIcon } from './icons'

export interface PickerOption {
  value: string
  label: string
  description?: string
  group?: string
}

export interface SelectPickerProps {
  value: string
  onChange: (value: string) => void
  options: PickerOption[]
  'aria-label': string
  disabled?: boolean
  searchable?: boolean
  allowCustom?: boolean
  placeholder?: string
  className?: string
}

/** A shared, keyboard-operated selection menu. Values remain owned by the caller. */
export function SelectPicker({ value, onChange, options, disabled, searchable, allowCustom, placeholder = 'Select an option', className = '', 'aria-label': label }: SelectPickerProps) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' })
  const selected = options.find(option => option.value === value)
  const normalized = query.trim().toLocaleLowerCase()
  const matching = options.filter(option => `${option.label} ${option.value} ${option.group || ''}`.toLocaleLowerCase().includes(normalized))
  const custom = Boolean(allowCustom && query.trim() && !options.some(option => option.value === query.trim()))
  const visible: PickerOption[] = custom ? [...matching, { value: query.trim(), label: query.trim(), description: 'Use this custom model ID', group: 'Custom' }] : matching
  const activeIndex = Math.max(0, Math.min(active, visible.length - 1))
  const activeOption = visible[activeIndex]

  function close(restoreFocus = false) {
    setOpen(false)
    if (restoreFocus) trigger.current?.focus()
  }

  function show(last = false) {
    if (disabled) return
    setQuery('')
    const current = options.findIndex(option => option.value === value)
    setActive(last ? Math.max(0, options.length - 1) : Math.max(0, current))
    setOpen(true)
  }

  function choose(option: PickerOption) {
    onChange(option.value)
    close(true)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return }
    if (event.key === 'Tab') { close(true); return }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setActive(current => (Math.min(current, visible.length - 1) + delta + visible.length) % Math.max(1, visible.length))
    } else if ((event.key === 'Home' || event.key === 'End') && event.target !== search.current) {
      event.preventDefault()
      setActive(event.key === 'Home' ? 0 : Math.max(0, visible.length - 1))
    } else if (event.key === 'Enter' || (event.key === ' ' && event.target !== search.current)) {
      event.preventDefault()
      if (activeOption) choose(activeOption)
    }
  }

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const rect = trigger.current?.getBoundingClientRect()
      const menu = popup.current
      if (!rect || !menu) return
      const width = Math.min(320, window.innerWidth - 16)
      const below = window.innerHeight - rect.bottom - 14
      const above = rect.top - 14
      const upwards = below < 240 && above > below
      const maxHeight = Math.max(40, Math.min(400, upwards ? above : below))
      const height = Math.min(menu.scrollHeight, maxHeight)
      const preferredTop = upwards ? rect.top - height - 6 : rect.bottom + 6
      setPosition({ width, maxHeight, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: Math.max(8, Math.min(preferredTop, window.innerHeight - height - 8)), visibility: 'visible' })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, query, options.length])

  useEffect(() => {
    if (!open) return
    if (searchable || allowCustom) search.current?.focus()
    else document.getElementById(`${id}-list`)?.focus()
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) close()
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, searchable, allowCustom, id])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, id])

  return <>
    <button ref={trigger} type="button" role="combobox" aria-label={label} aria-haspopup="listbox"
      aria-controls={open ? `${id}-list` : undefined} aria-expanded={open} disabled={disabled}
      className={`ui-picker-trigger ${className}`} onClick={() => open ? close() : show()}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(event.key === 'ArrowUp') }
      }}>
      <span className={value ? undefined : 'ui-picker-placeholder'}>{selected?.label || value || placeholder}</span>
      <ChevronIcon size={14} className={open ? 'ui-picker-chevron open' : 'ui-picker-chevron'} />
    </button>
    {open && createPortal(<div ref={popup} className="ui-picker-popup" data-picker-popup="" style={position} role="dialog" aria-label={label}
      onKeyDown={onKeyDown} onClick={event => event.stopPropagation()}>
      {(searchable || allowCustom) && <div className="ui-picker-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
        <input ref={search} type="text" aria-label={`Search ${label.toLocaleLowerCase()}`} placeholder={allowCustom ? 'Search or enter a model ID…' : 'Search…'}
          value={query} spellCheck={false} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={`${id}-list`}
          aria-activedescendant={activeOption ? `${id}-option-${activeIndex}` : undefined}
          onChange={event => { setQuery(event.target.value); setActive(0) }} />
        <kbd>Esc</kbd>
      </div>}
      <div className="ui-picker-options" role="listbox" id={`${id}-list`} aria-label={label} tabIndex={-1}
        aria-activedescendant={activeOption ? `${id}-option-${activeIndex}` : undefined}>
        {visible.map((option, index) => <div key={option.value}>
          {option.group && option.group !== visible[index - 1]?.group && <div className="ui-picker-group">{option.group}</div>}
          <div id={`${id}-option-${index}`} role="option" aria-selected={option.value === value}
            data-active={index === activeIndex || undefined} className="ui-picker-option"
            onMouseMove={() => setActive(index)} onClick={() => choose(option)}>
            <span className="ui-picker-option-label">{option.label}</span>
            {option.value === value && <CheckIcon size={14} />}
          </div>
        </div>)}
        {!visible.length && <p className="ui-picker-empty" role="status">No matching options</p>}
      </div>
      {(activeOption?.description || allowCustom) && <div className="ui-picker-detail">
        {activeOption?.description || 'Choose a model or enter its exact ID.'}
      </div>}
    </div>, document.body)}
  </>
}
