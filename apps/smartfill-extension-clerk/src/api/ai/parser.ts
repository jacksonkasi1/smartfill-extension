// ** import types
import type { AIFormData, FormField } from '@/types/extension'

export function parseAIResponse(response: string, fields: FormField[]): AIFormData {
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response')
  }

  const jsonData = JSON.parse(jsonMatch[0])

  const cleanedData: AIFormData = {}
  const missingFields: string[] = []
  
  for (const field of fields) {
    const fieldName = field.name
    
    if (jsonData[fieldName]) {
      cleanedData[fieldName] = jsonData[fieldName]
      continue
    }

    const lowerFieldName = fieldName.toLowerCase()
    const matchingKey = Object.keys(jsonData).find(key => 
      key.toLowerCase() === lowerFieldName
    )
    
    if (matchingKey && jsonData[matchingKey]) {
      cleanedData[fieldName] = jsonData[matchingKey]
    } else {
      missingFields.push(fieldName)
      
      // Add fallback data for missing fields
      if (field.type === 'checkbox') {
        if (field.options && field.options.length > 1) {
          // Checkbox group - select first option
          cleanedData[fieldName] = [field.options[0]]
        } else {
          // Single checkbox - default to true for required fields, false otherwise
          cleanedData[fieldName] = field.required || fieldName.includes('terms')
        }
      } else if (field.type === 'radio') {
        // Radio - select first option if available
        cleanedData[fieldName] = field.options?.[0] || 'unknown'
      } else if (field.type === 'select') {
        // Select - choose first valid option
        cleanedData[fieldName] = field.options?.[0] || 'unknown'
      } else {
        // Text fields - provide generic data
        cleanedData[fieldName] = getGenericFieldValue(field)
      }
    }
  }

  if (missingFields.length > 0) {
    console.warn('⚠️ AI did not generate data for fields:', missingFields)
  }

  return cleanedData
}

function getGenericFieldValue(field: FormField): string {
  const name = field.name.toLowerCase()
  
  if (name.includes('email')) return 'test@example.com'
  if (name.includes('phone')) return '+1-555-0123'
  if (name.includes('name')) return 'Test User'
  if (name.includes('password')) return 'TestPass123!'
  if (name.includes('date')) return '12/01/2024'
  if (name.includes('time')) return '09:00'
  if (name.includes('age')) return '25'
  if (name.includes('salary')) return '50000'
  if (name.includes('zip') || name.includes('postal')) return '12345'
  if (name.includes('address') || name.includes('street')) return '123 Main St'
  if (name.includes('city')) return 'New York'
  if (name.includes('company')) return 'Test Corp'
  if (name.includes('title') || name.includes('job')) return 'Software Developer'
  
  return 'Test Value'
}