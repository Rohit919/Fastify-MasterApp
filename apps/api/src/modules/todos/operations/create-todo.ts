import type { Prisma } from "@/generated/prisma/client.js";
import type { TodoPipelineContext, CreateTodoInput } from "../todos.types.js";

export async function createTodo(
  context: TodoPipelineContext,
): Promise<TodoPipelineContext> {
  if (context.validationErrors && context.validationErrors.length > 0)
    return context;

  const input = context.input as CreateTodoInput;
  try {
    const result = await context.prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.todo.findUnique({
          where: {
            userId_idempotencyKey: {
              userId: input.userId,
              idempotencyKey: input.idempotencyKey,
            },
          },
        });
        if (existing) return { todo: existing, outboxEventId: undefined };
      }

      const todo = await tx.todo.create({
        data: {
          title: input.title,
          description: input.description || null,
          userId: input.userId,
          idempotencyKey: input.idempotencyKey,
          completed: false,
        },
      });
      const event = await tx.outboxEvent.create({
        data: {
          type: "todo.created",
          aggregateId: todo.id,
          payload: {
            type: "todo.created",
            todoId: todo.id,
            userId: todo.userId,
            title: todo.title,
          } satisfies Prisma.InputJsonObject,
        },
      });
      return { todo, outboxEventId: event.id };
    });

    context.todo = result.todo;
    context.outboxEventId = result.outboxEventId;
    context.results.createdTodo = result.todo;
    if (!result.outboxEventId) context.results.idempotentReplay = true;
  } catch (error) {
    context.errors.push(error as Error);
  }

  return context;
}
