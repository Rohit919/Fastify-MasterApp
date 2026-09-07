import type { FastifyInstance } from 'fastify';
import { AppError } from '../errors/index.js';

/**
 * Registers the global error handler and the not-found handler.
 * Both produce the consistent { success: false, error: {...} } envelope.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const isOperational = error instanceof AppError && error.isOperational;

    if (!isOperational) {
      request.log.error({ err: error, requestId: request.id }, 'Unexpected programming error');
    } else {
      request.log.warn({ err: error, requestId: request.id }, 'Operational error');
    }

    const statusCode = error.statusCode ?? 500;

    // In production, never leak internal 5xx messages
    const message =
      statusCode >= 500 && process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : (error.message ?? 'Internal Server Error');

    return reply.status(statusCode).send({
      success: false,
      error: {
        message,
        statusCode,
        requestId: request.id,
        timestamp: new Date().toISOString(),
        ...(statusCode < 500 && error instanceof AppError && error.details
          ? { details: error.details }
          : {}),
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        message: 'Route not found',
        statusCode: 404,
        requestId: request.id,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  });
}
