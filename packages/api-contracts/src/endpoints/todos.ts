import { API_VERSION, encodeId } from './common.js';

/**
 * Todo endpoint paths (registered under `/api/v1/todos`).
 * Demonstrates the Golden Orchestrator module.
 */
const TODOS_BASE = `${API_VERSION}/todos`;

export const TODO_ENDPOINTS = {
  ROOT: TODOS_BASE,
  HEALTH: `${TODOS_BASE}/health`,

  BY_ID: (todoId: string) => `${TODOS_BASE}/${encodeId(todoId)}`,

  // Fastify route template
  ROUTE_BY_ID: `${TODOS_BASE}/:id`,
} as const;
