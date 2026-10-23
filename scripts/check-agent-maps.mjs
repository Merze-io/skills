#!/usr/bin/env node
/**
 * Fail when docs/agent maps or AGENTS.md cite a repo-relative path that does not exist.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const MAP_FILES = [
  'AGENTS.md',
  'docs/agent/system-map.md',
  'docs/agent/repo-map.md',
]

/** Backtick spans that look like repo-relative file or dir paths. */
const PATH_RE =
  /`((?:site|docs|\.cursor|\.github|us-llc-state-cost)\/[A-Za-z0-9._@/-]+(?:\.[A-Za-z0-9]+)?(?:\/[A-Za-z0-9._@/-]+)*)`/g

function collectCitedPaths(text) {
  const found = new Set()
  for (const match of text.matchAll(PATH_RE)) {
    let p = match[1]
    p = p.replace(/[),.;:]+$/, '')
    if (p.includes('*') || p.includes('<')) continue
    found.add(p)
  }
  return found
}

function existsAsFileOrDir(rel) {
  return fs.existsSync(path.join(root, rel))
}

let failed = false
const missing = []

for (const rel of MAP_FILES) {
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) {
    console.error(`missing map file: ${rel}`)
    failed = true
    continue
  }
  const text = fs.readFileSync(abs, 'utf8')
  for (const cited of collectCitedPaths(text)) {
    if (!existsAsFileOrDir(cited)) {
      missing.push({ map: rel, path: cited })
      failed = true
    }
  }
}

if (missing.length) {
  console.error('check-agent-maps: cited paths not found on disk:')
  for (const m of missing) {
    console.error(`  ${m.map} → ${m.path}`)
  }
}

if (failed) {
  process.exit(1)
}

console.log('check-agent-maps: ok')
