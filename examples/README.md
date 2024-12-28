# Example Petstore API Server

This is a simple example API server that implements a basic pet store. It's useful for testing the OpenAPI MCP Server.

![Example of Claude seeing the getPetById tool](./petstore_conversation_in_claude.png)

## Running the server

```bash
# Install dependencies
pnpm install

# Start the server
node examples/petstore-server.cjs
```

The server will start on http://localhost:3000 with the following endpoints:

### Basic CRUD Operations
- GET /pets - List all pets
- GET /pets/{id} - Get a specific pet
- POST /pets - Create a new pet
- PUT /pets/{id} - Update a pet's status
- DELETE /pets/{id} - Delete a pet

### File Upload Operations
- POST /pets/{id}/photos - Upload a single photo for a pet
  - Accepts JPEG, PNG, or GIF files up to 5MB
  - Returns a URL to access the uploaded photo
  - Example: `curl -F "photo=@/path/to/photo.jpg" http://localhost:3000/pets/1/photos`

- POST /pets/{id}/documents - Upload multiple documents for a pet
  - Upload up to 5 files in a single request
  - Returns URLs for all uploaded files
  - Example: `curl -F "documents=@doc1.jpg" -F "documents=@doc2.jpg" http://localhost:3000/pets/1/documents`

The OpenAPI specification is available at http://localhost:3000/openapi.json

## Testing with Claude

1. Start the server as described above
2. Configure Claude Desktop to use the OpenAPI MCP Server with this spec:
   ```json
   {
     "mcpServers": {
       "petstore-api": {
         "command": "npx",
         "args": ["openapi-mcp-server", "http://localhost:3000/openapi.json"]
       }
     }
   }
   ```
3. Restart Claude Desktop
4. Try asking Claude questions like:
   - "Can you show me all the available pets?"
   - "Can you add a new pet named Rover?"
   - "Please mark Rover as sold"
   - "Upload a photo of Rover from ~/Pictures/rover.jpg"
   - "Upload these documents for Rover: ~/Documents/medical.pdf and ~/Documents/adoption.pdf"

## Testing with CLI Tool

The repository includes a command-line tool for testing the API directly:

```bash
# List all available methods
pnpm tsx examples/cli/openapi-client.ts http://localhost:3000/openapi.json list

# Create a new pet
pnpm tsx examples/cli/openapi-client.ts http://localhost:3000/openapi.json call API-createPet '{"name": "Rover", "species": "Dog", "age": 3}'

# Get a pet by ID
pnpm tsx examples/cli/openapi-client.ts http://localhost:3000/openapi.json call API-getPetById '{"id": 1}'

# Update a pet's status
pnpm tsx examples/cli/openapi-client.ts http://localhost:3000/openapi.json call API-updatePetStatus '{"id": 1, "status": "sold"}'
```

The CLI tool provides a quick way to test endpoints and understand the API structure without writing code or using Claude Desktop.

## File Upload Details

The server stores uploaded files in an `uploads` directory and serves them via HTTP. Some important details:

- File size limit: 5MB per file
- Supported image formats: JPEG, PNG, GIF
- Files are stored with unique names to prevent conflicts
- Files are automatically cleaned up if the pet ID is invalid
- URLs are returned for immediate access to uploaded files

Example response for a photo upload:
```json
{
  "message": "Photo uploaded successfully",
  "photoUrl": "http://localhost:3000/uploads/photo-1234567890.jpg"
}
```

Example response for document uploads:
```json
{
  "message": "Documents uploaded successfully",
  "files": [
    {
      "originalName": "medical.pdf",
      "url": "http://localhost:3000/uploads/documents-1234567890.pdf"
    },
    {
      "originalName": "adoption.pdf",
      "url": "http://localhost:3000/uploads/documents-0987654321.pdf"
    }
  ]
}
```
