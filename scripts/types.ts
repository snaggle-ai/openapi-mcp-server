export type Param = { type: string; name: string; description: string; optional?: boolean }
export type Returns = { type: string; description: string } | null
type Method = {
  name: string
  description: string
  params: Param[]
  returns: Returns
  examples?: string[]
}
export type StaticProperty = {
  name: string
  description: string
  type?: string
}
export type EntrypointDoc = {
  description: string | null
  exported_as: string | null
  methods: Array<Method>
  statics: Record<string, Array<StaticProperty>>
}
