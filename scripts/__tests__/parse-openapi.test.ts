import { describe, it, expect } from 'vitest'
import { OpenAPIToMCPConverter } from '../../src/openapi/parser'
import { OpenAPIV3 } from 'openapi-types'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import type { Tool } from '@anthropic-ai/sdk/resources/messages/messages'

describe('OpenAPI Tool Conversion', () => {
  const sampleSpec: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths: {
      '/pets/{petId}': {
        get: {
          operationId: 'getPet',
          summary: 'Get a pet by ID',
          parameters: [
            {
              name: 'petId',
              in: 'path',
              required: true,
              description: 'The ID of the pet',
              schema: {
                type: 'integer'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Pet found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  describe('convertToOpenAITools', () => {
    it('converts OpenAPI spec to OpenAI tools format', () => {
      const converter = new OpenAPIToMCPConverter(sampleSpec)
      const tools = converter.convertToOpenAITools()

      expect(tools).toHaveLength(1)
      const tool = tools[0]

      expect(tool.type).toBe('function')
      expect(tool.function.name).toBe('getPet')
      expect(tool.function.description).toBe('Get a pet by ID')
      expect(tool.function.parameters).toEqual({
        "$defs": {},
        type: 'object',
        properties: {
          petId: {
            type: 'integer',
            description: 'The ID of the pet'
          }
        },
        required: ['petId']
      })
    })
  })

  describe('convertToAnthropicTools', () => {
    it('converts OpenAPI spec to Anthropic tools format', () => {
      const converter = new OpenAPIToMCPConverter(sampleSpec)
      const tools = converter.convertToAnthropicTools()

      expect(tools).toHaveLength(1)
      const tool = tools[0]

      expect(tool.name).toBe('getPet')
      expect(tool.description).toBe('Get a pet by ID')
      expect(tool.input_schema).toEqual({
        "$defs": {},
        type: 'object',
        properties: {
          petId: {
            type: 'integer',
            description: 'The ID of the pet'
          }
        },
        required: ['petId']
      })
    })
  })

  describe('Complex API Conversion', () => {
    const complexSpec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Complex API', version: '1.0.0' },
      paths: {
        '/pets': {
          post: {
            operationId: 'createPet',
            summary: 'Create a pet',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name', 'type'],
                    properties: {
                      name: { type: 'string', description: 'The name of the pet' },
                      type: { type: 'string', description: 'The type of pet', enum: ['dog', 'cat', 'bird'] },
                      age: { type: 'integer', description: 'The age of the pet in years' }
                    }
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Pet created successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        type: { type: 'string' },
                        age: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    it('converts complex OpenAPI spec to OpenAI tools format', () => {
      const converter = new OpenAPIToMCPConverter(complexSpec)
      const tools = converter.convertToOpenAITools()

      expect(tools).toHaveLength(1)
      const tool = tools[0]

      expect(tool.type).toBe('function')
      expect(tool.function.name).toBe('createPet')
      expect(tool.function.description).toBe('Create a pet')
      expect(tool.function.parameters).toEqual({
        "$defs": {},
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The name of the pet' },
          type: { type: 'string', description: 'The type of pet', enum: ['dog', 'cat', 'bird'] },
          age: { type: 'integer', description: 'The age of the pet in years' }
        },
        required: ['name', 'type']
      })
    })

    it('converts complex OpenAPI spec to Anthropic tools format', () => {
      const converter = new OpenAPIToMCPConverter(complexSpec)
      const tools = converter.convertToAnthropicTools()

      expect(tools).toHaveLength(1)
      const tool = tools[0]

      expect(tool.name).toBe('createPet')
      expect(tool.description).toBe('Create a pet')
      expect(tool.input_schema).toEqual({
        "$defs": {},
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The name of the pet' },
          type: { type: 'string', description: 'The type of pet', enum: ['dog', 'cat', 'bird'] },
          age: { type: 'integer', description: 'The age of the pet in years' }
        },
        required: ['name', 'type']
      })
    })
  })
}) 