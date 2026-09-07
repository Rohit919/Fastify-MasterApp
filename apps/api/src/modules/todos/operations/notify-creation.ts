import type { TodoPipelineContext } from '../todos.types.js';
import { enqueueNotification } from '@/queue/producer.js';

/**
 * Non-critical stage: enqueue a notification job and return immediately.
 * The actual delivery runs in the worker process, off the HTTP path.
 */
export async function notifyCreation(context: TodoPipelineContext): Promise<TodoPipelineContext> {
  if (!context.todo) {
    return context;
  }

  if (context.notificationsQueue) {
    const jobId = await enqueueNotification(context.notificationsQueue, {
      type: 'todo.created',
      todoId: context.todo.id,
      userId: context.todo.userId,
      title: context.todo.title,
    });
    context.results.notificationJobId = jobId;
  } else {
    // No queue wired (e.g. tests) — record intent without side effects.
    context.results.notificationSkipped = true;
  }

  return context;
}
