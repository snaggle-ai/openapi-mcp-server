#!/usr/bin/env node

import { build } from 'esbuild'
import { fileURLToPath } from 'url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  try {
    await build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: 'dist/index.js',
      sourcemap: true,
      external: [
        '@modelcontextprotocol/sdk',
        'openapi-types'
      ]
    })
    console.log('Build completed successfully')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

main() 