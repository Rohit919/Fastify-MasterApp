/**
 * Todos module schemas — sourced from shared @app/api-contracts so the API,
 * admin, and tests validate against the exact same TypeBox definitions.
 */
export {
  CreateTodoBody as CreateTodoBodySchema,
  CreateTodoResponse as CreateTodoResponseSchema,
  ListTodosResponse as ListTodosResponseSchema,
  TodoResponse as TodoResponseSchema,
  TodoHealthResponse as TodoHealthResponseSchema,
} from '@app/api-contracts';
