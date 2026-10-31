// ** import types
import type { Random } from './random'

export type ProfileId =
  | 'general'
  | 'healthcare'
  | 'crm'
  | 'logistics'
  | 'government'
  | 'banking'
  | 'insurance'
  | 'ecommerce'
  | 'hr'
  | 'education'
  | 'realestate'
  | 'travel'
  | 'legal'
  | 'pharma'
  | 'manufacturing'
  | 'saas'
  | 'restaurant'
  | 'automotive'
  | 'telecom'
  | 'events'

export interface Profile {
  id: ProfileId
  name: string
  /** Sent to the AI as the form's domain. */
  description: string
  /** Lower-case words that point at this industry during auto-detect. */
  keywords: string[]
  orgs: string[]
  roles: string[]
  departments: string[]
  notes: string[]
  subjects: string[]
  /** Generic "reference / application / ID number" fields. */
  reference: (rng: Random) => string
  /** Typical money amount for generic "amount / price / budget" fields. */
  amount: [number, number]
  /** Generic date fields lean into the future (bookings, deliveries, events). */
  futureDates?: boolean
}

const year = new Date().getFullYear()

export const PROFILES: Profile[] = [
  {
    id: 'general',
    name: 'General',
    description: 'General-purpose web form (contact, sign-up, survey)',
    keywords: [],
    orgs: ['Northwind Labs', 'Brightpath Solutions', 'Bluecrest Ventures', 'Evergreen Studio'],
    roles: ['Product Manager', 'Operations Lead', 'Consultant', 'Marketing Specialist'],
    departments: ['Operations', 'Marketing', 'Product', 'Customer Success'],
    notes: [
      'Looking forward to hearing from your team about next steps.',
      'Please reach out by email; I am available on weekdays between 10 AM and 6 PM.',
      'Interested in learning more about your services and pricing options.'
    ],
    subjects: ['General enquiry', 'Request for information', 'Partnership question'],
    reference: r => `REF-${r.digits(6, true)}`,
    amount: [500, 25000]
  },
  {
    id: 'healthcare',
    name: 'Healthcare / Hospital',
    description: 'Hospital or clinic form: patient registration, appointment, clinical intake, discharge',
    keywords: ['patient', 'hospital', 'clinic', 'doctor', 'appointment', 'medical', 'health', 'diagnosis', 'symptom', 'allergy', 'medication', 'blood', 'admission', 'opd', 'ipd', 'uhid', 'mrn', 'physician', 'ward', 'emr', 'ehr'],
    orgs: ['Sunrise Multispeciality Hospital', 'CarePoint Clinic', 'Lotus Medical Centre', 'Green Valley Health'],
    roles: ['Consultant Physician', 'Staff Nurse', 'Front Desk Executive', 'Medical Officer'],
    departments: ['General Medicine', 'Cardiology', 'Orthopaedics', 'Paediatrics', 'Dermatology'],
    notes: [
      'Mild fever and dry cough for three days. No known drug allergies. Vitals stable at triage.',
      'Follow-up visit for blood pressure review. Currently on Amlodipine 5 mg once daily.',
      'Patient reports intermittent lower back pain after long hours of sitting; requests physiotherapy consult.'
    ],
    subjects: ['New patient appointment', 'Follow-up consultation', 'Lab report query'],
    reference: r => `UHID${year % 100}${r.digits(7, true)}`,
    amount: [500, 45000]
  },
  {
    id: 'crm',
    name: 'CRM / Sales',
    description: 'CRM lead, contact, deal or demo-request form for B2B sales',
    keywords: ['lead', 'deal', 'pipeline', 'prospect', 'opportunity', 'crm', 'demo', 'sales', 'account', 'contact us', 'quote', 'pricing', 'company size', 'annual revenue'],
    orgs: ['Acme Analytics Pvt Ltd', 'Vertex Cloud Systems', 'Pinnacle Retail Group', 'Orbit Fintech'],
    roles: ['Head of Operations', 'VP Sales', 'IT Manager', 'Procurement Lead', 'Founder & CEO'],
    departments: ['Sales', 'Procurement', 'IT', 'Finance'],
    notes: [
      'Mid-sized team evaluating tools to streamline onboarding and reporting. Interested in the annual plan; please schedule a demo next week.',
      'Met at the product webinar. Budget approved for Q3; decision expected within 30 days.',
      'Currently using spreadsheets for pipeline tracking and looking to migrate 4,000 contacts.'
    ],
    subjects: ['Demo request', 'Pricing enquiry', 'Enterprise plan'],
    reference: r => `LEAD-${r.digits(5, true)}`,
    amount: [50000, 1500000]
  },
  {
    id: 'logistics',
    name: 'Logistics & Shipping',
    description: 'Logistics / courier / freight form: shipment booking, pickup, consignment, warehouse',
    keywords: ['shipment', 'shipping', 'consignment', 'consignee', 'consignor', 'awb', 'tracking', 'courier', 'freight', 'cargo', 'pickup', 'delivery', 'warehouse', 'parcel', 'waybill', 'hsn', 'container', 'fleet', 'dispatch', 'e-way'],
    orgs: ['SwiftLine Logistics', 'BlueDart Freight Services', 'Continental Cargo Movers', 'Harbor Point Shipping'],
    roles: ['Logistics Coordinator', 'Warehouse Manager', 'Fleet Supervisor', 'Dispatch Executive'],
    departments: ['Dispatch', 'Warehouse', 'Fleet Operations', 'Customs'],
    notes: [
      'Fragile electronics. Handle with care and keep upright. Pickup between 10 AM and 1 PM.',
      'Two cartons of spare parts, total 18 kg. Consignee will pay delivery charges.',
      'Please call the consignee 30 minutes before delivery. Loading dock available at Gate 2.'
    ],
    subjects: ['Pickup request', 'Shipment delay', 'Freight quote'],
    reference: r => `SHP${r.digits(9, true)}`,
    amount: [800, 75000],
    futureDates: true
  },
  {
    id: 'government',
    name: 'Government / Public',
    description: 'Government or public-service application: certificates, permits, licences, grievances, tax',
    keywords: ['government', 'govt', 'citizen', 'certificate', 'application form', 'aadhaar', 'pan', 'voter', 'ration', 'municipal', 'gazette', 'grievance', 'permit', 'licence', 'license', 'passport', 'tehsil', 'district', 'ministry', 'department of', 'scheme', 'gov', 'nic'],
    orgs: ['Department of Revenue', 'Municipal Corporation', 'Regional Transport Office', 'District Collectorate'],
    roles: ['Applicant', 'Section Officer', 'Self-employed', 'Salaried Employee'],
    departments: ['Revenue', 'Transport', 'Public Works', 'Social Welfare'],
    notes: [
      'Requesting issue of income certificate for scholarship application. All supporting documents attached.',
      'Street light on 2nd Cross Street has not been working for two weeks. Kindly arrange repair.',
      'Application for change of address in property tax records following relocation.'
    ],
    subjects: ['Certificate request', 'Grievance', 'Change of address'],
    reference: r => `APP/${year}/${r.digits(6, true)}`,
    amount: [100, 5000]
  },
  {
    id: 'banking',
    name: 'Banking & Finance',
    description: 'Bank or fintech form: account opening, KYC, loan application, payments, beneficiary',
    keywords: ['bank', 'account opening', 'kyc', 'loan', 'emi', 'ifsc', 'swift', 'iban', 'beneficiary', 'credit', 'debit', 'deposit', 'nominee', 'upi', 'mortgage', 'branch', 'cibil', 'income'],
    orgs: ['Meridian Bank', 'Northstar Finance', 'Cauvery Co-operative Bank', 'Summit Capital'],
    roles: ['Software Engineer', 'Business Owner', 'Chartered Accountant', 'Relationship Manager'],
    departments: ['Retail Banking', 'Loans', 'Treasury', 'Wealth Management'],
    notes: [
      'Home loan for purchase of a 2BHK apartment. Co-applicant: spouse, salaried.',
      'Requesting increase in daily UPI transfer limit for business payments.',
      'Salary account opening through employer tie-up. Debit card to be delivered to the office address.'
    ],
    subjects: ['Loan enquiry', 'KYC update', 'Card request'],
    reference: r => `LN${r.digits(10, true)}`,
    amount: [25000, 2500000]
  },
  {
    id: 'insurance',
    name: 'Insurance',
    description: 'Insurance form: quote, policy purchase, claim intake, nominee, renewal',
    keywords: ['insurance', 'policy', 'premium', 'claim', 'insured', 'nominee', 'sum assured', 'coverage', 'underwriting', 'renewal', 'beneficiary', 'deductible', 'insurer'],
    orgs: ['SecureLife Insurance', 'Guardian General Insurance', 'Shield Health Cover', 'Anchor Assurance'],
    roles: ['Policy Holder', 'Claims Executive', 'Insurance Advisor', 'Underwriter'],
    departments: ['Claims', 'Underwriting', 'Renewals', 'Customer Service'],
    notes: [
      'Minor rear-end collision at a traffic signal. No injuries. Bumper and tail lamp damaged.',
      'Hospitalised for two days for viral fever. Cashless claim requested at network hospital.',
      'Requesting a family floater quote for two adults and one child with maternity cover.'
    ],
    subjects: ['New policy quote', 'Claim intimation', 'Policy renewal'],
    reference: r => `POL-${r.digits(4, true)}-${r.digits(6)}`,
    amount: [5000, 1000000]
  },
  {
    id: 'ecommerce',
    name: 'E-commerce / Retail',
    description: 'Online store form: checkout, shipping address, returns, product listing, seller onboarding',
    keywords: ['cart', 'checkout', 'order', 'product', 'shop', 'store', 'sku', 'seller', 'return', 'refund', 'coupon', 'billing address', 'shipping address', 'catalog', 'inventory', 'wishlist'],
    orgs: ['UrbanCart', 'Trendline Fashion', 'HomeNest Store', 'GadgetHub Retail'],
    roles: ['Store Manager', 'Seller', 'Category Manager', 'Customer'],
    departments: ['Catalogue', 'Fulfilment', 'Customer Care', 'Merchandising'],
    notes: [
      'Please leave the parcel with the security desk if nobody answers.',
      'Received the wrong size. Requesting an exchange for size M in the same colour.',
      'Gift order. Please do not include the invoice in the package.'
    ],
    subjects: ['Order issue', 'Return request', 'Seller onboarding'],
    reference: r => `OD${r.digits(12, true)}`,
    amount: [299, 25000]
  },
  {
    id: 'hr',
    name: 'HR & Recruitment',
    description: 'Job application, employee onboarding, leave request or HR form',
    keywords: ['job', 'career', 'resume', 'cv', 'applicant', 'candidate', 'employee', 'onboarding', 'experience', 'notice period', 'ctc', 'salary', 'leave', 'payroll', 'designation', 'hiring', 'interview', 'cover letter', 'linkedin'],
    orgs: ['Zenith Technologies', 'Crescent Software Services', 'Nimbus Digital', 'Quantum Works'],
    roles: ['Senior Software Engineer', 'Frontend Developer', 'HR Business Partner', 'Data Analyst', 'QA Engineer'],
    departments: ['Engineering', 'Human Resources', 'Data & Analytics', 'Quality Assurance'],
    notes: [
      'Full-stack engineer with 5 years of experience in TypeScript, React and Node.js. Led the migration of a monolith to microservices serving 2M monthly users.',
      'Passionate about building reliable products and mentoring junior developers. Available to join within 30 days.',
      'Requesting casual leave for a family function. Handover notes shared with the team lead.'
    ],
    subjects: ['Application for Software Engineer', 'Leave request', 'Referral'],
    reference: r => `EMP${r.digits(5, true)}`,
    amount: [600000, 3500000]
  },
  {
    id: 'education',
    name: 'Education / School',
    description: 'School, college or course form: admission, enrolment, exam registration, scholarship',
    keywords: ['student', 'school', 'college', 'university', 'admission', 'enrol', 'course', 'exam', 'grade', 'class', 'roll', 'scholarship', 'parent', 'guardian', 'semester', 'marks', 'cgpa', 'syllabus'],
    orgs: ['Greenwood International School', 'St. Xavier\'s College', 'Horizon Institute of Technology', 'Lakeside Public School'],
    roles: ['Student', 'Parent', 'Assistant Professor', 'Admissions Officer'],
    departments: ['Computer Science', 'Commerce', 'Mechanical Engineering', 'Science'],
    notes: [
      'Interested in the B.Tech Computer Science programme for the upcoming academic year. Hostel accommodation required.',
      'Requesting a duplicate mark sheet as the original was damaged.',
      'My child is joining Grade 6 after relocating from Bengaluru; transfer certificate is attached.'
    ],
    subjects: ['Admission enquiry', 'Fee query', 'Exam registration'],
    reference: r => `${year}${r.letters(2)}${r.digits(4, true)}`,
    amount: [5000, 250000]
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    description: 'Property enquiry, site-visit booking, listing, rental or tenancy form',
    keywords: ['property', 'real estate', 'apartment', 'flat', 'villa', 'plot', 'bhk', 'rent', 'lease', 'tenant', 'landlord', 'site visit', 'sq ft', 'carpet area', 'builder', 'listing', 'broker'],
    orgs: ['Skyline Realty', 'Prestige Homes Advisory', 'GreenAcre Developers', 'Keystone Properties'],
    roles: ['Home Buyer', 'Property Consultant', 'Landlord', 'Tenant'],
    departments: ['Sales', 'Leasing', 'Property Management'],
    notes: [
      'Looking for a 3BHK east-facing apartment near a metro station; ready to move preferred.',
      'Would like to schedule a site visit this Saturday morning with family.',
      'Requesting rental agreement renewal for 11 months with the same terms.'
    ],
    subjects: ['Site visit request', 'Price enquiry', 'Rental listing'],
    reference: r => `PROP-${r.digits(6, true)}`,
    amount: [1500000, 15000000]
  },
  {
    id: 'travel',
    name: 'Travel & Hospitality',
    description: 'Hotel, flight or tour booking, visa, guest check-in form',
    keywords: ['booking', 'hotel', 'flight', 'travel', 'trip', 'check-in', 'check in', 'check-out', 'guest', 'room', 'passenger', 'itinerary', 'visa', 'tour', 'departure', 'arrival', 'pnr', 'reservation'],
    orgs: ['Coastal Breeze Resorts', 'Wanderlust Holidays', 'Skyway Airlines', 'Heritage Grand Hotel'],
    roles: ['Traveller', 'Travel Consultant', 'Front Office Manager'],
    departments: ['Reservations', 'Front Office', 'Guest Relations'],
    notes: [
      'Early check-in requested; arriving on the morning flight. Prefer a sea-facing room on a higher floor.',
      'Anniversary trip — please arrange a cake and flowers in the room.',
      'Vegetarian meals for two guests. Airport pickup required.'
    ],
    subjects: ['Booking enquiry', 'Group booking', 'Cancellation request'],
    reference: r => r.alnum(6),
    amount: [3000, 150000],
    futureDates: true
  },
  {
    id: 'legal',
    name: 'Legal',
    description: 'Law firm intake, case filing, consultation request, notary or compliance form',
    keywords: ['legal', 'lawyer', 'advocate', 'attorney', 'case', 'court', 'petition', 'affidavit', 'litigation', 'client intake', 'matter', 'contract', 'notary', 'compliance', 'plaintiff', 'defendant'],
    orgs: ['Mehta & Associates', 'Carter Brooks LLP', 'Lexbridge Legal', 'Iyer Law Chambers'],
    roles: ['Client', 'Associate Advocate', 'Paralegal', 'Partner'],
    departments: ['Corporate Law', 'Litigation', 'Intellectual Property', 'Family Law'],
    notes: [
      'Seeking advice on a commercial lease dispute with the landlord over a security deposit refund.',
      'Need a review of a vendor agreement before signing, including liability and termination clauses.',
      'Trademark registration enquiry for a new consumer brand in class 25.'
    ],
    subjects: ['Consultation request', 'Contract review', 'Case update'],
    reference: r => `CS/${r.digits(4, true)}/${year}`,
    amount: [5000, 500000]
  },
  {
    id: 'pharma',
    name: 'Pharmacy & Lab',
    description: 'Pharmacy, diagnostic lab or pharma form: prescriptions, sample collection, batch records',
    keywords: ['pharmacy', 'prescription', 'drug', 'medicine', 'dosage', 'batch', 'lot', 'expiry', 'lab', 'sample', 'test report', 'diagnostic', 'pathology', 'manufacturer', 'mrp'],
    orgs: ['MediPlus Pharmacy', 'Accurate Diagnostics Lab', 'Helix Pharmaceuticals', 'WellCare Chemists'],
    roles: ['Pharmacist', 'Lab Technician', 'Quality Analyst', 'Patient'],
    departments: ['Dispensary', 'Pathology', 'Quality Control', 'Production'],
    notes: [
      'Home sample collection requested between 7 and 9 AM; fasting blood sugar and lipid profile.',
      'Refill for monthly prescription; please deliver generics where available.',
      'Batch released after QC approval. Storage below 25°C, protect from light.'
    ],
    subjects: ['Prescription refill', 'Home collection', 'Report query'],
    reference: r => `RX${r.digits(8, true)}`,
    amount: [150, 8000]
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing / ERP',
    description: 'Manufacturing or ERP form: purchase order, vendor registration, inventory, quality inspection',
    keywords: ['vendor', 'supplier', 'purchase order', 'inventory', 'stock', 'material', 'production', 'quality', 'inspection', 'erp', 'procurement', 'bom', 'plant', 'machine', 'rfq', 'gst'],
    orgs: ['Precision Components Pvt Ltd', 'Allied Steel Works', 'Apex Polymers', 'Titan Engineering Co.'],
    roles: ['Procurement Manager', 'Plant Supervisor', 'Quality Inspector', 'Store Keeper'],
    departments: ['Procurement', 'Production', 'Quality', 'Stores'],
    notes: [
      'Supply 500 units of CNC-machined flanges per the attached drawing, delivery in two lots.',
      'Minor surface scratches observed on 3% of the batch; accepted under deviation.',
      'Vendor registration for MS sheets and fasteners; ISO 9001 certified.'
    ],
    subjects: ['RFQ', 'Vendor registration', 'Quality deviation'],
    reference: r => `PO-${year}-${r.digits(5, true)}`,
    amount: [10000, 2000000]
  },
  {
    id: 'saas',
    name: 'SaaS / Tech Sign-up',
    description: 'Software product sign-up, onboarding, workspace setup, support ticket or developer form',
    keywords: ['sign up', 'signup', 'workspace', 'team name', 'api', 'developer', 'subdomain', 'trial', 'onboarding', 'support ticket', 'bug', 'feature request', 'integration', 'webhook', 'plan', 'seats'],
    orgs: ['Launchpad HQ', 'Codewave Labs', 'Stackline', 'Cloudnest'],
    roles: ['Engineering Manager', 'CTO', 'DevOps Engineer', 'Product Designer'],
    departments: ['Engineering', 'Platform', 'Design', 'Support'],
    notes: [
      'We need SSO and audit logs for a 40-person engineering team. Evaluating the Business plan.',
      'Webhook deliveries fail intermittently with a 504 since yesterday; request IDs attached.',
      'Feature request: export dashboards as PDF on a weekly schedule.'
    ],
    subjects: ['Bug report', 'Feature request', 'Billing question'],
    reference: r => `TCK-${r.digits(5, true)}`,
    amount: [1000, 200000]
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Food',
    description: 'Restaurant reservation, catering enquiry, food delivery or restaurant partner form',
    keywords: ['restaurant', 'reservation', 'table', 'menu', 'food', 'catering', 'dine', 'delivery', 'cuisine', 'chef', 'fssai', 'order online', 'party size'],
    orgs: ['Spice Route Kitchen', 'The Olive Table', 'Masala Junction', 'Harbour Café'],
    roles: ['Restaurant Owner', 'Head Chef', 'Guest', 'Catering Manager'],
    departments: ['Kitchen', 'Front of House', 'Catering'],
    notes: [
      'Table for six on Saturday at 8 PM; one guest is vegan and one has a nut allergy.',
      'Catering for 120 guests at an office event, South Indian lunch buffet.',
      'Please make it less spicy and add extra napkins.'
    ],
    subjects: ['Table reservation', 'Catering enquiry', 'Partner onboarding'],
    reference: r => `RSV-${r.digits(5, true)}`,
    amount: [500, 120000],
    futureDates: true
  },
  {
    id: 'automotive',
    name: 'Automotive',
    description: 'Vehicle service booking, test drive, dealership enquiry, registration or vehicle insurance form',
    keywords: ['vehicle', 'car', 'bike', 'test drive', 'service booking', 'dealer', 'registration number', 'vin', 'chassis', 'engine', 'odometer', 'fuel', 'model', 'variant', 'showroom'],
    orgs: ['Velocity Motors', 'AutoCare Service Centre', 'Highway Honda', 'Metro Cars'],
    roles: ['Service Advisor', 'Sales Consultant', 'Vehicle Owner'],
    departments: ['Service', 'Sales', 'Spare Parts'],
    notes: [
      'Periodic 20,000 km service. Brake noise when stopping at low speed; please inspect.',
      'Interested in a test drive of the automatic petrol variant this weekend.',
      'AC cooling is weak; requesting gas top-up and cabin filter replacement.'
    ],
    subjects: ['Service booking', 'Test drive', 'Insurance renewal'],
    reference: r => `JC${r.digits(7, true)}`,
    amount: [2500, 1800000],
    futureDates: true
  },
  {
    id: 'telecom',
    name: 'Telecom & Utilities',
    description: 'Telecom, broadband, electricity, water or gas connection, plan change and complaint form',
    keywords: ['broadband', 'connection', 'sim', 'mobile number', 'plan', 'recharge', 'electricity', 'meter', 'consumer number', 'utility', 'bill', 'outage', 'fiber', 'postpaid', 'prepaid'],
    orgs: ['Airwave Telecom', 'FiberNet Broadband', 'City Power Distribution', 'BlueLine Utilities'],
    roles: ['Subscriber', 'Field Technician', 'Customer Care Executive'],
    departments: ['Customer Care', 'Field Operations', 'Billing'],
    notes: [
      'Internet drops every evening between 8 and 11 PM. Router lights show LOS in red.',
      'New fibre connection for a 2BHK apartment; prefer installation on Sunday.',
      'Electricity bill for this month appears higher than usual; requesting meter re-check.'
    ],
    subjects: ['New connection', 'Service complaint', 'Plan change'],
    reference: r => `CN${r.digits(10, true)}`,
    amount: [199, 5000]
  },
  {
    id: 'events',
    name: 'Events & Non-profit',
    description: 'Event registration, ticketing, conference, volunteer sign-up or donation form',
    keywords: ['event', 'registration', 'ticket', 'conference', 'webinar', 'attendee', 'speaker', 'volunteer', 'donation', 'donate', 'ngo', 'charity', 'rsvp', 'workshop', 'meetup', 'sponsor'],
    orgs: ['TechSummit India', 'Hope Foundation', 'Open Source Meetup', 'Green Earth Trust'],
    roles: ['Attendee', 'Speaker', 'Volunteer', 'Sponsor Manager'],
    departments: ['Programs', 'Community', 'Fundraising'],
    notes: [
      'Attending both days; interested in the AI and developer-tools tracks. Vegetarian lunch please.',
      'Happy to volunteer for registration desk duty on weekends.',
      'Monthly donation towards the children\'s education programme.'
    ],
    subjects: ['Event registration', 'Speaker proposal', 'Volunteer sign-up'],
    reference: r => `TKT-${r.alnum(8)}`,
    amount: [500, 50000],
    futureDates: true
  }
]

export const PROFILE_MAP = Object.fromEntries(PROFILES.map(p => [p.id, p])) as Record<ProfileId, Profile>

export function isProfileId(value: unknown): value is ProfileId {
  return typeof value === 'string' && value in PROFILE_MAP
}
