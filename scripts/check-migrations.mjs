/**
 * Fails when the Drizzle schema has changes that no migration covers.
 *
 * Runs `drizzle-kit generate`; if it writes anything into ./drizzle, schema
 * and migrations were out of sync. The generated migration is left in place
 * so you can review and commit it.
 *
 * Usage: pnpm db:check   (also runs in CI)
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const MIGRATIONS_DIR = 'drizzle'

function snapshot() {
  const files = readdirSync(MIGRATIONS_DIR, { recursive: true })
    .map((file) => path.join(MIGRATIONS_DIR, file))
    .filter((file) => statSync(file).isFile())
  return new Map(files.map((file) => [file, readFileSync(file, 'utf8')]))
}

const before = snapshot()

const result = spawnSync('pnpm', ['exec', 'drizzle-kit', 'generate'], {
  // No stdin: if drizzle-kit needs an answer (e.g. rename vs. drop) it fails
  // instead of hanging CI.
  stdio: ['ignore', 'inherit', 'inherit'],
  timeout: 120_000,
})
if (result.status !== 0) {
  console.error(
    '\n✗ drizzle-kit generate failed. If it needs an interactive answer, run `pnpm db:generate` locally.',
  )
  process.exit(1)
}

const after = snapshot()
const changed = [...after.keys()].filter((f) => before.get(f) !== after.get(f))

if (changed.length > 0) {
  console.error(
    `\n✗ Schema has changes without a migration. Generated:\n${changed
      .map((f) => `  ${f}`)
      .join('\n')}\nReview and commit them.`,
  )
  process.exit(1)
}

console.info('\n✓ Schema and migrations are in sync.')
