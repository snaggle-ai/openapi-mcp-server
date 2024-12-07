import { HttpClient } from '../http-client'
import { OpenAPIV3 } from 'openapi-types'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import OpenAPIClientAxios from 'openapi-client-axios'

vi.mock('openapi-client-axios', () => {
  const mockInit = vi.fn()
  return {
    default: vi.fn(() => ({
      init: mockInit,
      document: {},
      inputDocument: {},
      definition: {},
      quick: false,
      initialized: false,
      instance: null,
      axiosConfigDefaults: {},
      defaultServer: undefined,
      baseURLVariables: {},
      applyMethodCommonHeaders: false,
      transformOperationName: undefined,
      transformOperationMethod: undefined,
      withServer: undefined,
      initializeInstance: vi.fn(),
      getInstanceByDocument: vi.fn(),
      getInstanceByDefinition: vi.fn(),
      initSync: vi.fn(),
      getSync: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      getConfig: vi.fn(),
      setConfig: vi.fn(),
      configure: vi.fn(),
      configureAxios: vi.fn(),
      getDefaultAxiosConfigForDocument: vi.fn(),
      getBaseURL: vi.fn(),
      setBaseURL: vi.fn(),
      getBaseURLForOperation: vi.fn(),
      getResponseType: vi.fn(),
      getParamTypes: vi.fn(),
      getParams: vi.fn(),
      resolveParamTypes: vi.fn(),
      resolveParam: vi.fn(),
      validateParam: vi.fn(),
      splitParam: vi.fn(),
      getOperationById: vi.fn(),
      getOperationMethodAndPath: vi.fn()
    }))
  }
})

describe('HttpClient with Complex Schemas', () => {
  let client: HttpClient
  let mockApi: any

  const complexSpec: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: { title: 'Complex API', version: '1.0.0' },
    components: {
      schemas: {
        Error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'integer' },
            message: { type: 'string' }
          }
        },
        Pet: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            category: { $ref: '#/components/schemas/Category' },
            tags: {
              type: 'array',
              items: { $ref: '#/components/schemas/Tag' }
            }
          }
        },
        Category: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' }
          }
        },
        Tag: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' }
          }
        }
      },
      parameters: {
        PetId: {
          name: 'petId',
          in: 'path',
          required: true,
          schema: { type: 'integer' }
        }
      },
      responses: {
        NotFound: {
          description: 'The specified resource was not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    paths: {
      '/pets/{petId}': {
        get: {
          operationId: 'getPet',
          parameters: [
            { $ref: '#/components/parameters/PetId' }
          ],
          responses: {
            '200': {
              description: 'A pet object',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Pet' }
                }
              }
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        },
        put: {
          operationId: 'updatePet',
          parameters: [
            { $ref: '#/components/parameters/PetId' }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pet' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Pet updated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Pet' }
                }
              }
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        }
      }
    }
  }

  const getPetOperation = complexSpec.paths['/pets/{petId}']?.get
  const updatePetOperation = complexSpec.paths['/pets/{petId}']?.put

  if (!getPetOperation || !updatePetOperation) {
    throw new Error('Test setup error: operations not found in sample spec')
  }

  beforeEach(() => {
    mockApi = {
      getPet: vi.fn(),
      updatePet: vi.fn()
    }

    const mockOpenAPIClientAxios = vi.mocked(OpenAPIClientAxios)
    const mockInstance = mockOpenAPIClientAxios({ 
      definition: complexSpec,
      axiosConfigDefaults: {
        baseURL: 'https://api.example.com'
      }
    })
    vi.mocked(mockInstance.init).mockResolvedValue(mockApi)

    client = new HttpClient({ baseUrl: 'https://api.example.com' }, complexSpec)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET operation with references', () => {
    it('should handle successful response with nested references', async () => {
      const mockResponse = {
        data: {
          id: 1,
          name: 'Fluffy',
          category: {
            id: 1,
            name: 'Cats'
          },
          tags: [
            { id: 1, name: 'cute' },
            { id: 2, name: 'fluffy' }
          ]
        },
        status: 200,
        headers: {
          'content-type': 'application/json'
        }
      }

      mockApi.getPet.mockResolvedValueOnce(mockResponse)

      const response = await client.executeOperation(
        getPetOperation,
        'get',
        '/pets/{petId}',
        { petId: 1 }
      )

      expect(mockApi.getPet).toHaveBeenCalledWith({ petId: 1 })
      expect(response.data).toEqual(mockResponse.data)
      expect(response.status).toBe(200)
      expect(response.headers).toBeInstanceOf(Headers)
      expect(response.headers.get('content-type')).toBe('application/json')
    })

    it('should handle error response with referenced error schema', async () => {
      const error = {
        response: {
          data: {
            code: 404,
            message: 'Pet not found'
          },
          status: 404,
          statusText: 'Not Found'
        }
      }
      mockApi.getPet.mockRejectedValueOnce(error)

      await expect(
        client.executeOperation(
          getPetOperation,
          'get',
          '/pets/{petId}',
          { petId: 999 }
        )
      ).rejects.toThrow('API request failed: 404 Not Found')
    })
  })

  describe('PUT operation with references', () => {
    it('should handle request body and response with references', async () => {
      const requestBody = {
        id: 1,
        name: 'Fluffy Updated',
        category: {
          id: 1,
          name: 'Cats'
        },
        tags: [
          { id: 1, name: 'cute' },
          { id: 2, name: 'fluffy' },
          { id: 3, name: 'friendly' }
        ]
      }

      const mockResponse = {
        data: requestBody,
        status: 200,
        headers: {
          'content-type': 'application/json'
        }
      }

      mockApi.updatePet.mockResolvedValueOnce(mockResponse)

      const response = await client.executeOperation(
        updatePetOperation,
        'put',
        '/pets/{petId}',
        { 
          petId: 1,
          ...requestBody
        }
      )

      expect(mockApi.updatePet).toHaveBeenCalledWith({
        petId: 1,
        ...requestBody
      })
      expect(response.data).toEqual(mockResponse.data)
      expect(response.status).toBe(200)
      expect(response.headers).toBeInstanceOf(Headers)
      expect(response.headers.get('content-type')).toBe('application/json')
    })

    it('should handle validation errors for invalid request body', async () => {
      const invalidRequestBody = {
        // Missing required 'name' field
        id: 1,
        category: {
          // Missing required 'name' field
          id: 1
        }
      }

      const error = {
        response: {
          data: {
            code: 400,
            message: 'Validation failed'
          },
          status: 400,
          statusText: 'Bad Request'
        }
      }
      mockApi.updatePet.mockRejectedValueOnce(error)

      await expect(
        client.executeOperation(
          updatePetOperation,
          'put',
          '/pets/{petId}',
          { 
            petId: 1,
            ...invalidRequestBody
          }
        )
      ).rejects.toThrow('API request failed: 400 Bad Request')
    })
  })
})

// Keep the original simple tests
describe('HttpClient', () => {
  let client: HttpClient
  let mockApi: any

  const sampleSpec: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/pets/{petId}': {
        get: {
          operationId: 'getPet',
          parameters: [
            {
              name: 'petId',
              in: 'path',
              required: true,
              schema: { type: 'integer' }
            }
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { type: 'object' }
                }
              }
            }
          }
        }
      }
    }
  }

  const getPetOperation = sampleSpec.paths['/pets/{petId}']?.get
  if (!getPetOperation) {
    throw new Error('Test setup error: getPet operation not found in sample spec')
  }

  beforeEach(() => {
    mockApi = {
      getPet: vi.fn()
    }

    // Get the mock instance and set up its init function
    const mockOpenAPIClientAxios = vi.mocked(OpenAPIClientAxios)
    const mockInstance = mockOpenAPIClientAxios({ 
      definition: sampleSpec,
      axiosConfigDefaults: {
        baseURL: 'https://api.example.com'
      }
    })
    vi.mocked(mockInstance.init).mockResolvedValue(mockApi)

    client = new HttpClient({ baseUrl: 'https://api.example.com' }, sampleSpec)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('successfully executes an operation', async () => {
    const mockResponse = {
      data: { id: 1, name: 'Fluffy' },
      status: 200,
      headers: {
        'content-type': 'application/json'
      }
    }

    mockApi.getPet.mockResolvedValueOnce(mockResponse)

    const response = await client.executeOperation(
      getPetOperation,
      'get',
      '/pets/{petId}',
      { petId: 1 }
    )

    expect(mockApi.getPet).toHaveBeenCalledWith({ petId: 1 })
    expect(response.data).toEqual(mockResponse.data)
    expect(response.status).toBe(200)
    expect(response.headers).toBeInstanceOf(Headers)
    expect(response.headers.get('content-type')).toBe('application/json')
  })

  it('throws error when operation ID is missing', async () => {
    const operationWithoutId: OpenAPIV3.OperationObject = {
      responses: {
        '200': {
          description: 'OK'
        }
      }
    }

    await expect(
      client.executeOperation(operationWithoutId, 'get', '/test')
    ).rejects.toThrow('Operation ID is required')
  })

  it('throws error when operation is not found', async () => {
    const operation: OpenAPIV3.OperationObject = {
      operationId: 'nonexistentOperation',
      responses: {
        '200': {
          description: 'OK'
        }
      }
    }

    await expect(
      client.executeOperation(operation, 'get', '/test')
    ).rejects.toThrow('Operation nonexistentOperation not found')
  })

  it('handles API errors correctly', async () => {
    const error = {
      response: {
        status: 404,
        statusText: 'Not Found'
      }
    }
    mockApi.getPet.mockRejectedValueOnce(error)

    await expect(
      client.executeOperation(
        getPetOperation,
        'get',
        '/pets/{petId}',
        { petId: 999 }
      )
    ).rejects.toThrow('API request failed: 404 Not Found')
  })
}) 