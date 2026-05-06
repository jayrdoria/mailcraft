import type { BodyParagraph } from '@/lib/types/template'

const STAKES_P_BASE =
  'margin: 0; font-family: Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #ffffff; text-align: center; line-height: 1.5; '

const X7_P_BASE =
  'margin: 0; font-family: &quot;Open Sans&quot;, sans-serif; font-size: 15px; font-weight: 400; color: #ffffff; text-align: center; line-height: 1.5; '

export function renderBodyParagraphs(paragraphs: BodyParagraph[], brand: string): string {
  if (!paragraphs.length) return ''
  const base = brand === 'X7' ? X7_P_BASE : STAKES_P_BASE
  return paragraphs
    .map((p, i) => {
      const isLast = i === paragraphs.length - 1
      const style = base + (isLast ? 'padding-bottom: 22px;' : 'padding-bottom: 14px;')
      return `<p style="${style}">${p.html || '&nbsp;'}</p>`
    })
    .join('\n')
}
