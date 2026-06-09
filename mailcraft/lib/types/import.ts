// Shared types for the HTML import feature.
// Kept separate from the service file so client components can import safely.

export interface DomNode {
  mcId: string
  type: 'text' | 'image' | 'link'
  preview: string  // first 80 chars of text, or src/href
  tag: string
}

export interface FieldMapping {
  mcId: string
  label: string
  type: 'text' | 'url' | 'link' | 'richtext'
}

export interface AnalyzeResult {
  instrumentedHtml: string  // HTML with data-mc-id attrs injected
  domNodes: DomNode[]
}
