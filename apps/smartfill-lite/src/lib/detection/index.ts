// Detection module barrel. The Lite build uses a single
// `detectAllForms()` call from `./formDetection`. Other files in
// this folder (`fieldContainer`, `reactDetection`, `dynamicWatcher`)
// are kept as historical compatibility shims but are not part of
// the active detection pipeline.

export * from './formDetection'
export * from './fieldValidation'
export * from './fieldTypes'
export * from './fieldNames'
export * from './fieldLabels'
export * from './fieldOptions'
export * from './formSelector'
export * from './formPattern'
