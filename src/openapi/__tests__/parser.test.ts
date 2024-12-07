import { describe, it, expect } from 'vitest'
import { OpenAPIToMCPConverter } from '../parser'
import { OpenAPIV3 } from 'openapi-types'

describe('OpenAPIToMCPConverter', () => {
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
        },
        post: {
          operationId: 'updatePet',
          summary: 'Update a pet',
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
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: {
                      type: 'string',
                      description: 'The name of the pet'
                    },
                    age: {
                      type: 'integer',
                      description: 'The age of the pet'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Pet updated',
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

  it('converts OpenAPI paths to MCP tools', () => {
    const converter = new OpenAPIToMCPConverter(sampleSpec)
    const { tools, openApiLookup } = converter.convertToMCPTools()

    expect(tools).toHaveProperty('API')
    expect(tools.API.methods).toHaveLength(2)
    expect(Object.keys(openApiLookup)).toHaveLength(2)

    // Test GET endpoint conversion
    const getPetMethod = tools.API.methods.find(m => m.name === 'getPet')
    expect(getPetMethod).toBeDefined()
    expect(getPetMethod).toMatchObject({
      name: 'getPet',
      description: 'Get a pet by ID',
      params: [
        {
          name: 'petId',
          type: 'number',
          description: 'The ID of the pet',
          optional: false
        }
      ],
      returns: {
        type: 'object',
        description: 'Pet found'
      }
    })

    // Test POST endpoint conversion
    const updatePetMethod = tools.API.methods.find(m => m.name === 'updatePet')
    expect(updatePetMethod).toBeDefined()
    expect(updatePetMethod).toMatchObject({
      name: 'updatePet',
      description: 'Update a pet',
      params: [
        {
          name: 'petId',
          type: 'number',
          description: 'The ID of the pet',
          optional: false
        },
        {
          name: 'name',
          type: 'string',
          description: 'The name of the pet',
          optional: false
        },
        {
          name: 'age',
          type: 'number',
          description: 'The age of the pet',
          optional: true
        }
      ],
      returns: {
        type: 'object',
        description: 'Pet updated'
      }
    })
  })
}) 