import type { Logger } from "pino";
import type { Queue } from "bullmq";
import {
  BaseOrchestrator,
  DefaultPerformanceTracker,
} from "@core/orchestration/index.js";
import type { PipelineStage } from "@core/orchestration/index.js";
import type { PrismaClient } from "@/generated/prisma/client.js";
import type {
  TodoPipelineContext,
  CreateTodoInput,
  Todo,
} from "./todos.types.js";
import {
  validateInput,
  createTodo,
  notifyCreation,
} from "./operations/index.js";

/**
 * CreateTodoOrchestrator — Golden Orchestrator pattern.
 * Pipeline: validate-input → create-todo → notify-creation
 */
export class CreateTodoOrchestrator extends BaseOrchestrator<
  TodoPipelineContext,
  Todo,
  CreateTodoInput
> {
  constructor(
    private prisma: PrismaClient,
    private notificationsQueue?: Queue,
    log?: Logger,
  ) {
    super(
      {
        name: "CreateTodoOrchestrator",
        timeout: 5000,
        enableMetrics: true,
        logErrors: true,
      },
      log,
    );
  }

  protected async initializeContext(
    input: CreateTodoInput,
  ): Promise<TodoPipelineContext> {
    return {
      requestId: crypto.randomUUID(),
      startTime: Date.now(),
      perfTracker: new DefaultPerformanceTracker(),
      prisma: this.prisma,
      notificationsQueue: this.notificationsQueue,
      input,
      results: {},
      errors: [],
      metadata: {
        orchestrator: this.getName(),
        inputType: "CreateTodoInput",
      },
    };
  }

  protected getPipeline(): PipelineStage<TodoPipelineContext>[] {
    return [
      {
        name: "validate-input",
        operation: validateInput,
        critical: true,
        timeout: 1000,
      },
      {
        name: "create-todo",
        operation: createTodo,
        critical: true,
        timeout: 2000,
      },
      {
        name: "notify-creation",
        operation: notifyCreation,
        critical: false,
        timeout: 1000,
      },
    ];
  }

  protected buildResult(context: TodoPipelineContext): Todo {
    if (!context.todo) {
      throw new Error("Todo creation failed - no todo in context");
    }
    return context.todo;
  }
}
