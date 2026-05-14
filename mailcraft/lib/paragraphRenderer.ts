import type { BodyParagraph } from '@/lib/types/template'

export type BodyAlignment = 'center' | 'left'

function buildBase(brand: string, alignment: BodyAlignment): string {
  const font = brand === 'X7'
    ? '&quot;Open Sans&quot;, sans-serif'
    : 'Roboto, sans-serif'
  const textAlign = alignment === 'left' ? 'text-align: justify;' : 'text-align: center;'
  return `margin: 0; font-family: ${font}; font-size: 15px; font-weight: 400; color: #ffffff; ${textAlign} line-height: 1.5; `
}

function renderList(html: string, brand: string, isLast: boolean, alignment: BodyAlignment): string {
  const font = brand === 'X7' ? '&quot;Open Sans&quot;, sans-serif' : 'Roboto, sans-serif'
  const isOrdered = html.trimStart().startsWith('<ol')
  const bottomPadding = isLast ? '22px' : '14px'
  const textAlign = alignment === 'left' ? 'text-align: justify;' : 'text-align: center;'

  const listStyle = `padding-left: 0; margin: 0; padding-bottom: ${bottomPadding}; list-style-type: ${isOrdered ? 'decimal' : 'disc'}; list-style-position: inside;`
  const itemStyle = `font-family: ${font}; font-size: 15px; font-weight: 400; color: #ffffff; line-height: 1.5; ${textAlign} margin-bottom: 0;`

  return html
    .replace(/<(ul|ol)[^>]*>/, `<$1 style="${listStyle}">`)
    .replace(/<li[^>]*>/g, `<li style="${itemStyle}">`)
    .replace(/<p>/g, '').replace(/<\/p>/g, '')
}

export function renderBodyParagraphs(
  paragraphs: BodyParagraph[],
  brand: string,
  alignment: BodyAlignment = 'center'
): string {
  if (!paragraphs.length) return ''
  const base = buildBase(brand, alignment)
  return paragraphs
    .map((p, i) => {
      const isLast = i === paragraphs.length - 1
      // Empty paragraph = compact spacer (~14px), not a full-height blank line
      if (!p.html) {
        return `<p style="margin: 0; font-size: 4px; line-height: 1; padding-bottom: 10px;">&nbsp;</p>`
      }
      const html = p.html
      if (html.trimStart().startsWith('<ul') || html.trimStart().startsWith('<ol')) {
        return renderList(html, brand, isLast, alignment)
      }
      const style = base + (isLast ? 'padding-bottom: 22px;' : 'padding-bottom: 14px;')
      return `<p style="${style}">${html}</p>`
    })
    .join('\n')
}
