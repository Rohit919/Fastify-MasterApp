import { Type } from '@sinclair/typebox';

export const CreateTodoBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200, description: 'Todo title' }),
  description: Type.String({ maxLength: 1000, description: 'Todo description' }),
});

export const CreateTodoResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    id: Type.String(),
    title: Type.String(),
    description: Type.String(),
    completed: Type.Boolean(),
    userId: Type.String(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  }),
  metadata: Type.Optional(
    Type.Object({
      duration: Type.Number({ description: 'Total execution time in ms' }),
      metrics: Type.Optional(Type.Record(Type.String(), Type.Number())),
    })
  ),
});

export const ListTodosResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Array(
    Type.Object({
      id: Type.String(),
      title: Type.String(),
      description: Type.String(),
      completed: Type.Boolean(),
    })
  ),
});

export const TodoHealthResponseSchema = Type.Object({
  status: Type.String(),
  service: Type.String(),
});
