/**
 * Job data contracts. These cross a process boundary (API → Redis → worker),
 * so they must be plain JSON-serializable objects — no class instances, no
 * Prisma models, no functions.
 */

export interface NotificationJobData {
  type: 'todo.created';
  todoId: string;
  userId: string;
  title: string;
  /** W3C traceparent for distributed-trace continuity into the worker. */
  _otel?: Record<string, string>;
}

/** Map of queue name → its job data type. Extend as queues are added. */
export interface JobDataByQueue {
  notifications: NotificationJobData;
}
