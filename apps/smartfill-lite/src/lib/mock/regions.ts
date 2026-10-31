// ** import lib
import type { Random } from './random'

export type Region = 'in' | 'us' | 'uk'

export interface CityRecord {
  city: string
  state: string
  stateCode: string
  /** India only: the two-digit GST state code that prefixes a GSTIN. */
  gstCode?: string
  postal: (rng: Random) => string
  /** Localities that really belong to this city (used for address line 2). */
  areas?: string[]
}

export interface RegionData {
  id: Region
  label: string
  country: string
  countryCode: string
  nationality: string
  currency: string
  dateOrder: 'dmy' | 'mdy'
  promptHint: string
  maleNames: string[]
  femaleNames: string[]
  lastNames: string[]
  streets: string[]
  areas: string[]
  cities: CityRecord[]
  phone: (rng: Random) => string
}

const IN_CITIES: CityRecord[] = [
  { city: 'Chennai', state: 'Tamil Nadu', stateCode: 'TN', gstCode: '33', postal: r => `600${r.digits(3)}`, areas: ['T Nagar', 'Velachery', 'Adyar', 'Anna Nagar'] },
  { city: 'Coimbatore', state: 'Tamil Nadu', stateCode: 'TN', gstCode: '33', postal: r => `641${r.digits(3)}`, areas: ['RS Puram', 'Gandhipuram', 'Peelamedu'] },
  { city: 'Bengaluru', state: 'Karnataka', stateCode: 'KA', gstCode: '29', postal: r => `560${r.digits(3)}`, areas: ['Indiranagar', 'Koramangala', 'Whitefield', 'Jayanagar'] },
  { city: 'Mumbai', state: 'Maharashtra', stateCode: 'MH', gstCode: '27', postal: r => `400${r.digits(3)}`, areas: ['Andheri West', 'Bandra West', 'Powai', 'Dadar'] },
  { city: 'Pune', state: 'Maharashtra', stateCode: 'MH', gstCode: '27', postal: r => `411${r.digits(3)}`, areas: ['Kothrud', 'Baner', 'Viman Nagar'] },
  { city: 'Hyderabad', state: 'Telangana', stateCode: 'TG', gstCode: '36', postal: r => `500${r.digits(3)}`, areas: ['Banjara Hills', 'Gachibowli', 'Madhapur'] },
  { city: 'New Delhi', state: 'Delhi', stateCode: 'DL', gstCode: '07', postal: r => `110${r.digits(3)}`, areas: ['Saket', 'Dwarka', 'Lajpat Nagar', 'Karol Bagh'] },
  { city: 'Kochi', state: 'Kerala', stateCode: 'KL', gstCode: '32', postal: r => `682${r.digits(3)}`, areas: ['Kakkanad', 'Edappally', 'Panampilly Nagar'] },
  { city: 'Ahmedabad', state: 'Gujarat', stateCode: 'GJ', gstCode: '24', postal: r => `380${r.digits(3)}`, areas: ['Navrangpura', 'Satellite', 'Bodakdev'] },
  { city: 'Kolkata', state: 'West Bengal', stateCode: 'WB', gstCode: '19', postal: r => `700${r.digits(3)}`, areas: ['Salt Lake', 'Ballygunge', 'New Town'] },
  { city: 'Jaipur', state: 'Rajasthan', stateCode: 'RJ', gstCode: '08', postal: r => `302${r.digits(3)}` }
]

const US_CITIES: CityRecord[] = [
  { city: 'Austin', state: 'Texas', stateCode: 'TX', postal: r => `787${r.digits(2)}`, areas: ['Malviya Nagar', 'Vaishali Nagar', 'C Scheme'] },
  { city: 'Seattle', state: 'Washington', stateCode: 'WA', postal: r => `981${r.digits(2)}` },
  { city: 'Denver', state: 'Colorado', stateCode: 'CO', postal: r => `802${r.digits(2)}` },
  { city: 'Chicago', state: 'Illinois', stateCode: 'IL', postal: r => `606${r.digits(2)}` },
  { city: 'Boston', state: 'Massachusetts', stateCode: 'MA', postal: r => `021${r.digits(2)}` },
  { city: 'San Diego', state: 'California', stateCode: 'CA', postal: r => `921${r.digits(2)}` },
  { city: 'Atlanta', state: 'Georgia', stateCode: 'GA', postal: r => `303${r.digits(2)}` },
  { city: 'Columbus', state: 'Ohio', stateCode: 'OH', postal: r => `432${r.digits(2)}` },
  { city: 'Raleigh', state: 'North Carolina', stateCode: 'NC', postal: r => `276${r.digits(2)}` }
]

const UK_CITIES: CityRecord[] = [
  { city: 'London', state: 'Greater London', stateCode: 'LND', postal: r => `${r.pick(['EC1A', 'SW1A', 'N1', 'SE1', 'W1D'])} ${r.int(1, 9)}${r.letters(2)}` },
  { city: 'Manchester', state: 'Greater Manchester', stateCode: 'MAN', postal: r => `M${r.int(1, 40)} ${r.int(1, 9)}${r.letters(2)}` },
  { city: 'Birmingham', state: 'West Midlands', stateCode: 'BIR', postal: r => `B${r.int(1, 40)} ${r.int(1, 9)}${r.letters(2)}` },
  { city: 'Leeds', state: 'West Yorkshire', stateCode: 'LDS', postal: r => `LS${r.int(1, 28)} ${r.int(1, 9)}${r.letters(2)}` },
  { city: 'Bristol', state: 'Bristol', stateCode: 'BST', postal: r => `BS${r.int(1, 16)} ${r.int(1, 9)}${r.letters(2)}` },
  { city: 'Edinburgh', state: 'Scotland', stateCode: 'EDH', postal: r => `EH${r.int(1, 17)} ${r.int(1, 9)}${r.letters(2)}` }
]

export const REGIONS: Record<Region, RegionData> = {
  in: {
    id: 'in',
    label: 'India',
    country: 'India',
    countryCode: 'IN',
    nationality: 'Indian',
    currency: 'INR',
    dateOrder: 'dmy',
    promptHint: 'India: +91 10-digit mobiles, 6-digit PIN codes, INR amounts, DD/MM/YYYY dates, Indian names and addresses, GSTIN/PAN/IFSC/Aadhaar formats',
    maleNames: ['Arjun', 'Karthik', 'Rahul', 'Vikram', 'Aditya', 'Rohan', 'Siddharth', 'Pranav', 'Naveen', 'Harish', 'Varun', 'Suresh'],
    femaleNames: ['Priya', 'Ananya', 'Divya', 'Kavya', 'Meera', 'Sneha', 'Lakshmi', 'Nandini', 'Aishwarya', 'Pooja', 'Shruti', 'Deepika'],
    lastNames: ['Sharma', 'Iyer', 'Reddy', 'Nair', 'Patel', 'Menon', 'Krishnan', 'Gupta', 'Rao', 'Subramanian', 'Mehta', 'Kumar', 'Pillai', 'Joshi'],
    streets: ['MG Road', 'Anna Salai', 'Residency Road', 'Linking Road', 'Park Street', 'Nehru Street', 'Gandhi Nagar Main Road', '100 Feet Road'],
    areas: ['Indiranagar', 'T Nagar', 'Koramangala', 'Andheri West', 'Banjara Hills', 'Velachery', 'Whitefield', 'Salt Lake'],
    cities: IN_CITIES,
    phone: r => `+91 ${r.pick(['98', '97', '94', '90', '88', '70'])}${r.digits(3)} ${r.digits(5)}`
  },
  us: {
    id: 'us',
    label: 'United States',
    country: 'United States',
    countryCode: 'US',
    nationality: 'American',
    currency: 'USD',
    dateOrder: 'mdy',
    promptHint: 'United States: (555) 01xx fictional phone numbers, 5-digit ZIP codes, USD amounts, MM/DD/YYYY dates, US names and addresses, SSN/EIN/NPI formats',
    maleNames: ['James', 'Michael', 'Daniel', 'Ethan', 'Ryan', 'Nathan', 'Lucas', 'Owen', 'Caleb', 'Logan'],
    femaleNames: ['Emily', 'Olivia', 'Sophia', 'Madison', 'Grace', 'Chloe', 'Hannah', 'Abigail', 'Natalie', 'Avery'],
    lastNames: ['Carter', 'Mitchell', 'Brooks', 'Bennett', 'Hayes', 'Foster', 'Reed', 'Coleman', 'Parker', 'Morgan', 'Sullivan', 'Turner'],
    streets: ['Maple Avenue', 'Oak Street', 'Cedar Lane', 'Lakeview Drive', 'Washington Blvd', 'Elm Street', 'Highland Avenue', 'Sunset Road'],
    areas: ['Suite 200', 'Apt 4B', 'Unit 12', 'Floor 3', 'Suite 410', 'Apt 7C'],
    cities: US_CITIES,
    phone: r => `(${r.pick(['512', '206', '303', '312', '617', '619'])}) 555-01${r.digits(2)}`
  },
  uk: {
    id: 'uk',
    label: 'United Kingdom',
    country: 'United Kingdom',
    countryCode: 'GB',
    nationality: 'British',
    currency: 'GBP',
    dateOrder: 'dmy',
    promptHint: 'United Kingdom: 07700 900xxx fictional mobiles, UK postcodes, GBP amounts, DD/MM/YYYY dates, British names and addresses, National Insurance/VAT formats',
    maleNames: ['Oliver', 'Harry', 'George', 'Jack', 'Thomas', 'William', 'Samuel', 'Alfie', 'Henry', 'Charlie'],
    femaleNames: ['Amelia', 'Isla', 'Ava', 'Emily', 'Freya', 'Poppy', 'Charlotte', 'Sophie', 'Lucy', 'Evie'],
    lastNames: ['Smith', 'Taylor', 'Davies', 'Wilson', 'Evans', 'Thomas', 'Roberts', 'Walker', 'Wright', 'Hughes', 'Clarke', 'Hall'],
    streets: ['High Street', 'Station Road', 'Church Lane', 'Victoria Road', 'Kings Road', 'Mill Lane', 'Park Avenue', 'The Crescent'],
    areas: ['Flat 3', 'Flat 12', 'Unit 5', 'Apartment 8', 'Suite 2'],
    cities: UK_CITIES,
    phone: r => `07700 900${r.digits(3)}`
  }
}

const REGION_HINTS: Array<[RegExp, Region]> = [
  [/aadha?ar|\bpan\b|gstin|\bgst\b|\bifsc\b|pin ?code|\bupi\b|\bpincode\b|tamil nadu|karnataka|maharashtra|\binr\b|₹/, 'in'],
  [/\bssn\b|social security|\bzip\b|zip ?code|\bein\b|\bnpi\b|\busd\b|california|texas/, 'us'],
  [/post ?code|national insurance|\bnino\b|\bcounty\b|\bgbp\b|£/, 'uk']
]

/**
 * Resolve "auto": the page's TLD first, then region-specific fields
 * (an Aadhaar or PIN code field means India whatever the browser
 * language), then the browser language.
 */
export function detectRegion(host: string, language: string, fieldText = ''): Region {
  if (/\.in$/.test(host)) return 'in'
  if (/\.uk$/.test(host)) return 'uk'
  const text = fieldText.toLowerCase()
  for (const [pattern, region] of REGION_HINTS) {
    if (pattern.test(text)) return region
  }
  const lang = language.toLowerCase()
  if (/-in$|^(hi|ta|te|kn|ml|mr|bn|gu|pa)\b/.test(lang)) return 'in'
  if (/-gb$/.test(lang)) return 'uk'
  return 'us'
}
