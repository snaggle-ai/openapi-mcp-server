# Conversion Plan: JSDoc to OpenAPI-based Tool Calling

## Overview
Currently, the system uses JSDoc comments to generate a tool schema that follows the Model Context Protocol (MCP). The goal is to swit1ch to using an OpenAPI v3 specification as the source of truth for tool definitions and implement tool calling using standard HTTP fetch calls.

## High-Level Architecture Changes

2. **OpenAPI Integration** [IN PROGRESS]
   - ✅ Create an OpenAPI parser to convert OpenAPI paths to MCP tool definitions
   - ✅ Map OpenAPI operations to tool methods
   - ✅ Implement parameter validation based on OpenAPI schemas
   - Add support for OpenAPI references ($ref)
   - Add support for query parameters
   - Add support for complex response types

3. **HTTP Client Implementation** [IN PROGRESS]
   - ✅ Create a generic HTTP client for making API calls
   - ✅ Implement response handling based on OpenAPI response schemas
   - ✅ Add content-type handling based on OpenAPI media types
   - Add error handling and retries
   - Add request/response interceptors

## Detailed Tasks

### 1. OpenAPI Parser Implementation [IN PROGRESS]
```typescript
// Created: src/openapi/parser.ts
✅ Create OpenAPIToMCPConverter class
✅ Implement path-to-tool mapping
✅ Handle parameter conversion (path, query, body)
- Process OpenAPI security schemes
✅ Generate MCP-compatible tool schemas
```

### 2. HTTP Client Layer [IN PROGRESS]
```typescript
// Created: src/client/http-client.ts
✅ Implement fetch-based HTTP client
✅ Add request builders for different HTTP methods
✅ Handle response parsing based on content types
✅ Add parameter validation
- Add error handling and retries
- Add request/response interceptors
```

### 3. MCP Integration
```typescript
// Modify: scripts/local-proxy.ts
- Replace JSDoc-based tool listing with OpenAPI-based listing
- Update tool calling to use HTTP client
- Maintain MCP protocol compatibility
```

### 4. Configuration Updates
```typescript
// Create new file: src/config/openapi-config.ts
- Add OpenAPI specification loading
- Implement server URL configuration
- Add optional security configuration
```

## Implementation Steps

1. **Phase 1: OpenAPI Integration** [IN PROGRESS]
   - [x] Create OpenAPI parser
   - [x] Implement OpenAPI to MCP schema conversion
   - [x] Add OpenAPI specification validation
   - [x] Create tests for OpenAPI parsing
   - [ ] Add support for OpenAPI references
   - [ ] Add support for complex schemas

2. **Phase 2: HTTP Client** [IN PROGRESS]
   - [x] Implement base HTTP client
   - [x] Add request/response handling
   - [x] Implement content-type handlers
   - [x] Create tests for HTTP client
   - [ ] Add error handling and retries
   - [ ] Add request/response interceptors

3. **Phase 3: MCP Protocol Updates**
   - [ ] Update tool listing endpoint
   - [ ] Modify tool calling implementation
   - [ ] Update response formatting
   - [ ] Add tests for MCP compatibility

4. **Phase 4: Clean Up**
   - [ ] Remove JSDoc-based code
   - [ ] Update documentation
   - [ ] Add migration guide
   - [ ] Update example code

## Next Steps
1. Add error handling and retries to HTTP client
2. Implement request/response interceptors
3. Update MCP integration to use new OpenAPI-based tools
4. Create configuration module for OpenAPI spec loading

## Benefits
1. Standardized API definition using widely-adopted OpenAPI spec
2. Better tooling support (Swagger UI, code generators)
3. Built-in parameter validation
4. Clear separation between API definition and implementation
5. Easier integration with other services
6. Better documentation through OpenAPI UI tools

## Considerations
1. Maintain backward compatibility during transition
2. Handle OpenAPI features not present in current JSDoc implementation
3. Consider performance implications of HTTP vs direct function calls
4. Security implications of exposing HTTP endpoints
5. Rate limiting and caching strategies