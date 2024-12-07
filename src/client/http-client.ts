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
    // @ts-expect-error
    this.client = new (OpenAPIClientAxios.default ?? OpenAPIClientAxios)({ 
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

    // Separate parameters based on their location
    const urlParameters: Record<string, any> = {}
    const bodyParams: Record<string, any> = { ...params }

    // Extract path and query parameters based on operation definition
    if (operation.parameters) {
      for (const param of operation.parameters) {
        // TODO: do we need to be so thorough?
        if ('name' in param && param.name && param.in) {
          if (param.in === 'path' || param.in === 'query') {
            if (params[param.name] !== undefined) {
              urlParameters[param.name] = params[param.name]
              delete bodyParams[param.name]
            }
          }
        }
      }
    }

    // Add all parameters as url parameters if there is no requestBody defined
    if (!operation.requestBody) {
      for (const key in bodyParams) {
        if (bodyParams[key] !== undefined) {
          urlParameters[key] = bodyParams[key]
          delete bodyParams[key]
        }
      }
    }

    const operationFn = (api as any)[operationId]
    if (!operationFn) {
      throw new Error(`Operation ${operationId} not found`)
    }

    try {
      // first argument is url parameters, second is body parameters
      const response = await operationFn(urlParameters, bodyParams);
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