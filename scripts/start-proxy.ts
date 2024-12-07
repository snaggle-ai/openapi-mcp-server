import fs from 'node:fs'
import path from 'node:path'
import { OpenAPIV3 } from 'openapi-types'
import { MCPProxy } from '../src/mcp/proxy'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import OpenAPISchemaValidator from 'openapi-schema-validator'

// Load OpenAPI spec
const openApiPath = process.argv[2]
if (!openApiPath) {
  console.error(`Usage: openapi-mcp-server <path-to-openapi-spec>`)
  process.exit(1)
}

// Validate and parse OpenAPI spec
const rawSpec = fs.readFileSync(path.resolve(process.cwd(), openApiPath), 'utf-8')
let openApiSpec: OpenAPIV3.Document
try {
  const parsed = JSON.parse(rawSpec)
  
  // Validate against OpenAPI 3.0 schema
  //@ts-expect-error
  const validator = new (OpenAPISchemaValidator.default ?? OpenAPISchemaValidator)({ version: 3.1 })
  const validation = validator.validate(parsed)
  
  if (validation.errors.length > 0) {
    console.error('Invalid OpenAPI 3.0 specification:')
    validation.errors.forEach((error: any) => {
      console.error(error)
    })
    
  }
  
  openApiSpec = parsed
} catch (error) {
  console.error('Failed to parse OpenAPI specification:', (error as any).message)
  process.exit(1)
}

// Create and start MCP proxy
const proxy = new MCPProxy('OpenAPI Tools', openApiSpec)
console.error('connecting')
proxy.connect(new StdioServerTransport())
