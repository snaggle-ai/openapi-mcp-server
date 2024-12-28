#!/usr/bin/env node

import { OpenAPIToMCPConverter, HttpClient } from '../../src'
import { OpenAPIV3 } from 'openapi-types'
import fs from 'fs/promises'
import axios from 'axios'

async function loadSpec(specPath: string): Promise<OpenAPIV3.Document> {
  let content: string
  if (specPath.startsWith('http://') || specPath.startsWith('https://')) {
    const response = await axios.get(specPath)
    content = JSON.stringify(response.data)
  } else {
    content = await fs.readFile(specPath, 'utf-8')
  }
  return JSON.parse(content)
}

async function main() {
  const [,, specPath, command, ...args] = process.argv

  if (!specPath || !command) {
    console.log('Usage: openapi-client <spec-path> <command> [args]')
    console.log('\nCommands:')
    console.log('  list                     List all available methods')
    console.log('  call <method> [params]   Call a method with optional JSON params')
    process.exit(1)
  }

  const spec = await loadSpec(specPath)
  const converter = new OpenAPIToMCPConverter(spec)
  const baseUrl = spec.servers?.[0]?.url
  if (!baseUrl) {
    throw new Error('No base URL found in OpenAPI spec')
  }

  const httpClient = new HttpClient({ baseUrl }, spec)

  if (command === 'list') {
    // List all available methods
    const { tools } = converter.convertToMCPTools()
    console.log('\nAvailable methods:')
    Object.entries(tools).forEach(([name, def]) => {
      def.methods.forEach(method => {
        console.log(`\n${name}-${method.name}:`)
        console.log(`  Description: ${method.description}`)
        console.log('  Parameters:')
        const params = method.inputSchema.properties || {}
        Object.entries(params).forEach(([paramName, schema]) => {
          const required = method.inputSchema.required?.includes(paramName) ? ' (required)' : ''
          console.log(`    - ${paramName}${required}: ${(schema as any).type}`)
        })
      })
    })
  } else if (command === 'call') {
    const [methodName, ...paramArgs] = args
    if (!methodName) {
      console.error('Error: Method name required')
      process.exit(1)
    }

    // Parse parameters if provided
    const params = paramArgs.length ? JSON.parse(paramArgs[0]) : {}

    // Get operation details
    const { openApiLookup } = converter.convertToMCPTools()
    const operation = openApiLookup[methodName]
    if (!operation) {
      console.error(`Error: Method ${methodName} not found`)
      process.exit(1)
    }

    try {
      // Execute the operation
      const response = await httpClient.executeOperation(operation, params)
      console.log('Response:', JSON.stringify(response.data, null, 2))
    } catch (error: any) {
      console.error('Error:', error.response?.data || error.message)
      process.exit(1)
    }
  } else {
    console.error(`Error: Unknown command ${command}`)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Error:', error.message)
  process.exit(1)
}) 