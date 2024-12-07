import { OpenAPIV3 } from 'openapi-types'
import OpenAPIClientAxios from 'openapi-client-axios'
import { AxiosInstance } from 'axios'

export type HttpClientConfig = {
  baseUrl: string
  headers?: Record<string, string>
}

export type HttpClientResponse<T = any> = {
  data: T
  status: number
  headers: Headers
}

export class HttpClient {
  private api: Promise<AxiosInstance>
  private client: OpenAPIClientAxios

  constructor(private config: HttpClientConfig, private openApiSpec: OpenAPIV3.Document) {
    this.client = new OpenAPIClientAxios({ 
      definition: openApiSpec,
      axiosConfigDefaults: {
        baseURL: config.baseUrl,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        }
      }
    })
    this.api = this.client.init()
  }

  /**
   * Execute an OpenAPI operation
   */
  async executeOperation<T = any>(
    operation: OpenAPIV3.OperationObject,
    method: string,
    path: string,
    params: Record<string, any> = {}
  ): Promise<HttpClientResponse<T>> {
    const api = await this.api
    const operationId = operation.operationId
    if (!operationId) {
      throw new Error('Operation ID is required')
    }

    // Get the operation function from the generated client
    const operationFn = (api as any)[operationId]
    if (!operationFn) {
      throw new Error(`Operation ${operationId} not found`)
    }

    try {
      const response = await operationFn(params)
      // Convert axios headers to Headers object
      const headers = new Headers()
      Object.entries(response.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString())
      })
      
      return {
        data: response.data,
        status: response.status,
        headers
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(`API request failed: ${error.response.status} ${error.response.statusText}`)
      }
      throw error
    }
  }
} 