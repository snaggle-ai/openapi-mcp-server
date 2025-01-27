# OpenAPI MCP Server

[![smithery badge](https://smithery.ai/badge/openapi-mcp-server)](https://smithery.ai/server/openapi-mcp-server)
[![coverage](https://img.shields.io/badge/coverage-83%25-yellowgreen.svg)](https://github.com/snaggle-ai/openapi-mcp-server)

> **Talk to any OpenAPI (v3.1) compliant API through Claude Desktop!**

This tool creates a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that acts as a proxy for any API that has an OpenAPI v3.1 specification. This allows you to use Claude Desktop to easily interact with both local and remote server APIs.

If you're having trouble with Claude crashing or specs not working put them through our [spec cleaner app](https://open-api-spec-cleaner.replit.app/) this tidies up some open api schemas to help them be LLM-readable.

## What does it do?

This proxy automatically converts OpenAPI endpoints into Claude tools, allowing Claude to:

1. Discover available API endpoints and understand their purpose
2. Know what parameters are required and their types
3. Make API calls on your behalf
4. Handle the responses appropriately

For example, if you have a Petstore API with this endpoint:

```yaml
/pets/{petId}:
  get:
    operationId: getPetById
    summary: Returns a pet by ID
    parameters:
      - name: petId
        in: path
        description: ID of pet to return
        required: true
        schema:
          type: integer
```

Claude will see this as a tool it can use:

![Example of Claude seeing the getPetById tool](./examples/petstore_tools_in_claude.png)

You can then ask Claude natural questions like:
- "Can you fetch the details for pet ID 123?"
- "What's the status of my pet with ID 456?"

Claude will understand the context and make the appropriate API calls.

## File Upload Support

The proxy supports file uploads for APIs that accept multipart/form-data. When an endpoint accepts file uploads (indicated by `type: string, format: binary` in the OpenAPI spec), you can provide local file paths and the proxy will handle reading and uploading the files.

### Example Use Cases

1. **Profile Picture Upload**
```yaml
/users/{userId}/avatar:
  post:
    summary: Upload a user's profile picture
    requestBody:
      content:
        multipart/form-data:
          schema:
            type: object
            properties:
              avatar:
                type: string
                format: binary
                description: Profile picture (JPEG/PNG)
              cropInfo:
                type: object
                properties:
                  x: { type: number }
                  y: { type: number }
                  width: { type: number }
                  height: { type: number }
```

You can ask Claude:
- "Upload my new profile picture from ~/Pictures/profile.jpg"
- "Update my avatar with ~/Downloads/photo.png and crop it to 200x200"

2. **Document Processing**
```yaml
/documents:
  post:
    summary: Upload documents for processing
    requestBody:
      content:
        multipart/form-data:
          schema:
            type: object
            properties:
              document:
                type: string
                format: binary
                description: PDF or Word document
              language:
                type: string
                enum: [en, es, fr]
                description: Document language
              processOCR:
                type: boolean
                description: Whether to extract text using OCR
```

Natural language commands:
- "Process the document at ~/Documents/contract.pdf in English with OCR enabled"
- "Upload ~/Downloads/report.docx and set the language to French"

3. **Batch File Upload**
```yaml
/batch-upload:
  post:
    summary: Upload multiple files in one request
    requestBody:
      content:
        multipart/form-data:
          schema:
            type: object
            properties:
              files:
                type: array
                items:
                  type: string
                  format: binary
              tags:
                type: array
                items:
                  type: string
```

You can say:
- "Upload these three files: ~/data1.csv, ~/data2.csv, and ~/data3.csv with tags 'monthly-report'"
- "Process the files in ~/exports/ with tags 'raw-data', 'june-2023'"

### Important Considerations

1. **Security**
   - File paths are resolved relative to the current working directory
   - Access is restricted to files the user has permission to read
   - Sensitive files (like ~/.ssh/id_rsa) require explicit user confirmation
   - File contents are only read when making the actual API request

2. **Performance**
   - Large files are streamed directly from disk to the API
   - Memory usage is optimized for large files
   - Progress reporting is available for large uploads

3. **Limitations**
   - Maximum file size is determined by the target API
   - Only local files are supported (no remote URLs)
   - Some file types may be restricted by the API

## Getting Started

1. **Configure Claude Desktop:**
   Add this to your `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "petstore-api": {
         "command": "npx",
         "args": ["openapi-mcp-server", "/abs/path/to/petstore-openapi.json"]
       }
     }
   }
   ```

2. **Restart Claude Desktop** and start interacting with your API!

## Examples

This repository includes a complete example of a Petstore API server that you can use to test the OpenAPI MCP Server. The example server implements a basic CRUD API for managing pets, making it perfect for learning how to use this tool.

See [examples/README.md](examples/README.md) for instructions on running the example server.

### CLI Tool
The repository includes a command-line tool for testing OpenAPI endpoints:

```bash
# List all available methods
pnpm tsx examples/cli/openapi-client.ts http://localhost:3000/openapi.json list

# Call a specific method
pnpm tsx examples/cli/openapi-client.ts http://localhost:3000/openapi.json call API-getPetById '{"id": 1}'
```

The CLI tool demonstrates how to use both the `OpenAPIToMCPConverter` and `HttpClient` classes to interact with OpenAPI-compliant servers programmatically.

## Use Cases

1. **Local Development**
   - Test your APIs through natural conversation
   - Debug endpoints without writing code
   - Explore API capabilities interactively

2. **API Integration**
   - Quickly test third-party APIs
   - Prototype integrations before writing code
   - Learn new APIs through conversation

3. **Documentation**
   - Ask questions about API endpoints
   - Get examples of how to use endpoints
   - Understand error conditions

## Limitations

- Currently supports OpenAPI v3.1 specs only
- Response handling is optimized for JSON/text responses
- File uploads support local files only (no remote URLs)
- Streaming responses not yet implemented

## Development

Outstanding tasks are listed in [TODO.md](TODO.md).

Basics:
```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the project
pnpm build

# Link the project to your global node_modules so that npx works
npm link

# Now start claude desktop to use

# After making changes run build again before restarting claude desktop
pnpm build

# Now restart claude desktop to run with latest changes
```

## Using OpenAPIToMCPConverter Programmatically

If you want to convert OpenAPI specs to MCP tools programmatically, you can use the `OpenAPIToMCPConverter` class:

```typescript
import { OpenAPIToMCPConverter } from 'openapi-mcp-server'

// Initialize the converter with your OpenAPI spec
const converter = new OpenAPIToMCPConverter(openApiSpec)

// Convert to OpenAI tools format
const openAiTools = await converter.convertToOpenAITools()

// Convert to Anthropic tools format
const anthropicTools = await converter.convertToAnthropicTools()

// Convert to MCP tools format
const { tools, openApiLookup } = converter.convertToMCPTools()
```

The converter supports multiple tool formats, making it easy to integrate with different LLM providers. The converted tools maintain all the type information and descriptions from your OpenAPI spec, ensuring accurate parameter validation and helpful documentation.

## Making API Calls Programmatically

You can use the `HttpClient` class to make API calls directly without going through an LLM:

```typescript
import { HttpClient, OpenAPIToMCPConverter } from 'openapi-mcp-server'

// Initialize the converter and client
const converter = new OpenAPIToMCPConverter(openApiSpec)
const httpClient = new HttpClient({ baseUrl: 'https://api.example.com' }, openApiSpec)

// Get operation details from the converter
const { openApiLookup } = converter.convertToMCPTools()
const operation = openApiLookup['API-getPetById']

// Make the API call
const response = await httpClient.executeOperation(operation, {
  petId: 123
})
```

The `HttpClient` handles:
- Parameter validation
- URL path parameter substitution
- Query string formatting
- Request body formatting
- File uploads (multipart/form-data)
- Error handling


## :hammer: Tools

Developed with

### [cursor-tools](https://github.com/eastlondoner/cursor-tools)
Cursor-tools are tools that power up AI code generation. Cursor-tools works with any AI agent that can execute commands including Cursor Agent, Cline & Aider.

:link: [Build with AI: Smarter, faster, and better with **cursor-tools**](https://github.com/eastlondoner/cursor-tools)


## Sponsors

### [Vinta.app](https://vinta.app)  
**Optimise your Vinted accounting** with real-time analytics, inventory management, and tax compliance tools.  

:link: [Start scaling your Vinted business today](https://vinta.app)  

---

### [Resoled.it](https://resoled.it)  
**Automate your Vinted reselling business** with advanced tools like autobuy, custom snipers, and one-click relisting.  

:link: [Take Vinted reselling to the next level](https://resoled.it)  


## License

MIT

---

Built with ❤️ for making APIs more accessible through natural language.
