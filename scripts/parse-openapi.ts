#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs'
import { OpenAPIV3 } from 'openapi-types'
import { OpenAPIToMCPConverter } from '../src/openapi/parser'

function main() {
  const args = process.argv.slice(2)
  if (args.length !== 2) {
    console.error('Usage: pnpm parse-openapi <input-spec.json> <output-tools.json>')
    process.exit(1)
  }

  const [inputFile, outputFile] = args

  try {
    // Read and parse the OpenAPI spec
    const specContent = readFileSync(inputFile, 'utf-8')
    const spec = JSON.parse(specContent) as OpenAPIV3.Document

    // Convert to MCP Tools
    const converter = new OpenAPIToMCPConverter(spec)
    const { tools, openApiLookup } = converter.convertToMCPTools()

    // Write the output
    writeFileSync(outputFile, JSON.stringify({ tools, openApiLookup }, null, 2))
    console.log(`Successfully wrote parsed tools to ${outputFile}`)

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main() 