// ** import types
import type { FormField } from '@/types/extension'

export interface ModelMetadata {
  provider: string
  modelId: string
  modelType: 'recommended' | 'custom'
}

export function buildPrompt(fields: FormField[], customInstructions?: string, modelMetadata?: ModelMetadata): string {
  // Add model metadata header if provided
  let modelHeader = ''
  if (modelMetadata) {
    modelHeader = `[System: You are running on ${modelMetadata.provider} using model "${modelMetadata.modelId}" (${modelMetadata.modelType}). This information is for your awareness only. Do not mention it in your response unless specifically asked.]\n\n`
  }

  const fieldDescriptions = fields.map(field => {
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

  let basePrompt = `${modelHeader}You are a form filling assistant. Please generate realistic test data for the following form fields. Return the data as a JSON object where keys are field names and values are appropriate test data.

Form fields to fill:
${fieldDescriptions}`

  if (customInstructions) {
    basePrompt += `

CUSTOM INSTRUCTIONS:
${customInstructions}

Please follow the custom instructions above while still adhering to the technical requirements below.`
  }

  basePrompt += `

Requirements:
1. Generate realistic, appropriate data for each field type
2. For name fields, use realistic names
3. For email fields, use realistic email addresses (format: name@domain.com)
4. For phone fields, use proper phone number formats
5. For date fields, use MM/DD/YYYY format
6. For address fields, use realistic addresses
7. For select/radio fields with options, MUST choose one of the provided options exactly as listed
8. For select fields, choose a reasonable option from the list
9. For radio fields, choose exactly one option from the provided list
10. For single checkboxes (marked with "single checkbox"), use boolean values: true or false
11. For checkbox groups (marked with "checkbox group"), use array of selected option values
12. For checkbox fields with no options, use boolean true or false
13. For text areas, provide relevant short messages

CRITICAL: Checkbox fields require special handling:
- Single checkboxes (like "terms", "newsletter"): Return boolean (true/false)
- Checkbox groups (like "hobbies"): Return array of strings ["option1", "option2"]

Return ONLY a valid JSON object, no additional text or formatting.

Example format:
{
  "firstName": "John",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "terms": true,
  "newsletter": false,
  "hobbies": ["reading", "sports"]
}`

  return basePrompt
}