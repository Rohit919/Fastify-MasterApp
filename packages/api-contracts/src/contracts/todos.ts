import { HttpMethod } from "./http.js";
import type { ApiEndpoint } from "./endpoint.js";
import { IdParams } from "./params.js";
import { TODO_ENDPOINTS } from "../endpoints/todos.js";
import { ErrorCode } from "../common.js";
import { PermissionKeys } from "../rbac.js";
import {
  CreateTodoBody,
  CreateTodoResponse,
  ListTodosResponse,
  TodoResponse,
  TodoHealthResponse,
} from "../todos.js";

/**
 * Todo endpoint contracts (Level 2). The create endpoint uses the Golden
 * Orchestrator pattern; GET /:id additionally enforces ownership at runtime
 * (admins bypass). `permission` is descriptive metadata — the API enforces the
 * role/ownership checks.
 */
export const TODO_CONTRACTS = {
  CREATE: {
    method: HttpMethod.POST,
    path: TODO_ENDPOINTS.ROOT,
    auth: "required",
    body: CreateTodoBody,
    response: { 201: CreateTodoResponse },
    errors: [ErrorCode.UNAUTHORIZED, ErrorCode.VALIDATION_ERROR],
    operationId: "todos.create",
    summary: "Create a todo (Golden Orchestrator pattern)",
    tags: ["Todos"],
  },

  LIST: {
    method: HttpMethod.GET,
    path: TODO_ENDPOINTS.ROOT,
    auth: "required",
    response: { 200: ListTodosResponse },
    errors: [ErrorCode.UNAUTHORIZED],
    operationId: "todos.list",
    summary: "List the authenticated user todos",
    tags: ["Todos"],
  },

  GET_BY_ID: {
    method: HttpMethod.GET,
    path: TODO_ENDPOINTS.ROUTE_BY_ID,
    auth: "required",
    permission: PermissionKeys.TodosRead,
    params: IdParams,
    response: { 200: TodoResponse },
    errors: [ErrorCode.UNAUTHORIZED, ErrorCode.FORBIDDEN, ErrorCode.NOT_FOUND],
    operationId: "todos.get",
    summary: "Get a single todo (owner or admin only)",
    tags: ["Todos"],
  },

  HEALTH: {
    method: HttpMethod.GET,
    path: TODO_ENDPOINTS.HEALTH,
    auth: "public",
    response: { 200: TodoHealthResponse },
    operationId: "todos.health",
    summary: "Todo service health check",
    tags: ["Todos"],
  },
} satisfies Record<string, ApiEndpoint>;
