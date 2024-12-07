# OpenAPI-based Tool Calling

## Overview
Building an MCP server that uses an OpenAPI v3 specification as the source of truth for tool definitions and implements tool calling using standard HTTP fetch calls.

## High-Level Architecture 

1. **MCP Server** [IN PROGRESS]
   - ✅ Create a basic MCP server that supports tool calling
   - Notifications when available tools change
   - Ability to dynamically add new tools at runtime (i.e. a tool to add new / refresh existing OpenAPI specs)

2. **OpenAPI Integration** [IN PROGRESS]
   - ✅ Create an OpenAPI parser to convert OpenAPI paths to MCP tool definitions
   - ✅ Map OpenAPI operations to tool methods
   - ✅ Implement parameter validation based on OpenAPI schemas
   - ✅ Support for OpenAPI references ($ref)
   - ✅ Add support for query parameters
   - ✅ Add support for complex response types
   - ✅ Create unit tests for OpenAPI parsing
   - Create integration tests
   - Support for OpenAPI security schemes
   - Support for multiple open api specs

3. **HTTP Client Implementation** [IN PROGRESS]
   - ✅ Create a generic HTTP client for making API calls
   - ✅ Implement response handling based on OpenAPI response schemas
   - ✅ Add content-type handling based on OpenAPI media types
   - ✅ Integration tests for HTTP client
   - Configurable error handling and retries
   - Proxy support
