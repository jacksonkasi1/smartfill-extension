// ** import types
import type { FormField } from '@/types/extension'

export type FieldKind =
  // skipped
  | 'skip'
  // identity
  | 'salutation' | 'firstName' | 'middleName' | 'lastName' | 'fullName' | 'relativeName'
  | 'username' | 'email' | 'confirmEmail' | 'password' | 'confirmPassword' | 'otp'
  | 'phone' | 'emergencyName' | 'emergencyPhone' | 'relationship'
  | 'dob' | 'age' | 'gender' | 'maritalStatus' | 'nationality' | 'language' | 'occupation'
  // address
  | 'address1' | 'address2' | 'city' | 'state' | 'postalCode' | 'country' | 'dialCode'
  // work
  | 'company' | 'jobTitle' | 'department' | 'industry' | 'companySize' | 'employeeId'
  | 'experience' | 'skills' | 'salary' | 'noticePeriod'
  | 'website' | 'linkedin' | 'github' | 'twitter'
  // finance & identifiers
  | 'cardNumber' | 'cardName' | 'cvv' | 'cardExpiry' | 'accountNumber' | 'ifsc' | 'swift'
  | 'iban' | 'routing' | 'bankName' | 'upi' | 'gstin' | 'pan' | 'aadhaar' | 'tan' | 'cin'
  | 'ssn' | 'ein' | 'nino' | 'taxId' | 'passport' | 'drivingLicense' | 'voterId' | 'nationalId'
  // healthcare & insurance
  | 'npi' | 'mrn' | 'policyNumber' | 'insuranceProvider' | 'claimNumber' | 'bloodGroup'
  | 'allergies' | 'medications' | 'diagnosis' | 'doctor' | 'height' | 'weight' | 'batchNumber'
  | 'expiryDate'
  // logistics, commerce & vehicles
  | 'trackingNumber' | 'hsCode' | 'containerNumber' | 'vehicleNumber' | 'vehicleName' | 'vin' | 'engineNumber'
  | 'vehicleType' | 'tonnage' | 'documentNumber' | 'percent' | 'tenure'
  | 'dimensions' | 'invoiceNumber' | 'orderNumber' | 'sku' | 'quantity' | 'amount' | 'currency'
  | 'coupon' | 'licenseNumber'
  // education, travel, property, legal
  | 'studentId' | 'school' | 'degree' | 'gpa' | 'graduationYear'
  | 'flightNumber' | 'bookingRef' | 'startDate' | 'endDate' | 'guests' | 'bedrooms' | 'area'
  | 'caseNumber' | 'court'
  // generic
  | 'reference' | 'subject' | 'longText' | 'date' | 'time' | 'datetime' | 'number' | 'color'
  | 'range' | 'consent' | 'optIn' | 'text'

type Rule = [RegExp, FieldKind]

/**
 * Ordered rules: the first match wins, so specific patterns sit above
 * generic ones (e.g. "confirm password" before "password", "card
 * expiry" before "expiry", "tracking number" before "number").
 */
const RULES: Rule[] = [
  [/captcha|honeypot|\bsearch\b|\bquery\b(?! type)/, 'skip'],

  [/(confirm|re ?type|re ?enter|repeat|verify|again).*(password|pass\b|pwd)|(password|pwd).*(confirm|again|repeat)/, 'confirmPassword'],
  [/(atm|card|security|upi|transaction|login) ?pin\b|\bm ?pin\b/, 'otp'],
  [/pass ?word|passcode|\bpwd\b|\bpass\b/, 'password'],
  [/\botp\b|one ?time|verification code|\b2fa\b|auth(entication)? code|\bmfa\b/, 'otp'],
  [/(confirm|re ?enter|re ?type|repeat|verify).*e ?mail|e ?mail.*(confirm|again)/, 'confirmEmail'],
  [/emergency.*(phone|mobile|number|contact no)|(phone|mobile).*emergency|next of kin.*(phone|mobile|number)/, 'emergencyPhone'],
  [/emergency ?contact|next of kin|nominee( name)?$|nominee name/, 'emergencyName'],
  [/relationship|relation\b/, 'relationship'],
  [/e ?mail/, 'email'],

  [/name on card|card ?holder/, 'cardName'],
  [/card ?(number|no|num)\b|\bcc ?(number|num)|credit ?card|debit ?card|\bpan\b.*card number/, 'cardNumber'],
  [/\bcvv|\bcvc|\bcsc\b|card ?(code|verification)/, 'cvv'],
  [/card.*exp|exp.*card|\bmm ?\/? ?yy\b|valid ?thru/, 'cardExpiry'],
  [/\bifsc/, 'ifsc'],
  [/swift|\bbic\b/, 'swift'],
  [/\biban\b/, 'iban'],
  [/routing|\baba\b|sort ?code/, 'routing'],
  [/(account|acct|a ?c) ?(number|no|num)\b|bank ?account/, 'accountNumber'],
  [/\bupi\b|\bvpa\b/, 'upi'],
  [/bank ?name|\bbank\b/, 'bankName'],
  [/\bgst ?(in|no|number|reg)\b|\bgstin\b|\bgst\b/, 'gstin'],
  [/\bpan\b/, 'pan'],
  [/aadha?ar|\buidai\b/, 'aadhaar'],
  [/\btan\b/, 'tan'],
  [/\bcin\b|corporate identi/, 'cin'],
  [/\bssn\b|social security/, 'ssn'],
  [/\bf?ein\b|employer identification|federal tax/, 'ein'],
  [/national insurance|\bnino?\b/, 'nino'],
  [/\bvat\b|tax ?(id|number|no|reg)\b|\btin\b/, 'taxId'],
  [/passport/, 'passport'],
  [/driv(er|ing|ers)? ?licen[cs]e|\bdl ?(no|number)\b/, 'drivingLicense'],
  [/voter ?id|\bepic\b/, 'voterId'],
  [/national ?id|govt? ?id|government ?id|id ?proof|identity ?(number|no)\b/, 'nationalId'],

  [/\bnpi\b/, 'npi'],
  [/\bmrn\b|medical record|patient ?(id|no|number)\b|\buhid\b|hospital ?(id|no)\b/, 'mrn'],
  [/policy ?(number|no|id)\b|member ?id|insurance ?(id|number|no)\b/, 'policyNumber'],
  [/insurance ?(provider|company|name)?|insurer|\bpayer\b|\btpa\b/, 'insuranceProvider'],
  [/claim ?(number|no|id)\b/, 'claimNumber'],
  [/blood ?(group|type)/, 'bloodGroup'],
  [/allerg/, 'allergies'],
  [/medication|medicine|prescription|drug ?name|current ?meds/, 'medications'],
  [/diagnos|\bicd\b|symptom|chief ?complaint|reason for (visit|admission)|medical (history|condition)/, 'diagnosis'],
  [/doctor|physician|consultant name|referr(ing|ed) by/, 'doctor'],
  [/height/, 'height'],
  [/weight/, 'weight'],
  [/batch|\blot ?(no|number)\b/, 'batchNumber'],
  [/expir|valid (until|till|upto)|best before/, 'expiryDate'],

  [/tracking|\bawb\b|air ?way ?bill|consignment ?(no|number|id)\b|waybill|\blr ?(no|number)\b|docket/, 'trackingNumber'],
  [/\bhs ?(n|code)\b|\bhsn|harmoni[sz]ed/, 'hsCode'],
  [/container ?(no|number|id)?\b/, 'containerNumber'],
  [/\bvin\b|chass?is|frame ?(no|number)\b/, 'vin'],
  [/engine ?(no|number|serial)\b/, 'engineNumber'],
  [/(truck|vehicle|fleet|asset|bus|car|trailer|lorry|van|unit) ?(name|model|make)\b|\bmake ?(and|&)? ?model\b/, 'vehicleName'],
  [/(truck|vehicle|body|trailer|fleet) ?type\b/, 'vehicleType'],
  [/tonn?age|\bgvw\b|payload|load ?capacity|\bcapacity\b/, 'tonnage'],
  [/vehicle ?(no|number|reg)\b|registration ?(no|number|plate)\b|licen[cs]e ?plate|number ?plate|truck ?(no|number)\b/, 'vehicleNumber'],
  [/dimension|\bl ?x ?w|length.*width/, 'dimensions'],
  [/invoice/, 'invoiceNumber'],
  [/order ?(no|number|id)\b|\bpo ?(no|number)\b|purchase ?order/, 'orderNumber'],
  [/\bsku\b|item ?code|product ?code|part ?(no|number)\b/, 'sku'],
  [/coupon|promo|voucher|discount ?code|referral ?code/, 'coupon'],
  [/licen[cs]e ?(no|number)\b|registration ?(no|number)\b|\bregn? ?no\b/, 'licenseNumber'],
  [/(document|doc|certificate|cert|permit|serial|registration) ?(no|number|id)\b|\bs ?no\b/, 'documentNumber'],
  [/flight ?(no|number)?\b/, 'flightNumber'],
  [/\bpnr\b|booking ?(ref|reference|id|no)\b|confirmation ?(no|number|code)\b|reservation ?(no|number|id)\b/, 'bookingRef'],
  [/case ?(no|number|id)\b|matter ?(no|number)\b|ticket ?(no|id|number)\b|complaint ?(no|number)\b/, 'caseNumber'],
  [/\bcourt\b/, 'court'],

  [/employee ?(id|no|code|number)\b|\bemp ?(id|code|no)\b|staff ?id/, 'employeeId'],
  [/student ?(id|no)\b|roll ?(no|number)\b|enrol?ment|admission ?(no|number)\b/, 'studentId'],
  [/school|college|university|institut|alma mater/, 'school'],
  [/degree|qualification|course|program(me)?\b|\bmajor\b|stream|speciali[sz]/, 'degree'],
  [/interest|\broi\b|\bapr\b|(tax|gst|vat|commission|discount|tds|margin) ?(rate|%|percent)|\brate ?%/, 'percent'],
  [/no ?of ?(months|years|installments|instalments|emis?)|tenure|loan ?term|duration ?(in )?months|\bmonths\b/, 'tenure'],
  [/\bc?gpa\b|percentage|marks|\bgrade\b/, 'gpa'],
  [/(graduat|passing|completion) ?(year|date)|year of (passing|graduation)|batch year/, 'graduationYear'],
  [/notice ?period/, 'noticePeriod'],
  [/experience|\byoe\b|years? (of|in)/, 'experience'],
  [/skill|expertise|tech ?stack|technologies/, 'skills'],
  [/salary|\bctc\b|income|compensation|\bpay\b/, 'salary'],
  [/linked ?in/, 'linkedin'],
  [/git ?hub/, 'github'],
  [/twitter|\bx ?handle\b/, 'twitter'],
  [/website|portfolio|homepage|\burl\b|\bweb ?site\b|\bsite\b/, 'website'],
  [/company ?size|no\.? of employees|number of employees|team ?size|\bseats\b/, 'companySize'],
  [/company|organi[sz]ation|business ?name|employer|\bfirm\b|\borg\b|agency|vendor|supplier|shipper|consignor|account ?name|brand|institution ?name|clinic ?name|hospital ?name/, 'company'],
  [/job ?title|designation|position|\brole\b|occupation|profession/, 'jobTitle'],
  [/department|\bdept\b|division|\bteam\b|speciality|specialty/, 'department'],
  [/industry|sector|business ?type/, 'industry'],

  [/salutation|honorific|\bprefix\b/, 'salutation'],
  [/first ?name|given ?name|\bf ?name\b|forename/, 'firstName'],
  [/middle ?name|\bm ?name\b/, 'middleName'],
  [/last ?name|sur ?name|family ?name|\bl ?name\b/, 'lastName'],
  [/father|mother|guardian|parent|spouse|husband|wife/, 'relativeName'],
  [/user ?(name|id)|login ?(id|name)|\bhandle\b|screen ?name|nick ?name/, 'username'],
  [/full ?name|your ?name|\bname\b|contact ?person|applicant|recipient|consignee|attention|attendee/, 'fullName'],

  [/phone|mobile|\bcell\b|\btel\b|contact ?(no|number)\b|whats ?app|\bfax\b/, 'phone'],
  [/\bdob\b|birth|\bbday\b/, 'dob'],
  [/\bage\b/, 'age'],
  [/gender|\bsex\b/, 'gender'],
  [/marital/, 'maritalStatus'],
  [/nationality|citizenship/, 'nationality'],
  [/language|mother ?tongue/, 'language'],

  [/address ?(line)? ?2|\bapt\b|apartment|suite|\bunit\b|\bflat\b|landmark|locality/, 'address2'],
  [/address|street|\baddr\b|line ?1|house|door ?no|building/, 'address1'],
  [/\bcity\b|\btown\b|district|village/, 'city'],
  [/\bstate\b|province|\bregion\b|county/, 'state'],
  [/\bzip|postal|post ?code|pin ?code|\bpin\b/, 'postalCode'],
  [/country ?code|dial ?code|\bisd\b|calling ?code/, 'dialCode'],
  [/country|\bnation\b/, 'country'],

  [/check ?in|arrival|from ?date|start ?date|departure ?date|travel ?date|move ?in|joining ?date|event ?date|pickup ?date|appointment ?date|preferred ?date|date of (joining|travel|visit)/, 'startDate'],
  [/check ?out|to ?date|end ?date|return ?date|delivery ?date|till ?date/, 'endDate'],
  [/guests|travell?ers|passengers|adults|children|attendees|party ?size|no\.? of (people|persons|guests)|headcount/, 'guests'],
  [/bedroom|\bbhk\b|bathroom/, 'bedrooms'],
  [/sq ?ft|square|carpet|built ?up|plot ?(size|area)|\barea\b/, 'area'],
  [/qty|quantity|\bunits\b|no\.? of (items|units|packages|boxes|cartons)|pieces/, 'quantity'],
  [/currency/, 'currency'],
  [/amount|price|cost|\bfee|budget|revenue|\bvalue\b|\brate\b|premium|deposit|loan|donation|sum ?(assured|insured)|payment|\bemi\b|instal?l?ment|balance|outstanding|charges?\b|freight|\bfare\b|\btoll\b|\bmrp\b/, 'amount'],

  [/\bdate\b|\bdated\b|\bdue ?on\b/, 'date'],
  [/reference|\bref ?(no|number|id)?\b|application ?(no|id|number)\b|\bid\b|consumer ?(no|number)\b|account ?id|customer ?id/, 'reference'],
  [/subject|topic|headline|\btitle\b/, 'subject'],
  [/message|comment|note|description|details|remarks|about|\bbio\b|summary|feedback|reason|purpose|instruction|cover ?letter|requirement|explain|tell us|anything else|additional/, 'longText']
]

/** `autocomplete` tokens are the strongest signal a page can give. */
const AUTOCOMPLETE: Record<string, FieldKind> = {
  'honorific-prefix': 'salutation',
  'given-name': 'firstName',
  'additional-name': 'middleName',
  'family-name': 'lastName',
  name: 'fullName',
  nickname: 'username',
  username: 'username',
  email: 'email',
  'new-password': 'password',
  'current-password': 'password',
  'one-time-code': 'otp',
  tel: 'phone',
  'tel-national': 'phone',
  bday: 'dob',
  sex: 'gender',
  'street-address': 'address1',
  'address-line1': 'address1',
  'address-line2': 'address2',
  'address-level2': 'city',
  'address-level1': 'state',
  'postal-code': 'postalCode',
  country: 'country',
  'country-name': 'country',
  organization: 'company',
  'organization-title': 'jobTitle',
  'cc-name': 'cardName',
  'cc-number': 'cardNumber',
  'cc-csc': 'cvv',
  'cc-exp': 'cardExpiry',
  url: 'website',
  language: 'language'
}

const CONSENT = /terms|condition|privacy|policy|agree|accept|consent|declar|acknowledg|certify|confirm that/
const OPT_IN = /newsletter|marketing|subscribe|updates|offers|promotion|whats ?app updates|notify me|sms alerts/

/** Kinds matched by broad words ("name", "id", "title"); a label hitting only these defers to the full haystack. */
const GENERIC_KINDS = new Set<FieldKind>(['fullName', 'reference', 'subject', 'longText', 'company', 'text'])

function normalizeText(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-.[\]():*#]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function visibleText(field: FormField): string {
  const label = field.label && field.label !== 'Unnamed Field' ? field.label : ''
  return normalizeText([label, field.placeholder].filter(Boolean).join(' '))
}

function matchRules(text: string): FieldKind | undefined {
  for (const [pattern, kind] of RULES) {
    if (pattern.test(text)) return kind
  }
  return undefined
}

/** Lower-case "name id label placeholder" with camelCase and separators split into words. */
export function fieldHaystack(field: FormField): string {
  const el = field.element as HTMLElement | undefined
  const id = typeof el?.getAttribute === 'function' ? el.getAttribute('id') || '' : ''
  return normalizeText([field.name, id, field.label, field.placeholder].filter(Boolean).join(' '))
}

export function classifyField(field: FormField): FieldKind {
  const el = field.element as HTMLElement | undefined
  const haystack = fieldHaystack(field)
  const inputType = field.type

  if (inputType === 'file') return 'skip'
  if (inputType === 'checkbox') {
    if (OPT_IN.test(haystack)) return 'optIn'
    if (CONSENT.test(haystack)) return 'consent'
  }

  const autocomplete = typeof el?.getAttribute === 'function'
    ? (el.getAttribute('autocomplete') || '').toLowerCase().split(/\s+/).pop() || ''
    : ''
  if (AUTOCOMPLETE[autocomplete]) return AUTOCOMPLETE[autocomplete]

  // The visible label is what the page author meant; `name`/`id` are often
  // copy-pasted between inputs (e.g. every EMI input named "truck_no").
  const labelText = visibleText(field)
  if (labelText) {
    const fromLabel = matchRules(labelText)
    if (fromLabel && !GENERIC_KINDS.has(fromLabel)) return fromLabel
  }
  const kind = matchRules(haystack)
  if (kind) return kind

  switch (inputType) {
    case 'email': return 'email'
    case 'password': return 'password'
    case 'tel': return 'phone'
    case 'url': return 'website'
    case 'date': return 'date'
    case 'time': return 'time'
    case 'datetime-local': return 'datetime'
    case 'number': return 'number'
    case 'color': return 'color'
    case 'range': return 'range'
    case 'textarea': return 'longText'
    case 'checkbox': return 'consent'
    default: return 'text'
  }
}

/** Short human label for the popup's detected-fields list. */
export function kindLabel(kind: FieldKind): string {
  if (kind === 'skip') return 'skipped'
  if (kind === 'dob') return 'date of birth'
  if (kind === 'mrn') return 'patient ID'
  return kind
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .replace(/\b(gstin|pan|ifsc|cvv|npi|vin|otp|upi|ssn|ein|iban|swift|cin|tan|hs)\b/g, m => m.toUpperCase())
}
