// Regression layer "api": /api/thumbnail-presets with ORIGINAL-shape payloads (status codes, messages, bodies).
// Creates temp presets and always deletes them. Run through run.mjs.
// Usage: node snapshot-api.mjs <cookieDir> <outFile> <baseUrl>
import { readFileSync, writeFileSync } from 'node:fs'
const [COOKIES, outFile, ORIGIN] = process.argv.slice(2)
const BASE = `${ORIGIN}/api/thumbnail-presets`
const ck = (n) => `authjs.session-token=${readFileSync(`${COOKIES}/cookie-${n}.txt`, 'utf8').trim()}`
const ids = new Map() // real id → placeholder
const created = []
const norm = (v) => {
  if (Array.isArray(v)) return v.map(norm)
  if (v && typeof v === 'object') {
    const o = {}
    for (const k of Object.keys(v).sort()) {
      if (k === 'createdAt' || k === 'updatedAt') continue
      o[k] = norm(v[k])
    }
    return o
  }
  if (typeof v === 'string' && ids.has(v)) return ids.get(v)
  return v
}
const call = async (method, path, { who = 'admin', body } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(who ? { cookie: ck(who) } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}
const T = (en, fr, de, it, es) => ({ en, fr, de, it, es })
const stakesCard = {
  brand: 'STAKES', kind: 'card', imageUrl: 'https://example.com/regress-a.png',
  labels: T('Regress A', 'Regress A fr', 'Regress A de', 'Regress A it', 'Regress A es'),
  links: T('https://www.stakes.com/a', 'https://www.stakes3.com/a', '', 'https://www.stakes.com/a', ''),
}
const results = {}
// Leftovers from an interrupted run (temp presets all use https://example.com/regress-*)
const sweep = async () => {
  const all = (await call('GET', '')).json?.data ?? []
  for (const p of all.filter((p) => p.imageUrl.startsWith('https://example.com/regress-'))) await call('DELETE', `/${p.id}`)
}
await sweep()
const rec = (name, r) => { results[name] = norm(r) }
try {
  rec('get-all', await call('GET', ''))
  rec('get-x7v2', await call('GET', '?brand=X7_V2'))
  rec('get-stakes-empty', await call('GET', '?brand=STAKES'))
  rec('get-bad-brand', await call('GET', '?brand=NOPE'))
  rec('get-anon', await call('GET', '', { who: null }))
  rec('post-noperm', await call('POST', '', { who: 'noperm', body: stakesCard }))
  rec('post-missing-label', await call('POST', '', { body: { ...stakesCard, labels: { ...stakesCard.labels, de: '' } } }))
  rec('post-bad-url', await call('POST', '', { body: { ...stakesCard, imageUrl: 'javascript:alert(1)' } }))
  rec('post-icon-stakes', await call('POST', '', { body: { ...stakesCard, kind: 'icon' } }))
  rec('post-bad-link', await call('POST', '', { body: { ...stakesCard, links: { ...stakesCard.links, it: 'ftp://x' } } }))

  const a = await call('POST', '', { body: stakesCard })
  if (a.json?.data?.id) { ids.set(a.json.data.id, 'ID_A'); created.push(a.json.data.id) }
  rec('post-stakes-a', a)
  const b = await call('POST', '', { body: { brand: 'STAKES', kind: 'card', imageUrl: 'https://example.com/regress-b.png', labels: T('B', 'B', 'B', 'B', 'B'), links: T('', '', '', '', ''), sublabels: null } })
  if (b.json?.data?.id) { ids.set(b.json.data.id, 'ID_B'); created.push(b.json.data.id) }
  rec('post-stakes-b-empty-links', b)
  const c = await call('POST', '', { body: { brand: 'X7_V2', kind: 'card', imageUrl: 'https://example.com/regress-c.png', labels: T('C', 'C fr', 'C de', 'C it', 'C es'), sublabels: T('sub', '', '', '', '') } })
  if (c.json?.data?.id) { ids.set(c.json.data.id, 'ID_C'); created.push(c.json.data.id) }
  rec('post-v2-c-sublabels', c)

  rec('get-stakes-2', await call('GET', '?brand=STAKES'))
  rec('patch-a', await call('PATCH', `/${created[0]}`, { body: { ...stakesCard, labels: { ...stakesCard.labels, en: 'Regress A2' } } }))
  rec('patch-missing', await call('PATCH', '/does-not-exist', { body: stakesCard }))
  rec('patch-noperm', await call('PATCH', `/${created[0]}`, { who: 'noperm', body: stakesCard }))
  const re = await call('POST', '/reorder', { body: { brand: 'STAKES', kind: 'card', ids: [created[1], created[0]] } })
  rec('reorder-stakes', { status: re.status, stakes: (re.json?.data ?? []).filter((p) => p.brand === 'STAKES').map((p) => [p.id, p.sortOrder]).map(norm) })
  rec('reorder-stale', await call('POST', '/reorder', { body: { brand: 'STAKES', kind: 'card', ids: [created[0]] } }))
  rec('get-stakes-3', await call('GET', '?brand=STAKES'))
  rec('delete-noperm', await call('DELETE', `/${created[0]}`, { who: 'noperm' }))

  // ── 2026-11-10: FRCA texts + per-language images (new-* cases) ──
  const keep = async (name, r, tag) => {
    if (r.json?.data?.id) { ids.set(r.json.data.id, tag); created.push(r.json.data.id) }
    rec(name, r)
    return r.json?.data?.id
  }
  const frcaBody = {
    brand: 'STAKES', kind: 'card', imageUrl: 'https://example.com/regress-n1.png',
    imageUrls: { fr: 'https://example.com/regress-n1-fr.png', frca: 'https://example.com/regress-n1-ca.png', de: '  ', it: '' },
    labels: { ...T('N1', 'N1 fr', 'N1 de', 'N1 it', 'N1 es'), frca: 'N1 ca' },
    sublabels: { ...T('', '', '', '', ''), frca: 'only ca' },
    links: { ...T('https://www.stakes.com/n1', 'https://www.stakes3.com/n1', '', '', ''), frca: 'https://www.stakes.com/n1-ca' },
  }
  const n1 = await keep('new-post-stakes-frca-images', await call('POST', '', { body: frcaBody }), 'ID_N1')
  await keep('new-post-x7-frca-dropped', await call('POST', '', { body: { ...frcaBody, brand: 'X7', imageUrls: { frca: 'https://example.com/regress-x.png', it: 'https://example.com/regress-x-it.png' } } }), 'ID_N2')
  await keep('new-post-stakes-blank-frca', await call('POST', '', { body: {
    ...frcaBody, imageUrls: { fr: '', frca: ' ' }, labels: { ...frcaBody.labels, frca: '   ' }, sublabels: null, links: { ...frcaBody.links, frca: '' },
  } }), 'ID_N3')
  rec('new-post-bad-image-url', await call('POST', '', { body: { ...frcaBody, imageUrls: { fr: 'javascript:alert(1)' } } }))
  rec('new-post-bad-frca-link', await call('POST', '', { body: { ...frcaBody, links: { ...frcaBody.links, frca: 'ftp://x' } } }))
  rec('new-post-long-frca-label', await call('POST', '', { body: { ...frcaBody, labels: { ...frcaBody.labels, frca: 'x'.repeat(101) } } }))
  rec('new-patch-clear-images', await call('PATCH', `/${n1}`, { body: { ...frcaBody, imageUrls: null } }))
  rec('new-patch-noperm', await call('PATCH', `/${n1}`, { who: 'noperm', body: frcaBody }))
  rec('new-get-stakes', await call('GET', '?brand=STAKES'))

  // ── 2026-11-10: duplicate (dup-* cases) — copy lands right after the original, rest keeps its order ──
  await keep('dup-preset-n1', await call('POST', `/${n1}/duplicate`), 'ID_DUP1')
  await keep('dup-preset-a', await call('POST', `/${created[0]}/duplicate`), 'ID_DUP2')
  const order = await call('GET', '?brand=STAKES')
  rec('dup-order', { status: order.status, ids: (order.json?.data ?? []).map((p) => [p.id, p.labels.en]).map(norm) })
  const longLabel = await keep('dup-long-src', await call('POST', '', { body: { ...frcaBody, labels: { ...frcaBody.labels, en: 'L'.repeat(100) } } }), 'ID_LONG')
  await keep('dup-long-label', await call('POST', `/${longLabel}/duplicate`), 'ID_DUP3')
  rec('dup-missing', await call('POST', '/does-not-exist/duplicate'))
  rec('dup-noperm', await call('POST', `/${n1}/duplicate`, { who: 'noperm' }))
  rec('dup-anon', await call('POST', `/${n1}/duplicate`, { who: null }))
} finally {
  for (const id of created) rec(`delete-${ids.get(id)}`, await call('DELETE', `/${id}`))
  if (created[0]) rec('delete-again', await call('DELETE', `/${created[0]}`))
  await sweep() // anything a failed delete left behind
  rec('get-all-after', await call('GET', ''))
}
// ── 2026-11-17: Admin → Links (links-* cases) on the X7 V2 Whitelist master (backed up by prepare-api,
// restored by restore-api). Proves: admin-only, validation, stale writes, and that edits reach NEW templates
// + duplicates while an existing template keeps its links. Temp saved templates are always deleted.
const WL = readFileSync(`${COOKIES}/links-master-id.txt`, 'utf8').trim()
ids.set(WL, 'ID_WL')
const LINKS = `${ORIGIN}/api/admin/master-templates/${WL}/links`
const SAVED = `${ORIGIN}/api/templates/saved`
const at = async (method, url, { who = 'admin', body } = {}) => {
  const res = await fetch(url, {
    method,
    headers: { ...(who ? { cookie: ck(who) } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, text }
}
const status = (r) => ({ status: r.status, error: r.json?.error ?? null, message: r.json?.message ?? null })
const tempSaved = []
const html = async (id, lang = 'en') => (await at('GET', `${SAVED}/${id}/html?lang=${lang}`)).text
const clone = async (name) => {
  const r = await at('POST', SAVED, { body: { name, masterTemplateId: WL } })
  if (r.json?.data?.id) tempSaved.push(r.json.data.id)
  return r
}
try {
  const g = await at('GET', LINKS)
  rec('links-get', { status: g.status, data: g.json?.data })
  rec('links-get-anon', status(await at('GET', LINKS, { who: null })))
  rec('links-get-dept', status(await at('GET', LINKS, { who: 'dept' })))
  rec('links-get-missing', status(await at('GET', `${ORIGIN}/api/admin/master-templates/does-not-exist/links`)))
  const v = g.json?.data
  const slot = (id) => v?.links?.find((l) => l.id === id)
  const logoEn = slot('editable:LOGO_LINK:en:0')
  const put = (body, who) => at('PUT', LINKS, { who, body: { expectedUpdatedAt: v?.updatedAt, ...body } })
  const edit = (to, from = logoEn?.url) => ({ edits: [{ id: 'editable:LOGO_LINK:en:0', from, to }] })

  rec('links-put-dept', status(await put(edit('https://x7casino.io/regress'), 'dept')))
  rec('links-put-empty', status(await put({})))
  rec('links-put-js', status(await put(edit('javascript:alert(1)'))))
  rec('links-put-quote', status(await put(edit('https://x7casino.io/" onmouseover="x'))))
  rec('links-put-bad-id', status(await put({ edits: [{ id: 'editable:NOPE:en:0', from: 'a', to: 'https://a.com' }] })))
  rec('links-put-stale-from', status(await put(edit('https://x7casino.io/regress', 'https://not-what-it-was.example'))))
  rec('links-put-stale-master', status(await at('PUT', LINKS, { body: { expectedUpdatedAt: '2000-01-01T00:00:00.000Z', ...edit('https://x7casino.io/regress') } })))
  rec('links-put-short-find', status(await put({ bulk: { find: 'x7', replace: 'y7' } })))

  // An existing template (created before the edit) …
  const old = await clone('regress-links-old')
  rec('links-clone-old', status(old))
  const oldId = old.json?.data?.id
  const oldBefore = oldId ? await html(oldId, 'de') : ''

  // … then the admin bulk-replaces the domain
  const bulk = await put({ bulk: { find: 'x7casino.io', replace: 'x7regress.io' } })
  rec('links-put-bulk', { ...status(bulk), changed: bulk.json?.data?.changed, x7casinoLeft: (bulk.json?.data?.links ?? []).filter((l) => l.url.includes('x7casino.io')).length })
  const v2 = bulk.json?.data
  rec('links-put-noop', status(await at('PUT', LINKS, { body: { expectedUpdatedAt: v2?.updatedAt, bulk: { find: 'not-in-any-link', replace: 'x' } } })))

  // Existing template unchanged; a new clone and a duplicate of the old one get the new links (D6/D7)
  const oldAfter = oldId ? await html(oldId, 'de') : ''
  const fresh = await clone('regress-links-new')
  rec('links-clone-new', status(fresh))
  const freshHtml = fresh.json?.data?.id ? await html(fresh.json.data.id, 'de') : ''
  const dup = oldId ? await at('POST', `${SAVED}/${oldId}/duplicate`) : null
  if (dup?.json?.data?.id) tempSaved.push(dup.json.data.id)
  const dupHtml = dup?.json?.data?.id ? await html(dup.json.data.id, 'de') : ''
  rec('links-effect', {
    oldUnchanged: oldBefore !== '' && oldBefore === oldAfter,
    oldKeepsOldDomain: oldAfter.includes('x7casino.io') && !oldAfter.includes('x7regress.io'),
    newGetsNewDomain: freshHtml.includes('x7regress.io') && !freshHtml.includes('x7casino.io'),
    duplicateGetsNewDomain: dupHtml.includes('x7regress.io') && !dupHtml.includes('x7casino.io'),
  })
} finally {
  for (const id of tempSaved) await at('DELETE', `${SAVED}/${id}`)
  rec('links-temp-deleted', { count: tempSaved.length })
}

writeFileSync(outFile, JSON.stringify(results, null, 1))
console.log(`api: cases ${Object.keys(results).length}`)
