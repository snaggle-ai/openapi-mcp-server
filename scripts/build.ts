#!/usr/bin/env node

import { build } from 'esbuild'

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