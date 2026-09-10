import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import type { Queue } from "bullmq";
import type { OrchestratorResult } from "@core/orchestration/index.js";
import { CreateTodoOrchestrator } from "./todos.orchestrator.js";
import type { CreateTodoInput, Todo } from "./todos.types.js";

/**
 * TodoService — facade over the orchestrator.
 * Routes call the service; the service owns orchestrator lifecycle.
 */
export class TodoService {
  constructor(
    private prisma: PrismaClient,
    private notificationsQueue?: Queue,
  ) {}

  public async createTodo(
    input: CreateTodoInput,
    log?: Logger,
  ): Promise<OrchestratorResult<Todo>> {
    const orchestrator = new CreateTodoOrchestrator(
      this.prisma,
      this.notificationsQueue,
      log,
    );
    return orchestrator.execute(input);
  }

  public async healthCheck(): Promise<{ status: string; service: string }> {
    return { status: "healthy", service: "TodoService" };
  }
}
