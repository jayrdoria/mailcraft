import type { BodyParagraph } from '@/lib/types/template'

const STAKES_P_BASE =
  'margin: 0; font-family: Roboto, sans-serif; font-size: 15px; font-weight: 400; color: #ffffff; text-align: center; line-height: 1.5; '

const X7_P_BASE =
  'margin: 0; font-family: &quot;Open Sans&quot;, sans-serif; font-size: 15px; font-weight: 400; color: #ffffff; text-align: center; line-height: 1.5; '

function renderList(html: string, brand: string, isLast: boolean): string {
  const font = brand === 'X7' ? '&quot;Open Sans&quot;, sans-serif' : 'Roboto, sans-serif'
  const isOrdered = html.trimStart().startsWith('<ol')
  const bottomPadding = isLast ? '22px' : '14px'

  const listStyle = `padding-left: 0; margin: 0; padding-bottom: ${bottomPadding}; list-style-type: ${isOrdered ? 'decimal' : 'disc'}; list-style-position: inside;`
  const itemStyle = `font-family: ${font}; font-size: 15px; font-weight: 400; color: #ffffff; line-height: 1.5; text-align: center; margin-bottom: 4px;`

  return html
    .replace(/<(ul|ol)[^>]*>/, `<$1 style="${listStyle}">`)
    .replace(/<li[^>]*>/g, `<li style="${itemStyle}">`)
    .replace(/<p>/g, '').replace(/<\/p>/g, '')
}

export function renderBodyParagraphs(paragraphs: BodyParagraph[], brand: string): string {
  if (!paragraphs.length) return ''
  const base = brand === 'X7' ? X7_P_BASE : STAKES_P_BASE
  return paragraphs
    .map((p, i) => {
      const isLast = i === paragraphs.length - 1
      const html = p.html || '&nbsp;'
      if (html.trimStart().startsWith('<ul') || html.trimStart().startsWith('<ol')) {
        return renderList(html, brand, isLast)
      }
      const style = base + (isLast ? 'padding-bottom: 22px;' : 'padding-bottom: 14px;')
      return `<p style="${style}">${html}</p>`
    })
    .join('\n')
}
