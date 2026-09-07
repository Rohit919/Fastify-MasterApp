import { Type, type Static } from '@sinclair/typebox';

/**
 * Todo contracts — shared between the Fastify API and the admin.
 * The create endpoint uses the Golden Orchestrator pattern and returns an
 * optional `metadata` block (execution duration + step metrics).
 */

// ── Requests ──────────────────────────────────────────────────────────────────
export const CreateTodoBody = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200, description: 'Todo title' }),
  description: Type.String({ maxLength: 1000, description: 'Todo description' }),
});
export type CreateTodoBody = Static<typeof CreateTodoBody>;

// ── Resource representations ────────────────────────────────────────────────
/** Full todo (orchestrated create response). */
export const Todo = Type.Object({
  id: Type.String(),
  title: Type.String(),
  description: Type.String(),
  completed: Type.Boolean(),
  userId: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});
export type Todo = Static<typeof Todo>;

/** Trimmed representation for the list + single-read endpoints. */
export const TodoListItem = Type.Object({
  id: Type.String(),
  title: Type.String(),
  description: Type.String(),
  completed: Type.Boolean(),
});
export type TodoListItem = Static<typeof TodoListItem>;

// ── Responses ─────────────────────────────────────────────────────────────────
export const CreateTodoResponse = Type.Object({
  success: Type.Literal(true),
  data: Todo,
  metadata: Type.Optional(
    Type.Object({
      duration: Type.Number({ description: 'Total execution time in ms' }),
      metrics: Type.Optional(Type.Record(Type.String(), Type.Number())),
    })
  ),
});
export type CreateTodoResponse = Static<typeof CreateTodoResponse>;

export const ListTodosResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Array(TodoListItem),
});
export type ListTodosResponse = Static<typeof ListTodosResponse>;

export const TodoResponse = Type.Object({
  success: Type.Literal(true),
  data: TodoListItem,
});
export type TodoResponse = Static<typeof TodoResponse>;

export const TodoHealthResponse = Type.Object({
  status: Type.String(),
  service: Type.String(),
});
export type TodoHealthResponse = Static<typeof TodoHealthResponse>;
