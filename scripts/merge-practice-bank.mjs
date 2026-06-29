// Merge curated practice-bank fragments from tmp-bank-inbox/*.json into the
// single keyed bank at content/fixtures/practice-bank.json.
//
// Each fragment is either an array of items or a { "items": [...] } object.
// Items are appended to the existing bank; ids must be globally unique.
// Re-serializes the whole bank deterministically (2-space indent).
//
// Usage: node scripts/merge-practice-bank.mjs

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const bankPath = join(root, 'content/fixtures/practice-bank.json')
const inboxDir = join(root, 'tmp-bank-inbox')

const bank = JSON.parse(readFileSync(bankPath, 'utf8'))
if (!Array.isArray(bank.items)) throw new Error('bank.items is not an array')

const ids = new Set(bank.items.map((i) => i.id))
const files = existsSync(inboxDir)
  ? readdirSync(inboxDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
  : []

let added = 0
for (const file of files) {
  const raw = readFileSync(join(inboxDir, file), 'utf8')
  let frag
  try {
    frag = JSON.parse(raw)
  } catch (err) {
    throw new Error(`invalid JSON in ${file}: ${err.message}`)
  }
  const items = Array.isArray(frag) ? frag : frag.items
  if (!Array.isArray(items)) throw new Error(`${file}: no items array`)
  const base = file.replace(/\.json$/, '')
  for (const item of items) {
    if (!item || typeof item.id !== 'string') {
      throw new Error(`${file}: item missing string id`)
    }
    // Authors number ids per-cluster, so the same id can recur across clusters
    // (e.g. pb-cauchy-01 in both sequences and series). Disambiguate by
    // prefixing the cluster name; bail only if even that collides.
    let id = item.id
    if (ids.has(id)) {
      id = `${base}-${item.id}`
      if (ids.has(id)) throw new Error(`${file}: unresolved duplicate id ${item.id}`)
      console.log(`  renamed ${item.id} -> ${id}`)
      item.id = id
    }
    ids.add(id)
    bank.items.push(item)
    added += 1
  }
  console.log(`+ ${file}: ${items.length} items`)
}

writeFileSync(bankPath, JSON.stringify(bank, null, 2) + '\n')
console.log(`merged ${added} items from ${files.length} files; total ${bank.items.length}`)
