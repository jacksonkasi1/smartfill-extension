// ** import types
import type { DetectedForm, DetectResult } from '@/types/extension'

// ** import utils
import { detectFieldsInContainer } from './fieldContainer'
import { detectReactFields, waitForReactComponents } from './reactDetection'
import { setupDynamicFormWatcher } from './dynamicWatcher'

export async function detectAllForms(): Promise<DetectResult> {
  const detectedForms: DetectedForm[] = []

  await waitForReactComponents(2000)

  const forms = document.querySelectorAll('form')
  for (const form of forms) {
    const formFields = detectFieldsInContainer(form)
    if (formFields.length > 0) {
      detectedForms.push({
        element: form,
        fields: formFields,
        fieldCount: formFields.length
      })
    }
  }

  const reactFields = detectReactFields()
  if (reactFields.length > 0) {
    // Create a synthetic form element for React fields that don't have a parent form
    const syntheticForm = document.createElement('form')
    syntheticForm.style.display = 'none'
    document.body.appendChild(syntheticForm)
    detectedForms.push({
      element: syntheticForm,
      fields: reactFields,
      fieldCount: reactFields.length
    })
  }

  const standaloneFields = document.querySelectorAll('input:not(form input), select:not(form select), textarea:not(form textarea)')
  const standaloneFormFields = detectFieldsInContainer(document.body, standaloneFields)
    .filter(field => !reactFields.some(rf => rf.element === field.element))
  
  if (standaloneFormFields.length > 0) {
    // Create a synthetic form element for standalone fields that don't have a parent form
    const syntheticForm = document.createElement('form')
    syntheticForm.style.display = 'none'
    document.body.appendChild(syntheticForm)
    detectedForms.push({
      element: syntheticForm,
      fields: standaloneFormFields,
      fieldCount: standaloneFormFields.length
    })
  }

  setupDynamicFormWatcher()

  return {
    success: true,
    formCount: detectedForms.length,
    forms: detectedForms
  }
}