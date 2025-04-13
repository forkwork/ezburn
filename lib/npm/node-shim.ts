#!/usr/bin/env node

import { generateBinPath } from "./node-platform"

try {
  const { binPath, isWASM } = generateBinPath()
  if (isWASM) {
    require('child_process').execFileSync('node', [binPath].concat(process.argv.slice(2)), { stdio: 'inherit' })
  } else {
    require('child_process').execFileSync(binPath, process.argv.slice(2), { stdio: 'inherit' })
  }
} catch (e) {
  console.warn(`[ezburn] Could not execute binary. Using fallback.`)
  process.exit(0)
}
