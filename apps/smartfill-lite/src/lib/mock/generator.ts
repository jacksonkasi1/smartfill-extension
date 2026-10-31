// ** import types
import type { AIFormData, FormField } from '@/types/extension'
import type { FieldKind } from './fieldKinds'
import type { Profile } from './profiles'
import type { CityRecord, Region, RegionData } from './regions'

// ** import lib
import { Random } from './random'
import { classifyField, fieldHaystack } from './fieldKinds'
import { REGIONS } from './regions'

export interface MockOptions {
  profile: Profile
  region: Region
  seed?: number
}

export interface Persona {
  gender: 'Male' | 'Female'
  salutation: string
  firstName: string
  middleName: string
  lastName: string
  fullName: string
  username: string
  email: string
  phone: string
  altPhone: string
  password: string
  dob: Date
  address1: string
  address2: string
  location: CityRecord
  company: string
  companyDomain: string
  jobTitle: string
  department: string
  pan: string
}

const DAY = 86_400_000
const pad = (n: number, width = 2) => String(n).padStart(width, '0')

// ---------------------------------------------------------------------------
// Checksummed identifiers — valid-format values, not real people.
// ---------------------------------------------------------------------------

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** GSTIN check character (mod-36 weighted sum over the first 14 characters). */
export function gstinCheckChar(first14: string): string {
  let sum = 0
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36]
}

/** Luhn check digit for the given digit string. */
export function luhnCheckDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return (10 - (sum % 10)) % 10
}

function makePan(rng: Random, lastName: string, entity = 'P'): string {
  return `${rng.letters(3)}${entity}${(lastName[0] || 'A').toUpperCase()}${rng.digits(4, true)}${rng.letters(1)}`
}

function makeGstin(rng: Random, location: CityRecord, pan: string): string {
  const first14 = `${location.gstCode || '33'}${pan}${rng.int(1, 9)}Z`
  return first14 + gstinCheckChar(first14)
}

function makeNpi(rng: Random): string {
  const base = `${rng.int(1, 2)}${rng.digits(8)}`
  // NPI check digit is Luhn over "80840" + the first nine digits.
  return base + luhnCheckDigit(`80840${base}`)
}

// ---------------------------------------------------------------------------
// Persona
// ---------------------------------------------------------------------------

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function createPersona(rng: Random, profile: Profile, region: RegionData): Persona {
  const gender = rng.chance(0.5) ? 'Female' : 'Male'
  const firstName = rng.pick(gender === 'Female' ? region.femaleNames : region.maleNames)
  const middleName = rng.pick(gender === 'Female' ? region.femaleNames : region.maleNames)
  const lastName = rng.pick(region.lastNames)
  const location = rng.pick(region.cities)
  const company = rng.pick(profile.orgs)
  const companyDomain = `${slug(company.replace(/\b(pvt|ltd|llp|inc|co)\b\.?/gi, '')).slice(0, 18)}.example.com`
  const age = rng.int(26, 52)
  const dob = new Date(Date.UTC(new Date().getFullYear() - age, rng.int(0, 11), rng.int(1, 28)))
  const handle = `${slug(firstName)}.${slug(lastName)}`

  return {
    gender,
    salutation: gender === 'Female' ? 'Ms.' : 'Mr.',
    firstName,
    middleName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    username: `${handle.replace('.', '_')}${rng.int(10, 99)}`,
    email: `${handle}${rng.int(1, 99)}@example.com`,
    phone: region.phone(rng),
    altPhone: region.phone(rng),
    password: `${firstName}@${rng.int(1000, 9999)}Sf!`,
    dob,
    address1: region.id === 'us'
      ? `${rng.int(100, 9899)} ${rng.pick(region.streets)}`
      : `${rng.int(1, 220)}, ${rng.pick(region.streets)}`,
    address2: rng.pick(location.areas ?? region.areas),
    location,
    company,
    companyDomain,
    jobTitle: rng.pick(profile.roles),
    department: rng.pick(profile.departments),
    pan: makePan(rng, lastName)
  }
}

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Native date inputs need ISO; free-text date fields follow the region. */
function formatDate(d: Date, field: FormField, region: RegionData): string {
  if (field.type === 'date') return isoDate(d)
  if (field.type === 'datetime-local') return `${isoDate(d)}T10:30`
  const placeholder = (field.placeholder || '').toLowerCase()
  if (/yyyy-mm-dd/.test(placeholder)) return isoDate(d)
  const dd = pad(d.getUTCDate())
  const mm = pad(d.getUTCMonth() + 1)
  const yyyy = d.getUTCFullYear()
  if (/mm.dd/.test(placeholder) || (region.dateOrder === 'mdy' && !/dd.mm/.test(placeholder))) {
    return `${mm}/${dd}/${yyyy}`
  }
  return `${dd}/${mm}/${yyyy}`
}

function daysFromNow(days: number): Date {
  const d = new Date(Date.now() + days * DAY)
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

function roundAmount(value: number): number {
  const magnitude = value >= 100000 ? 1000 : value >= 1000 ? 100 : 10
  return Math.round(value / magnitude) * magnitude
}

/** Respect `min`, `max` and `step` on number / range inputs. */
function clampNumber(value: number, field: FormField): string {
  const el = field.element as HTMLInputElement
  const min = el?.min !== undefined && el.min !== '' ? Number(el.min) : undefined
  const max = el?.max !== undefined && el.max !== '' ? Number(el.max) : undefined
  let n = value
  if (min !== undefined && !Number.isNaN(min)) n = Math.max(n, min)
  if (max !== undefined && !Number.isNaN(max)) n = Math.min(n, max)
  return String(n)
}

function fitLength(value: string, field: FormField): string {
  const max = (field.element as HTMLInputElement)?.maxLength
  return typeof max === 'number' && max > 0 && value.length > max ? value.slice(0, max) : value
}

// ---------------------------------------------------------------------------
// Option picking for select / radio / checkbox groups
// ---------------------------------------------------------------------------

interface Choice { value: string; text: string }

const PLACEHOLDER_OPTION = /^(select|choose|pick|please|--|—|none selected|\s*$)/i

function choicesFor(field: FormField): Choice[] {
  const el = field.element as HTMLSelectElement | undefined
  if (el && typeof HTMLSelectElement !== 'undefined' && el instanceof HTMLSelectElement) {
    return Array.from(el.options)
      .filter(o => !o.disabled && o.value !== '' && !PLACEHOLDER_OPTION.test(o.text.trim()))
      .map(o => ({ value: o.value, text: o.text.trim() }))
  }
  return (field.options || [])
    .filter(o => o && !PLACEHOLDER_OPTION.test(o))
    .map(o => ({ value: o, text: o }))
}

/** Best option for a preferred value, matching on value or visible text. */
function matchChoice(choices: Choice[], wanted: string[]): Choice | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+]/g, '')
  for (const w of wanted.map(norm).filter(Boolean)) {
    const exact = choices.find(c => norm(c.value) === w || norm(c.text) === w)
    if (exact) return exact
  }
  for (const w of wanted.map(norm).filter(s => s.length > 2)) {
    const partial = choices.find(c => norm(c.text).startsWith(w) || norm(c.value).startsWith(w))
    if (partial) return partial
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export class MockGenerator {
  readonly rng: Random
  readonly persona: Persona
  readonly region: RegionData
  readonly profile: Profile
  private cache = new Map<FieldKind, string>()

  constructor(options: MockOptions) {
    this.rng = new Random(options.seed)
    this.profile = options.profile
    this.region = REGIONS[options.region]
    this.persona = createPersona(this.rng, this.profile, this.region)
  }

  /** Text value for a kind. Stable within one generator so related fields agree. */
  textFor(kind: FieldKind, field: FormField): string | null {
    const cacheable = !['longText', 'date', 'startDate', 'endDate', 'number', 'amount', 'quantity', 'text', 'reference'].includes(kind)
    if (cacheable && this.cache.has(kind)) return this.cache.get(kind)!
    const value = this.compute(kind, field)
    if (cacheable && value !== null) this.cache.set(kind, value)
    return value
  }

  private compute(kind: FieldKind, field: FormField): string | null {
    const { rng, persona: p, region, profile } = this
    const loc = p.location
    const haystack = fieldHaystack(field)

    switch (kind) {
      case 'skip': return null
      case 'salutation': return p.salutation
      case 'firstName': return p.firstName
      case 'middleName': return p.middleName
      case 'lastName': return p.lastName
      case 'fullName':
      case 'cardName': return p.fullName
      case 'relativeName': return `${rng.pick(region.maleNames)} ${p.lastName}`
      case 'emergencyName': return `${rng.pick([...region.maleNames, ...region.femaleNames])} ${p.lastName}`
      case 'relationship': return rng.pick(['Spouse', 'Father', 'Mother', 'Sibling'])
      case 'username': return p.username
      case 'email':
      case 'confirmEmail':
        return /work|business|office|company|official/.test(haystack)
          ? `${p.email.split('@')[0].replace(/\d+$/, '')}@${p.companyDomain}`
          : p.email
      case 'password':
      case 'confirmPassword': return p.password
      case 'otp': {
        const max = (field.element as HTMLInputElement)?.maxLength
        return rng.digits(max && max > 0 && max <= 8 ? max : 6, true)
      }
      case 'phone': return field.type === 'number' ? p.phone.replace(/\D/g, '').slice(-10) : p.phone
      case 'emergencyPhone': return p.altPhone
      case 'dob': return formatDate(p.dob, field, region)
      case 'age': return String(new Date().getFullYear() - p.dob.getUTCFullYear())
      case 'gender': return p.gender
      case 'maritalStatus': return rng.pick(['Married', 'Single'])
      case 'nationality': return region.nationality
      case 'language': return region.id === 'in' ? rng.pick(['English', 'Hindi', 'Tamil']) : 'English'
      case 'occupation': return p.jobTitle

      case 'address1': return p.address1
      case 'address2': return p.address2
      case 'city': return loc.city
      case 'state': return loc.state
      case 'postalCode': return loc.postal(rng)
      case 'country': return region.country
      case 'dialCode': return { in: '+91', us: '+1', uk: '+44' }[region.id]

      case 'company':
        if (/vendor|supplier|shipper|consignor|insur|payer/.test(haystack)) return rng.pick(profile.orgs.filter(o => o !== p.company)) || p.company
        return p.company
      case 'jobTitle': return p.jobTitle
      case 'department': return p.department
      case 'industry': return profile.id === 'general' ? 'Information Technology' : profile.name
      case 'companySize': return rng.pick(['11-50', '51-200', '201-500'])
      case 'employeeId': return `EMP${rng.digits(5, true)}`
      case 'experience': return String(rng.int(3, 12))
      case 'skills': return rng.pick(['TypeScript, React, Node.js, PostgreSQL', 'Project management, Stakeholder communication, Excel', 'Python, SQL, Power BI, Data modelling'])
      case 'salary': return String(roundAmount(rng.int(...HR_SALARY[region.id])))
      case 'noticePeriod': return rng.pick(['30 days', '60 days', 'Immediate'])
      case 'website': return `https://www.${p.companyDomain}`
      case 'linkedin': return `https://www.linkedin.com/in/${slug(p.firstName)}-${slug(p.lastName)}`
      case 'github': return `https://github.com/${slug(p.firstName)}${slug(p.lastName)}`
      case 'twitter': return `@${slug(p.firstName)}_${slug(p.lastName)}`

      // Payment test values from public sandbox documentation — never real cards.
      case 'cardNumber': return '4111 1111 1111 1111'
      case 'cvv': return '123'
      case 'cardExpiry': {
        const d = daysFromNow(365 * 3)
        return `${pad(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)}`
      }
      case 'accountNumber': return region.id === 'uk' ? rng.digits(8, true) : rng.digits(region.id === 'in' ? 12 : 10, true)
      case 'ifsc': return `${rng.pick(['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK'])}0${rng.digits(6, true)}`
      case 'swift': return `${rng.pick(['HDFC', 'ICIC', 'CHAS', 'BOFA', 'BARC'])}${region.countryCode}${rng.pick(['BB', '2X', '33'])}`
      case 'iban': return `GB${rng.digits(2)} ${rng.pick(['BARC', 'NWBK', 'LOYD'])} ${rng.digits(4)} ${rng.digits(4)} ${rng.digits(4)} ${rng.digits(2)}`
      case 'routing': return region.id === 'uk' ? `${rng.digits(2)}-${rng.digits(2)}-${rng.digits(2)}` : `0${rng.digits(8)}`
      case 'bankName': return { in: rng.pick(['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank']), us: rng.pick(['Chase', 'Bank of America', 'Wells Fargo']), uk: rng.pick(['Barclays', 'HSBC UK', 'Lloyds Bank']) }[region.id]
      case 'upi': return `${slug(p.firstName)}${rng.int(10, 99)}@okaxis`
      case 'gstin': return makeGstin(rng, loc, makePan(rng, p.company, 'C'))
      case 'pan': return /company|business|firm|entity/.test(haystack) ? makePan(rng, p.company, 'C') : p.pan
      case 'aadhaar': return `${rng.int(2, 9)}${rng.digits(3)} ${rng.digits(4)} ${rng.digits(4)}`
      case 'tan': return `${loc.city.slice(0, 3).toUpperCase()}${p.company[0].toUpperCase()}${rng.digits(5, true)}${rng.letters(1)}`
      case 'cin': return `U${rng.digits(5, true)}${loc.stateCode}${new Date().getFullYear() - rng.int(3, 15)}PTC${rng.digits(6, true)}`
      // 9xx area numbers are never issued, so this cannot be a real SSN.
      case 'ssn': return `9${rng.digits(2)}-${rng.digits(2)}-${rng.digits(4)}`
      case 'ein': return `${rng.digits(2, true)}-${rng.digits(7)}`
      case 'nino': return `Q${rng.pick(['A', 'B', 'C', 'E'])} ${rng.digits(2)} ${rng.digits(2)} ${rng.digits(2)} ${rng.pick(['A', 'B', 'C', 'D'])}`
      case 'taxId':
        if (region.id === 'in') return /gst/.test(haystack) ? makeGstin(rng, loc, makePan(rng, p.company, 'C')) : p.pan
        if (region.id === 'uk') return `GB${rng.digits(9, true)}`
        return `${rng.digits(2, true)}-${rng.digits(7)}`
      case 'passport': return region.id === 'in' ? `${rng.letters(1)}${rng.digits(7, true)}` : rng.digits(9, true)
      case 'drivingLicense':
        return region.id === 'in'
          ? `${loc.stateCode}${rng.digits(2, true)} ${new Date().getFullYear() - rng.int(2, 15)}${rng.digits(7)}`
          : `${p.lastName.slice(0, 5).toUpperCase().padEnd(5, '9')}${rng.digits(6)}${rng.letters(2)}`
      case 'voterId': return `${rng.letters(3)}${rng.digits(7, true)}`
      case 'nationalId':
        return region.id === 'in' ? `${rng.int(2, 9)}${rng.digits(3)} ${rng.digits(4)} ${rng.digits(4)}` : rng.digits(9, true)

      case 'npi': return makeNpi(rng)
      case 'mrn': return `${region.id === 'in' ? 'UHID' : 'MRN'}${rng.digits(8, true)}`
      case 'policyNumber': return `POL-${rng.digits(4, true)}-${rng.digits(6)}`
      case 'insuranceProvider': return rng.pick(INSURERS[region.id])
      case 'claimNumber': return `CLM${new Date().getFullYear()}${rng.digits(6, true)}`
      case 'bloodGroup': return rng.pick(['O+', 'B+', 'A+', 'AB+', 'O-'])
      case 'allergies': return rng.pick(['No known drug allergies', 'Penicillin', 'Dust and pollen'])
      case 'medications': return rng.pick(['Metformin 500 mg twice daily', 'Amlodipine 5 mg once daily', 'None'])
      case 'diagnosis': return rng.pick(['Fever with dry cough for three days', 'Routine annual health check-up', 'Lower back pain, 2 weeks', 'Type 2 diabetes follow-up'])
      case 'doctor': return `Dr. ${rng.pick([...region.femaleNames, ...region.maleNames])} ${rng.pick(region.lastNames)}`
      case 'height': return String(/inch|ft|feet/.test(haystack) ? rng.int(60, 74) : rng.int(155, 185))
      case 'weight': return String(/lb|pound/.test(haystack) ? rng.int(120, 200) : profile.id === 'logistics' ? rng.int(2, 40) : rng.int(52, 88))
      case 'batchNumber': return `B${rng.digits(2, true)}${rng.letters(2)}${rng.digits(4)}`
      case 'expiryDate': return formatDate(daysFromNow(rng.int(300, 900)), field, region)

      case 'trackingNumber': return /awb|air ?way/.test(haystack) ? `${rng.pick(['176', '098', '235'])}-${rng.digits(8)}` : `${rng.letters(2)}${rng.digits(9, true)}${region.countryCode}`
      case 'hsCode': return rng.pick(['8471.30', '8517.62', '6109.10', '3004.90', '8708.29'])
      case 'containerNumber': {
        const owner = `${rng.letters(3)}U`
        return `${owner}${rng.digits(6)}${rng.int(0, 9)}`
      }
      case 'vehicleNumber':
        return region.id === 'in'
          ? `${loc.stateCode} ${rng.digits(2, true)} ${rng.letters(2)} ${rng.digits(4, true)}`
          : region.id === 'uk' ? `${rng.letters(2)}${rng.digits(2)} ${rng.letters(3)}` : `${rng.digits(1, true)}${rng.letters(3)}${rng.digits(3)}`
      case 'vin': {
        const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
        let vin = rng.pick(['MA3', '1HG', 'WVW', 'JTD'])
        while (vin.length < 17) vin += chars[rng.int(0, chars.length - 1)]
        return vin
      }
      case 'engineNumber': return `${rng.letters(2)}${rng.digits(2)}${rng.letters(1)}${rng.digits(6, true)}`
      case 'dimensions': return `${rng.int(20, 60)} x ${rng.int(15, 45)} x ${rng.int(10, 40)} cm`
      case 'invoiceNumber': return `INV-${new Date().getFullYear()}-${rng.digits(5, true)}`
      case 'orderNumber': return profile.id === 'manufacturing' ? profile.reference(rng) : `ORD-${rng.digits(8, true)}`
      case 'sku': return `${rng.letters(3)}-${rng.digits(4, true)}-${rng.letters(1)}`
      case 'quantity': return clampNumber(rng.int(1, profile.id === 'manufacturing' ? 500 : 10), field)
      case 'amount': return clampNumber(roundAmount(rng.int(...profile.amount)), field)
      case 'currency': return region.currency
      case 'coupon': return rng.pick(['WELCOME10', 'FESTIVE20', 'FIRSTORDER'])
      case 'licenseNumber': return `${rng.letters(2)}/${rng.digits(5, true)}/${new Date().getFullYear()}`

      case 'studentId': return `${new Date().getFullYear()}${rng.letters(2)}${rng.digits(4, true)}`
      case 'school': return rng.pick(SCHOOLS[region.id])
      case 'degree': return rng.pick(['B.Tech in Computer Science', 'Bachelor of Commerce', 'MBA in Marketing', 'B.Sc. Nursing'])
      case 'gpa': return /percent|marks/.test(haystack) ? String(rng.int(72, 94)) : (rng.int(70, 95) / 10).toFixed(1)
      case 'graduationYear': return String(new Date().getFullYear() - rng.int(2, 10))
      case 'flightNumber': return `${rng.pick(['AI', '6E', 'UK', 'BA', 'UA', 'DL'])} ${rng.int(101, 989)}`
      case 'bookingRef': return rng.alnum(6)
      case 'startDate': return formatDate(daysFromNow(rng.int(7, 30)), field, region)
      case 'endDate': return formatDate(daysFromNow(rng.int(33, 45)), field, region)
      case 'guests': return clampNumber(rng.int(2, 4), field)
      case 'bedrooms': return clampNumber(rng.int(2, 3), field)
      case 'area': return clampNumber(roundAmount(rng.int(850, 1850)), field)
      case 'caseNumber': return profile.id === 'legal' ? profile.reference(rng) : `CASE-${rng.digits(6, true)}`
      case 'court': return region.id === 'in' ? `City Civil Court, ${loc.city}` : `${loc.city} District Court`

      case 'reference': return profile.reference(rng)
      case 'subject': return rng.pick(profile.subjects)
      case 'longText': return rng.pick(profile.notes)
      case 'date': return formatDate(profile.futureDates ? daysFromNow(rng.int(5, 40)) : daysFromNow(-rng.int(1, 60)), field, region)
      case 'time': return rng.pick(['09:30', '10:30', '11:00', '14:30', '16:00'])
      case 'datetime': return `${isoDate(daysFromNow(rng.int(2, 20)))}T${rng.pick(['10:30', '15:00'])}`
      case 'number': return clampNumber(rng.int(1, 100), field)
      case 'color': return rng.pick(['#2563eb', '#16a34a', '#db2777', '#f59e0b'])
      case 'range': {
        const el = field.element as HTMLInputElement
        const min = Number(el?.min || 0)
        const max = Number(el?.max || 100)
        return String(Math.round((min + max) / 2))
      }
      case 'consent': return 'true'
      case 'optIn': return 'false'
      case 'text':
      default:
        return rng.pick(TEXT_FALLBACK)
    }
  }

  /** One-line persona the AI uses as a baseline, so AI values and mock fallbacks agree. */
  summary(): string {
    const p = this.persona
    const blank = {} as FormField
    return [
      `${p.fullName} (${p.gender}, born ${isoDate(p.dob)})`,
      `email ${p.email}`,
      `phone ${p.phone}`,
      `address ${p.address1}, ${p.address2}, ${p.location.city}, ${p.location.state} ${this.textFor('postalCode', blank)}, ${this.region.country}`,
      `${p.jobTitle}, ${p.department} at ${p.company}`
    ].join('; ')
  }

  /** Value for one field in the shape `fillForm` expects. */
  valueFor(field: FormField, kind: FieldKind = classifyField(field)): string | boolean | string[] | null {
    if (kind === 'skip') return null

    if (field.type === 'checkbox') {
      const choices = choicesFor(field)
      if (choices.length > 1) {
        const count = Math.min(choices.length, this.rng.int(1, 2))
        const picked = [...choices].sort(() => this.rng.next() - 0.5).slice(0, count)
        return picked.map(c => c.value)
      }
      if (kind === 'optIn') return false
      return true
    }

    if (field.type === 'select' || field.type === 'radio') {
      const choices = choicesFor(field)
      const preferred = this.preferredOptions(kind, field)
      if (choices.length === 0) return preferred[0] ?? this.textFor(kind, field)
      const match = matchChoice(choices, preferred)
      return (match ?? this.rng.pick(choices)).value
    }

    const text = this.textFor(kind, field)
    if (text === null) return null
    return fitLength(text, field)
  }

  /** Candidate spellings to look for among a dropdown's options. */
  private preferredOptions(kind: FieldKind, field: FormField): string[] {
    const p = this.persona
    switch (kind) {
      case 'gender': return p.gender === 'Female' ? ['Female', 'F', 'Woman'] : ['Male', 'M', 'Man']
      case 'salutation': return p.gender === 'Female' ? ['Ms', 'Ms.', 'Mrs', 'Miss'] : ['Mr', 'Mr.']
      case 'country':
      case 'nationality': return [this.region.country, this.region.countryCode, this.region.nationality, this.region.id === 'us' ? 'USA' : this.region.id === 'uk' ? 'UK' : 'IND']
      case 'dialCode': return [this.textFor('dialCode', field) || '', this.region.country]
      case 'state': return [p.location.state, p.location.stateCode]
      case 'city': return [p.location.city]
      case 'currency': return [this.region.currency]
      case 'maritalStatus': return [this.textFor('maritalStatus', field) || '']
      case 'bloodGroup': return [this.textFor('bloodGroup', field) || '']
      case 'industry': return [this.profile.name.split(/[ /]/)[0]]
      case 'department': return [p.department]
      case 'jobTitle': return [p.jobTitle]
      case 'consent': return ['Yes', 'Agree', 'I agree', 'Accept']
      case 'optIn': return ['No']
      default: {
        const text = this.textFor(kind, field)
        return text ? [text] : []
      }
    }
  }
}

const HR_SALARY: Record<Region, [number, number]> = {
  in: [800000, 3200000],
  us: [85000, 185000],
  uk: [45000, 110000]
}

const INSURERS: Record<Region, string[]> = {
  in: ['Star Health Insurance', 'HDFC ERGO', 'ICICI Lombard', 'Niva Bupa'],
  us: ['Aetna', 'Blue Cross Blue Shield', 'UnitedHealthcare', 'Cigna'],
  uk: ['Bupa', 'AXA Health', 'Aviva', 'Vitality']
}

const SCHOOLS: Record<Region, string[]> = {
  in: ['Anna University', 'University of Mumbai', 'Delhi University', 'VIT Vellore'],
  us: ['University of Texas at Austin', 'Ohio State University', 'University of Washington'],
  uk: ['University of Manchester', 'University of Leeds', 'King\'s College London']
}

const TEXT_FALLBACK = ['Sample entry', 'Primary', 'Standard', 'Verified', 'Regular']

/**
 * Generate mock values for every field. Fields that must not be
 * touched (search boxes, captchas, file inputs) map to `null`, which
 * `fillForm` treats as "skip" without falling back to fuzzy key
 * matching.
 */
export function generateMockData(fields: FormField[], options: MockOptions | MockGenerator): AIFormData {
  const generator = options instanceof MockGenerator ? options : new MockGenerator(options)
  const data: Record<string, string | boolean | string[] | null> = {}
  for (const field of fields) {
    data[field.name] = generator.valueFor(field)
  }
  return data as AIFormData
}
