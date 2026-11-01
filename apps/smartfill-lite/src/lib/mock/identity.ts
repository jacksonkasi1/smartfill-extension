// ** import lib
import { Random } from './random'

/**
 * Developer-chosen login details. Testers sign up again and again with
 * the same password, and need emails they can actually open to finish
 * verification flows, so both can be pinned instead of randomised.
 */
export type EmailMode = 'random' | 'mine' | 'inbox'

export interface IdentityPrefs {
  /** Empty means a fresh random password on every fill. */
  password: string
  emailMode: EmailMode
  /** Used by 'mine'. One is picked per fill. */
  emails: string[]
  /** 'mine' only: jackson@gmail.com → jackson+k3x9a@gmail.com, still delivered to the same inbox. */
  emailAlias: boolean
  /** 'inbox' only: a public disposable inbox domain from INBOX_PROVIDERS. */
  inboxDomain: string
}

export interface InboxProvider {
  domain: string
  name: string
  /** Public web inbox for a mailbox name, so verification mails can be read. */
  inboxUrl: (mailbox: string) => string
}

export const INBOX_PROVIDERS: InboxProvider[] = [
  { domain: 'mailinator.com', name: 'Mailinator', inboxUrl: m => `https://www.mailinator.com/v4/public/inboxes.jsp?to=${encodeURIComponent(m)}` },
  { domain: 'maildrop.cc', name: 'Maildrop', inboxUrl: m => `https://maildrop.cc/inbox/?mailbox=${encodeURIComponent(m)}` },
  { domain: 'yopmail.com', name: 'YOPmail', inboxUrl: m => `https://yopmail.com/?login=${encodeURIComponent(m)}` },
  { domain: 'inboxkitten.com', name: 'InboxKitten', inboxUrl: m => `https://inboxkitten.com/inbox/${encodeURIComponent(m)}/list` },
  { domain: 'guerrillamail.com', name: 'Guerrilla Mail', inboxUrl: () => 'https://www.guerrillamail.com/inbox' }
]

export const DEFAULT_IDENTITY: IdentityPrefs = {
  password: '',
  emailMode: 'random',
  emails: [],
  emailAlias: false,
  inboxDomain: INBOX_PROVIDERS[0].domain
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Split a pasted list ("a@x.com, b@y.com" or one per line) into valid addresses. */
export function parseEmails(text: string): string[] {
  return Array.from(new Set(text.split(/[\s,;]+/).map(e => e.trim()).filter(e => EMAIL.test(e))))
}

export interface ChosenEmail {
  email: string
  /** Set when the address has a public inbox the user can open. */
  inboxUrl?: string
  inboxName?: string
}

/**
 * Email for this fill, or undefined to keep the generated persona email.
 * `handle` is the persona's "first.last" so inbox names stay readable.
 */
export function chooseEmail(rng: Random, prefs: IdentityPrefs | undefined, handle: string): ChosenEmail | undefined {
  if (!prefs) return undefined

  if (prefs.emailMode === 'mine') {
    const list = prefs.emails.filter(e => EMAIL.test(e))
    if (list.length === 0) return undefined
    const base = rng.pick(list)
    if (!prefs.emailAlias) return { email: base }
    const [local, domain] = base.split('@')
    return { email: `${local.split('+')[0]}+${rng.alnum(5).toLowerCase()}@${domain}` }
  }

  if (prefs.emailMode === 'inbox') {
    const provider = INBOX_PROVIDERS.find(p => p.domain === prefs.inboxDomain) ?? INBOX_PROVIDERS[0]
    const mailbox = `${handle}.${rng.alnum(4).toLowerCase()}`
    return { email: `${mailbox}@${provider.domain}`, inboxUrl: provider.inboxUrl(mailbox), inboxName: provider.name }
  }

  return undefined
}
