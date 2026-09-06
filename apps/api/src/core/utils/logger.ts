import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL ?? 'info';

export const logger = pino({
  level: logLevel,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          colorize: true,
          singleLine: false,
        },
      },
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  base: {
    env: process.env.NODE_ENV,
    revision: process.env.COMMIT_SHA ?? 'unknown',
  },
});

export const createLogger = (module: string) => logger.child({ module });
