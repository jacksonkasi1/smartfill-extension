// ** import types
import type { FormField } from '@/types/extension'

export interface ModelMetadata {
  provider: string
  modelId: string
  modelType: 'recommended' | 'custom'
}

/**
 * Patterns that indicate a field is sensitive and must NEVER be
 * hallucinated. If the user did not provide a value for these fields,
 * the AI should leave them empty.
 */
const SENSITIVE_FIELD_PATTERNS = [
  'passport',
  'aadhaar',
  'ssn',
  'social security',
  'credit card',
  'card number',
  'cvv',
  'cvc',
  'bank account',
  'account number',
  'iban',
  'tax id',
  'pan number',
  'sin number',
  'pin',
  'password',
  'secret',
  'otp',
  '2fa',
  'auth code',
]

function isSensitiveField(field: FormField): boolean {
  const haystack = `${field.name} ${field.label || ''} ${field.placeholder || ''}`.toLowerCase()
  return SENSITIVE_FIELD_PATTERNS.some(p => haystack.includes(p))
}

export function buildPrompt(
  fields: FormField[],
  customInstructions?: string,
  modelMetadata?: ModelMetadata
): string {
  // System model metadata header (informational only)
  let modelHeader = ''
  if (modelMetadata) {
    modelHeader = `[System: You are running on ${modelMetadata.provider} using model "${modelMetadata.modelId}" (${modelMetadata.modelType}). This information is for your awareness only. Do not mention it in your response unless specifically asked.]\n\n`
  }

  // Split fields into sensitive and non-sensitive for explicit guidance
  const sensitiveFields = fields.filter(isSensitiveField)
  const normalFields = fields.filter(f => !isSensitiveField(f))

  const fieldDescriptions = normalFields.map(field => {
    let description = `- Field: "${field.name}" (type: ${field.type}, label: "${field.label || 'No label'}", placeholder: "${field.placeholder || 'No placeholder'}"`

    if (field.options && field.options.length > 0) {
      description += `, options: [${field.options.map((opt: string) => `"${opt}"`).join(', ')}]`

      // Special handling for checkboxes
      if (field.type === 'checkbox') {
        if (field.options.length === 1) {
          description += ` (single checkbox - use boolean)`
        } else {
          description += ` (checkbox group - use array of selected options)`
        }
      }
    } else if (field.type === 'checkbox') {
      description += ` (single checkbox - use boolean true/false)`
    }

    description += ')'
    return description
  }).join('\n')

  const sensitiveList = sensitiveFields
    .map(f => `- "${f.name}" (label: "${f.label || 'No label'}")`)
    .join('\n')

  let basePrompt = `${modelHeader}You are a form filling assistant. Your job is to produce realistic, context-aware values for the listed form fields and return them as a JSON object.

Form fields to fill:
${fieldDescriptions || '  (none)'}`

  if (customInstructions && customInstructions.trim().length > 0) {
    basePrompt += `

USER CONTEXT (treat as the PRIMARY source of truth — extract every piece of relevant information from here first):
"""
${customInstructions.trim()}
"""

Rules for using the user context:
1. If the user context explicitly provides a value for a field (e.g. "my name is Jackson", "use jackson@example.com"), use exactly that value.
2. The user context ALWAYS takes priority over field labels, placeholders, or your own assumptions. Never override an explicit user value.
3. For fields not mentioned in the user context, fall back to field labels, placeholders, nearby form context, and the available options.
4. Only invent values when the field is clearly safe to do so (e.g. an example phone number, a generic message body).`
  } else {
    basePrompt += `

No user context was provided. Generate reasonable values based on the field labels, placeholders, available options, and the surrounding form context. Do not invent sensitive personal information (see the sensitive list below).`
  }

  if (sensitiveFields.length > 0) {
    basePrompt += `

SENSITIVE FIELDS (do NOT generate values for these — leave them empty in the JSON output):
${sensitiveList}

The user did not provide a value for these fields in the context above. You must NOT hallucinate fake passport numbers, Aadhaar numbers, credit card numbers, bank account numbers, tax IDs, or passwords. If the user did not supply them, omit the field or return an empty string.`
  }

  basePrompt += `

General requirements:
1. Return ONLY a valid JSON object, no extra commentary, no markdown fences.
2. Keys must match the field names exactly.
3. For select / radio / listbox fields, choose one of the provided options verbatim — never invent a value.
4. For text inputs use concise, realistic values. For long-form textareas, provide a short, relevant paragraph.
5. For single checkboxes, return a boolean (true / false). For checkbox groups, return an array of the selected option strings.
6. For date / time fields, use ISO formats when possible (YYYY-MM-DD, HH:MM).
7. For password fields (if you somehow encounter one), return an empty string unless the user explicitly provided a password in the context.
8. Never include the field's options array in the response.

Example output shape:
{
  "firstName": "Jackson",
  "email": "jackson@example.com",
  "experience": "5 years",
  "employmentType": "Full Time",
  "preferredLocation": "Chennai"
}`

  return basePrompt
}
