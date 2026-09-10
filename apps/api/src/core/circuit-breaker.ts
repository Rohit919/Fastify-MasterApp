import CircuitBreaker from "opossum";
import { Gauge, register } from "prom-client";
import { CircuitOpenError } from "./errors/index.js";

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
}

const DEFAULTS: Required<CircuitBreakerOptions> = {
  timeout: 5_000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
};

const circuitState = new Gauge({
  name: "circuit_breaker_state",
  help: "Circuit breaker state (1 = current). Labels: service, state.",
  labelNames: ["service", "state"],
  registers: [register],
});

function setState(
  service: string,
  state: "closed" | "open" | "half_open",
): void {
  for (const candidate of ["closed", "open", "half_open"] as const) {
    circuitState
      .labels({ service, state: candidate })
      .set(candidate === state ? 1 : 0);
  }
}

// The breaker action accepts the current invocation as an argument. This avoids
// accidentally retaining and replaying the first closure registered for a service.
const breakers = new Map<string, CircuitBreaker>();
const breakerTimeouts = new Map<string, number>();

function getOrCreateBreaker(
  service: string,
  options: CircuitBreakerOptions,
): CircuitBreaker {
  const existing = breakers.get(service);
  if (existing) return existing;

  const resolved = { ...DEFAULTS, ...options };
  const breaker = new CircuitBreaker(
    (action: (signal: AbortSignal) => Promise<unknown>, signal: AbortSignal) =>
      action(signal),
    {
      timeout: resolved.timeout,
      errorThresholdPercentage: resolved.errorThresholdPercentage,
      resetTimeout: resolved.resetTimeout,
      name: service,
    },
  );
  breaker.on("open", () => setState(service, "open"));
  breaker.on("halfOpen", () => setState(service, "half_open"));
  breaker.on("close", () => setState(service, "closed"));
  setState(service, "closed");
  breakers.set(service, breaker);
  breakerTimeouts.set(service, resolved.timeout);
  return breaker;
}

export async function withCircuitBreaker<TResult>(
  service: string,
  action: (signal: AbortSignal) => Promise<TResult>,
  options: CircuitBreakerOptions = {},
): Promise<TResult> {
  const breaker = getOrCreateBreaker(service, options);
  const controller = new AbortController();
  const timeout = breakerTimeouts.get(service) ?? DEFAULTS.timeout;
  const abortTimer = setTimeout(() => controller.abort(), timeout);
  abortTimer.unref();

  try {
    return (await breaker.fire(action, controller.signal)) as TResult;
  } catch (error) {
    if ((error as { code?: string })?.code === "EOPENBREAKER") {
      throw new CircuitOpenError(service);
    }
    throw error;
  } finally {
    clearTimeout(abortTimer);
  }
}

export function getCircuitBreaker(service: string): CircuitBreaker | undefined {
  return breakers.get(service);
}

export function listCircuitBreakers(): Array<{
  name: string;
  opened: boolean;
}> {
  return [...breakers.entries()].map(([name, breaker]) => ({
    name,
    opened: breaker.opened,
  }));
}
