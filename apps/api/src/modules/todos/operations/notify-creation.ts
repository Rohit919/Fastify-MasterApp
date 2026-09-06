import type { TodoPipelineContext } from '../todos.types.js';

export async function notifyCreation(context: TodoPipelineContext): Promise<TodoPipelineContext> {
  // Skip if no todo was created
  if (!context.todo) {
    return context;
  }

  // Simulate notification (email, webhook, message queue, etc.)
  // In production this would enqueue a background job — see enterprise-scale spec REQ-102.
  context.results.notificationSent = {
    type: 'todo.created',
    todoId: context.todo.id,
    userId: context.todo.userId,
    timestamp: new Date().toISOString(),
  };

  return context;
}
