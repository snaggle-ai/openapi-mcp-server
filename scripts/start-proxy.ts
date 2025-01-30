import fs from 'node:fs'
import path from 'node:path'
import { OpenAPIV3 } from 'openapi-types'
import { MCPProxy } from '../src/mcp/proxy'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import OpenAPISchemaValidator from 'openapi-schema-validator'
import axios from 'axios'
import yaml from 'js-yaml'

export class ValidationError extends Error {
  constructor(public errors: any[]) {
    super('OpenAPI validation failed')
    this.name = 'ValidationError'
  }
}

function isYamlFile(filePath: string): boolean {
  return filePath.endsWith('.yaml') || filePath.endsWith('.yml')
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
    const parsed = isYamlFile(specPath) ? yaml.load(rawSpec) : JSON.parse(rawSpec)
    return parsed as OpenAPIV3.Document
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
  const useSSE = args.includes('--sse')
  if (!specPath) {
    throw new Error('Usage: openapi-mcp-server <path-to-openapi-spec> [--sse]')
  }

  const openApiSpec = await loadOpenApiSpec(specPath)
  const proxy = new MCPProxy('OpenAPI Tools', openApiSpec)
  
  if (useSSE) {
    const express = require('express')
    const app = express()
    const PORT = process.env.PORT || 3001

    app.get('/sse', async (req, res) => {
      console.log('Received connection')
      const transport = new SSEServerTransport('/message', res)
      await proxy.connect(transport)

      proxy.server.onclose = async () => {
        await proxy.server.cleanup()
        await proxy.server.close()
        process.exit(0)
      }
    })

    app.post('/message', async (req, res) => {
      console.log('Received message')
      await transport.handlePostMessage(req, res)
    })

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  } else {
    console.error('Connecting to Claude Desktop...')
    await proxy.server.connect(new StdioServerTransport())
  }
}

const shouldStart = process.argv[1].endsWith('openapi-mcp-server')
// Only run main if this is the entry point
if (shouldStart) {
  console.error('Starting proxy...')
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
