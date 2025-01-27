import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import axios from 'axios'
import yaml from 'js-yaml'
import { loadSpec } from '../openapi-client'

vi.mock('fs/promises')
vi.mock('axios')

const validOpenApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Test API',
    version: '1.0.0'
  },
  servers: [{ url: 'http://localhost:3000' }],
  paths: {
    '/pets': {
      get: {
        operationId: 'getPets',
        responses: {
          '200': { description: 'A list of pets' }
        }
      }
    }
  }
}

describe('loadSpec', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Local file loading', () => {
    it('should load a valid OpenAPI spec from local JSON file', async () => {
      // Mock fs.readFile to return a valid spec
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(validOpenApiSpec))

      const result = await loadSpec('./test-spec.json')
      
      expect(result).toEqual(validOpenApiSpec)
      expect(fs.readFile).toHaveBeenCalledWith('./test-spec.json', 'utf-8')
    })

    it('should load a valid OpenAPI spec from local YAML file', async () => {
      // Mock fs.readFile to return a valid YAML spec
      const yamlSpec = yaml.dump(validOpenApiSpec)
      vi.mocked(fs.readFile).mockResolvedValue(yamlSpec)

      const result = await loadSpec('./test-spec.yaml')
      
      expect(result).toEqual(validOpenApiSpec)
      expect(fs.readFile).toHaveBeenCalledWith('./test-spec.yaml', 'utf-8')
    })

    it('should handle file not found error', async () => {
      // Mock fs.readFile to throw ENOENT
      vi.mocked(fs.readFile).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      await expect(loadSpec('./non-existent.json')).rejects.toThrow('ENOENT: no such file or directory')
    })

    it('should handle invalid JSON', async () => {
      // Mock fs.readFile to return invalid JSON
      vi.mocked(fs.readFile).mockResolvedValue('invalid json')

      await expect(loadSpec('./invalid.json')).rejects.toThrow('Unexpected token i in JSON at position 0')
    })

    it('should handle invalid YAML', async () => {
      // Mock fs.readFile to return invalid YAML
      vi.mocked(fs.readFile).mockResolvedValue('invalid: yaml: :')

      await expect(loadSpec('./invalid.yaml')).rejects.toThrow('end of the stream or a document separator is expected at line 1, column 15:')
    })
  })

  describe('URL loading', () => {
    it('should load a valid OpenAPI spec from URL', async () => {
      // Mock axios.get to return a valid spec
      vi.mocked(axios.get).mockResolvedValue({ data: validOpenApiSpec })

      const result = await loadSpec('http://example.com/api-spec.json')
      
      expect(result).toEqual(validOpenApiSpec)
      expect(axios.get).toHaveBeenCalledWith('http://example.com/api-spec.json')
    })

    it('should load a valid OpenAPI spec from YAML URL', async () => {
      // Mock axios.get to return a valid YAML spec
      const yamlSpec = yaml.dump(validOpenApiSpec)
      vi.mocked(axios.get).mockResolvedValue({ data: yamlSpec })

      const result = await loadSpec('http://example.com/api-spec.yaml')
      
      expect(result).toEqual(validOpenApiSpec)
      expect(axios.get).toHaveBeenCalledWith('http://example.com/api-spec.yaml')
    })

    it('should handle network errors', async () => {
      // Mock axios.get to throw network error
      vi.mocked(axios.get).mockRejectedValue(new Error('Network Error'))

      await expect(loadSpec('http://example.com/api-spec.json')).rejects.toThrow('Network Error')
    })

    it('should handle invalid response data', async () => {
      // Mock axios.get to return invalid data
      vi.mocked(axios.get).mockResolvedValue({ data: 'invalid data' })

      await expect(loadSpec('http://example.com/api-spec.json')).rejects.toThrow('Unexpected token i in JSON at position 0')
    })
  })
})
