import { HttpMethod } from './http.js';
import type { ApiEndpoint } from './endpoint.js';
import { EXAMPLE_ENDPOINTS } from '../endpoints/examples.js';
import { ErrorCode } from '../common.js';
import {
  CreateExampleBody,
  CreateExampleResponse,
  ListExamplesResponse,
} from '../examples.js';

/**
 * Example endpoint contracts (Level 2) — demonstrates direct-Prisma CRUD.
 */
export const EXAMPLE_CONTRACTS = {
  LIST: {
    method: HttpMethod.GET,
    path: EXAMPLE_ENDPOINTS.ROOT,
    auth: 'required',
    response: { 200: ListExamplesResponse },
    errors: [ErrorCode.UNAUTHORIZED],
    operationId: 'examples.list',
    summary: 'List all examples',
    tags: ['Example'],
  },

  CREATE: {
    method: HttpMethod.POST,
    path: EXAMPLE_ENDPOINTS.ROOT,
    auth: 'required',
    body: CreateExampleBody,
    response: { 201: CreateExampleResponse },
    errors: [ErrorCode.UNAUTHORIZED, ErrorCode.VALIDATION_ERROR],
    operationId: 'examples.create',
    summary: 'Create a new example',
    tags: ['Example'],
  },
} satisfies Record<string, ApiEndpoint>;
