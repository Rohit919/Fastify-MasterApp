import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { OrchestratorResult } from '@core/orchestration/index.js';
import { CreateTodoOrchestrator } from './todos.orchestrator.js';
import type { CreateTodoInput, Todo } from './todos.types.js';

/**
 * TodoService — facade over the orchestrator.
 * Routes call the service; the service owns orchestrator lifecycle.
 */
export class TodoService {
  constructor(private prisma: PrismaClient) {}

  public async createTodo(input: CreateTodoInput, log?: Logger): Promise<OrchestratorResult<Todo>> {
    const orchestrator = new CreateTodoOrchestrator(this.prisma, log);
    return orchestrator.execute(input);
  }

  public async healthCheck(): Promise<{ status: string; service: string }> {
    return { status: 'healthy', service: 'TodoService' };
  }
}
