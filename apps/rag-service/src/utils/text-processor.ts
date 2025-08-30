export class TextProcessor {
  static chunkText(text: string, maxChunkSize = 1000, overlap = 100): string[] {
    if (text.length <= maxChunkSize) {
      return [text]
    }

    const chunks: string[] = []
    let start = 0

    while (start < text.length) {
      let end = start + maxChunkSize

      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end)
        const lastNewline = text.lastIndexOf('\n', end)
        const lastPunctuation = Math.max(
          text.lastIndexOf('.', end),
          text.lastIndexOf('!', end),
          text.lastIndexOf('?', end)
        )

        const bestBreak = Math.max(lastSpace, lastNewline, lastPunctuation)
        if (bestBreak > start + maxChunkSize * 0.5) {
          end = bestBreak + 1
        }
      }

      chunks.push(text.slice(start, end).trim())
      start = end - overlap
    }

    return chunks.filter(chunk => chunk.length > 0)
  }

  static extractTextFromFile(buffer: Buffer, filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase()

    switch (extension) {
      case 'txt':
      case 'md':
        return buffer.toString('utf-8')
      case 'json':
        try {
          const json = JSON.parse(buffer.toString('utf-8'))
          return JSON.stringify(json, null, 2)
        } catch {
          return buffer.toString('utf-8')
        }
      default:
        return buffer.toString('utf-8')
    }
  }

  static sanitizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
  }
}