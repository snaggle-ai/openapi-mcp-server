import { OpenAPIV3 } from 'openapi-types'

type MCPParameter = {
  name: string
  type: string
  description: string
  optional?: boolean
}

type MCPMethod = {
  name: string
  description: string
  params: MCPParameter[]
  returns: {
    type: string
    description: string
  } | null
}

export class OpenAPIToMCPConverter {
  constructor(private openApiSpec: OpenAPIV3.Document) {}

  /**
   * Convert OpenAPI paths to MCP tool definitions
   */
  convertToMCPTools(): { tools: Record<string, { methods: MCPMethod[] }>, openApiLookup: Record<string, OpenAPIV3.OperationObject & { method: string, path: string }> } {

    // TODO: Make this configurable for multiple APIs
    const apiName = 'API';

    const openApiLookup: Record<string, OpenAPIV3.OperationObject & { method: string, path: string }> = {}
    const tools: Record<string, { methods: MCPMethod[] }> = {
      [apiName]: { methods: [] }
    }

    // Iterate through all paths
    for (const [path, pathItem] of Object.entries(this.openApiSpec.paths || {})) {
      if (!pathItem) continue

      // Process each HTTP method in the path
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!this.isOperation(method, operation)) continue

        const mcpMethod = this.convertOperationToMCPMethod(operation, method, path)
        if (mcpMethod) {
          tools[apiName].methods.push(mcpMethod)
          // Kinda sketchy we rely / build this hyphen separated name in multiple places
          openApiLookup[apiName + '-' + mcpMethod.name] = { ...operation, method, path }
        }
      }
    }

    return { tools, openApiLookup }
  }

  private isOperation(
    method: string,
    operation: any
  ): operation is OpenAPIV3.OperationObject {
    return ['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())
  }

  private convertOperationToMCPMethod(
    operation: OpenAPIV3.OperationObject,
    method: string,
    path: string
  ): MCPMethod | null {
    if (!operation.operationId) {
      console.warn(`Operation without operationId at ${method} ${path}`)
      return null
    }

    const params: MCPParameter[] = []

    // Add path parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (!this.isParameterObject(param)) continue

        params.push({
          name: param.name,
          type: this.convertSchemaTypeToTS(param.schema),
          description: param.description || '',
          optional: !param.required
        })
      }
    }

    // Add request body if present
    if (operation.requestBody && this.isRequestBodyObject(operation.requestBody)) {
      const content = operation.requestBody.content['application/json']
      if (content?.schema) {
        const bodyParams = this.extractBodyParameters(content.schema)
        params.push(...bodyParams)
      }
    }

    // Determine return type from responses
    const returns = this.extractResponseType(operation.responses)

    return {
      name: operation.operationId,
      description: operation.summary || operation.description || '',
      params,
      returns
    }
  }

  private isParameterObject(
    param: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject
  ): param is OpenAPIV3.ParameterObject {
    return !('$ref' in param)
  }

  private isRequestBodyObject(
    body: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject
  ): body is OpenAPIV3.RequestBodyObject {
    return !('$ref' in body)
  }

  private convertSchemaTypeToTS(
    schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  ): string {
    if (!schema || '$ref' in schema) return 'any'

    switch (schema.type) {
      case 'integer':
      case 'number':
        return 'number'
      case 'string':
        return 'string'
      case 'boolean':
        return 'boolean'
      case 'array':
        return 'array'
      case 'object':
        return 'object'
      default:
        return 'any'
    }
  }

  private extractBodyParameters(
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  ): MCPParameter[] {
    if ('$ref' in schema) return []

    const params: MCPParameter[] = []
    if (schema.type === 'object' && schema.properties) {
      for (const [name, prop] of Object.entries(schema.properties)) {
        if ('$ref' in prop) continue

        const schemaProperty = prop as OpenAPIV3.SchemaObject
        params.push({
          name,
          type: this.convertSchemaTypeToTS(schemaProperty),
          description: schemaProperty.description || '',
          optional: !schema.required?.includes(name)
        })
      }
    }
    return params
  }

  private extractResponseType(
    responses: OpenAPIV3.ResponsesObject
  ): { type: string; description: string } | null {
    // Look for 200 or 201 response
    const successResponse = responses['200'] || responses['201']
    if (!successResponse || '$ref' in successResponse) return null

    const content = successResponse.content
    if (!content) return null

    // Handle different response content types
    if (content['application/json']) {
      const schema = content['application/json'].schema
      return {
        type: schema ? this.convertSchemaTypeToTS(schema) : 'any',
        description: successResponse.description || ''
      }
    } else if (content['image/png'] || content['image/jpeg']) {
      return {
        type: 'binary',
        description: successResponse.description || ''
      }
    }

    return {
      type: 'any',
      description: successResponse.description || ''
    }
  }
} 