import type { OperationContext } from "@core/orchestration/index.js";
import type { PrismaClient } from "@/generated/prisma/client.js";
import type { Queue } from "bullmq";

// Todo domain type — matches Prisma schema
export interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoInput {
  title: string;
  description: string;
  userId: string;
  idempotencyKey?: string;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  description?: string;
  completed?: boolean;
  userId: string;
}

// Pipeline context carried through the orchestrator stages
export interface TodoPipelineContext extends OperationContext {
  input: CreateTodoInput | UpdateTodoInput;
  prisma: PrismaClient;
  /** Notifications queue. Optional so the pipeline runs without a queue (tests). */
  notificationsQueue?: Queue;
  todo?: Todo;
  outboxEventId?: string;
  todos?: Todo[];
  validationErrors?: string[];
}
