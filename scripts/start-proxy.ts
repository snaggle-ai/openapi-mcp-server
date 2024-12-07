import fs from 'node:fs'
import path from 'node:path'
import { OpenAPIV3 } from 'openapi-types'
import { MCPProxy } from '../src/mcp/proxy'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import OpenAPISchemaValidator from 'openapi-schema-validator'
import axios from 'axios'

export class ValidationError extends Error {
  constructor(public errors: any[]) {
    super('OpenAPI validation failed')
    this.name = 'ValidationError'
  }
}

export async function loadOpenApiSpec(specPath: string): Promise<OpenAPIV3.Document> {
  let rawSpec: string

  // Check if the path is a URL
  if (specPath.startsWith('http://') || specPath.startsWith('https://')) {
    try {
      const response = await axios.get(specPath)
      if (typeof response.data === 'string') {
        rawSpec = response.data
      } else {
        rawSpec = JSON.stringify(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch OpenAPI specification from URL:', (error as Error).message)
      process.exit(1)
    }
  } else {
    // Load from local file system
    try {
      rawSpec = fs.readFileSync(path.resolve(process.cwd(), specPath), 'utf-8')
    } catch (error) {
      console.error('Failed to read OpenAPI specification file:', (error as Error).message)
      process.exit(1)
    }
  }

  // Parse and validate the spec
  try {
    const parsed = JSON.parse(rawSpec)
    return parsed
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    console.error('Failed to parse OpenAPI specification:', (error as Error).message)
    process.exit(1)
  }
}

// Main execution
export async function main(args: string[] = process.argv.slice(2)) {
  const specPath = args[0]
  if (!specPath) {
    throw new Error('Usage: openapi-mcp-server <path-to-openapi-spec>')
  }

  const openApiSpec = await loadOpenApiSpec(specPath)
  const proxy = new MCPProxy('OpenAPI Tools', openApiSpec)
  
  console.error('Connecting to Claude Desktop...')
  return proxy.connect(new StdioServerTransport())
}

// Only run main if this is the entry point
if (require.main === module) {
  main().catch(error => {
    if (error instanceof ValidationError) {
      console.error('Invalid OpenAPI 3.1 specification:')
      error.errors.forEach(err => console.error(err))
    } else {
      console.error('Error:', error.message)
    }
    process.exit(1)
  })
}
