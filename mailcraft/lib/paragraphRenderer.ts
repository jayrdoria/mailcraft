import type { BodyParagraph } from '@/lib/types/template'

const STAKES_P_STYLE =
  'margin: 0 0 12px 0; font-family: Roboto, sans-serif; font-size: 16px; font-weight: 400; color: #ef5e5e; text-align: center; line-height: 1.5;'

const X7_P_STYLE =
  'margin: 0 0 12px 0; font-family: &quot;Open Sans&quot;, sans-serif; font-size: 16px; font-weight: 400; line-height: 1.5; background: linear-gradient(90deg, #d9d9d9 0%, #ff3263 0.01%, #1800ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: #ff3263;'

export function renderBodyParagraphs(paragraphs: BodyParagraph[], brand: string): string {
  if (!paragraphs.length) return ''
  const style = brand === 'X7' ? X7_P_STYLE : STAKES_P_STYLE
  return paragraphs
    .map((p) => `<p style="${style}">${p.html || '&nbsp;'}</p>`)
    .join('\n')
}
