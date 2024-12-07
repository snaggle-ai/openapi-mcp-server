import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  JSONRPCResponse,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { JSONSchema7 as IJsonSchema } from 'json-schema'
import { OpenAPIToMCPConverter } from '../openapi/parser'
import { HttpClient } from '../client/http-client'
import { OpenAPIV3 } from 'openapi-types'
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

type PathItemObject = OpenAPIV3.PathItemObject & {
  get?: OpenAPIV3.OperationObject
  put?: OpenAPIV3.OperationObject
  post?: OpenAPIV3.OperationObject
  delete?: OpenAPIV3.OperationObject
  patch?: OpenAPIV3.OperationObject
}

type NewToolDefinition = { 
  methods: Array<{
    name: string;
    description: string;
    inputSchema: IJsonSchema & { type: 'object' };
    returnSchema?: IJsonSchema;
  }>
};

export class MCPProxy {
  private server: Server
  private httpClient: HttpClient
  private openApiSpec: OpenAPIV3.Document
  private tools: Record<string, NewToolDefinition>
  private openApiLookup: Record<string, OpenAPIV3.OperationObject & { method: string, path: string }>

  constructor(
    name: string,
    openApiSpec: OpenAPIV3.Document,
  ) {
    this.server = new Server(
      { name, version: '1.0.0' },
      { capabilities: { tools: {} } }
    )
    const baseUrl = openApiSpec.servers?.[0].url;
    if (!baseUrl) {
      throw new Error('No base URL found in OpenAPI spec');
    }
    this.httpClient = new HttpClient({ baseUrl }, openApiSpec)
    this.openApiSpec = openApiSpec
    
    // Convert OpenAPI spec to MCP tools
    const converter = new OpenAPIToMCPConverter(openApiSpec)
    const { tools, openApiLookup } = converter.convertToMCPTools();
    this.tools = tools;
    this.openApiLookup = openApiLookup;

    this.setupHandlers()
  }

  private setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [];

      // Add methods as separate tools to match the MCP format
      Object.entries(this.tools).forEach(([toolName, def]) => {
        def.methods.forEach(method => {
          tools.push({
            name: `${toolName}-${method.name}`,
            description: method.description,
            inputSchema: method.inputSchema as Tool['inputSchema']
          });
        });
      });

      return { tools };
    });

    // Handle tool calling
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      console.error('calling tool', request.params)
      const { name, arguments: params } = request.params

      // Find the operation in OpenAPI spec
      const operation = this.findOperation(name)
      console.error('operations', this.openApiLookup)
      if (!operation) {
        throw new Error(`Method ${name} not found`)
      }

      // Execute the operation
      const method = operation.method
      const path = operation.path
      const response = await this.httpClient.executeOperation(
        operation,
        method,
        path,
        params
      )

      // Convert response to MCP format
      return {
        content: [
          {
            type: this.getContentType(response.headers),
            [this.getContentType(response.headers) === 'text' ? 'text' : 'data']:
              typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
          }
        ]
      }
    })
  }

  private findOperation(operationId: string): OpenAPIV3.OperationObject & { method: string, path: string } | null {
    return this.openApiLookup[operationId] ?? null
  }

  private getContentType(headers: Headers): 'text' | 'image' | 'binary' {
    const contentType = headers.get('content-type')
    if (!contentType) return 'binary'

    if (contentType.includes('text') || contentType.includes('json')) {
      return 'text'
    } else if (contentType.includes('image')) {
      return 'image'
    }
    return 'binary'
  }

  async connect(transport: Transport) {
    // The SDK will handle stdio communication
    await this.server.connect(transport)
  }
} 