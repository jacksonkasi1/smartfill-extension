// ** import constants
import { geistFontData } from './font-data'

const registeredDocuments = new WeakSet<Document>()

/** FontFace registration lets shadow-root controls use our bundled font offline. */
export function registerUiFont(doc: Document): void {
  if (registeredDocuments.has(doc) || typeof FontFace === 'undefined' || !doc.fonts) return
  registeredDocuments.add(doc)
  const face = new FontFace('SmartFill Geist', `url(${geistFontData})`, { weight: '100 900', style: 'normal' })
  doc.fonts.add(face)
  void face.load().catch(() => { registeredDocuments.delete(doc) })
}
