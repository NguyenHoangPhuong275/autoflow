import type { DeepSeekToolDefinition } from '@/core/services/deepSeekService';

type JsonSchema = Record<string, unknown>;

export function tool(name: string, description: string, parameters: JsonSchema = { type: 'object', properties: {}, additionalProperties: false }): DeepSeekToolDefinition {
  return { type: 'function', function: { name, description, parameters } };
}

export function objectSchema(properties: Record<string, JsonSchema>, required?: string[]): JsonSchema {
  return {
    type: 'object',
    properties,
    ...(required ? { required } : {}),
    additionalProperties: false,
  };
}
