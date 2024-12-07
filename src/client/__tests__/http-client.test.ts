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

    expect(mockApi.getPet).toHaveBeenCalledWith({ petId: 1 }, {})
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

  it('should send body parameters in request body for POST operations', async () => {
    // Setup mock API with the new operation
    mockApi = {
      testOperation: vi.fn().mockResolvedValue({
        data: {},
        status: 200,
        headers: {}
      })
    }

    const testSpec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/test': {
          post: {
            operationId: 'testOperation',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      foo: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Success response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    const postOperation = testSpec.paths['/test']?.post
    if (!postOperation) {
      throw new Error('Test setup error: post operation not found')
    }

    // Get the mock instance and set up its init function
    const mockOpenAPIClientAxios = vi.mocked(OpenAPIClientAxios)
    const mockInstance = mockOpenAPIClientAxios({ 
      definition: testSpec,
      axiosConfigDefaults: {
        baseURL: 'http://test.com'
      }
    })
    vi.mocked(mockInstance.init).mockResolvedValue(mockApi)

    const client = new HttpClient({ baseUrl: 'http://test.com' }, testSpec)
    
    await client.executeOperation(
      postOperation,
      'post',
      '/test',
      { foo: 'bar' }
    )

    expect(mockApi.testOperation).toHaveBeenCalledWith({},
      { foo: 'bar' }
    )
  })

  it('should handle query, path, and body parameters correctly', async () => {
    mockApi = {
      complexOperation: vi.fn().mockResolvedValue({
        data: { success: true },
        status: 200,
        headers: {}
      })
    }

    const complexSpec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users/{userId}/posts': {
          post: {
            operationId: 'complexOperation',
            parameters: [
              {
                name: 'userId',
                in: 'path',
                required: true,
                schema: { type: 'integer' }
              },
              {
                name: 'include',
                in: 'query',
                required: false,
                schema: { type: 'string' }
              }
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      content: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Success response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' }
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

    const complexOperation = complexSpec.paths['/users/{userId}/posts']?.post
    if (!complexOperation) {
      throw new Error('Test setup error: complex operation not found')
    }

    // Set up mock
    const mockOpenAPIClientAxios = vi.mocked(OpenAPIClientAxios)
    const mockInstance = mockOpenAPIClientAxios({ 
      definition: complexSpec,
      axiosConfigDefaults: {
        baseURL: 'http://test.com'
      }
    })
    vi.mocked(mockInstance.init).mockResolvedValue(mockApi)

    const client = new HttpClient({ baseUrl: 'http://test.com' }, complexSpec)
    
    await client.executeOperation(
      complexOperation,
      'post',
      '/users/{userId}/posts',
      {
        // Path parameter
        userId: 123,
        // Query parameter
        include: 'comments',
        // Body parameters
        title: 'Test Post',
        content: 'Test Content'
      }
    )

    expect(mockApi.complexOperation).toHaveBeenCalledWith({
        userId: 123,
        include: 'comments'
      },
      {
        title: 'Test Post',
        content: 'Test Content'
      }
    )
  })
}) 