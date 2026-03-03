// circuitBreaker.ts - Circuit Breaker pattern implementation for resilient API calls

import Logger from './logger';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/** Possible states of a circuit breaker. */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Snapshot of a circuit breaker's operational metrics.
 *
 * - `totalRequests`       – Requests that were actually executed (not blocked).
 * - `totalSuccesses`      – Requests that completed without triggering a failure.
 * - `totalFailures`       – Requests that triggered the failure predicate.
 * - `blockedRequests`     – Requests rejected immediately because the breaker was open.
 * - `consecutiveFailures` – Unbroken run of failures since the last success.
 * - `lastFailureTime`     – Epoch ms of the most-recent recorded failure.
 * - `lastSuccessTime`     – Epoch ms of the most-recent recorded success.
 * - `lastFailureError`    – The most-recent failure's Error object.
 * - `stateChangeTime`     – Epoch ms when the current state was entered.
 * - `uptime`              – Milliseconds the breaker has been in its current state.
 * - `successRate`         – Ratio of successes to total executed requests (0–1).
 */
export interface CircuitBreakerMetrics {
    totalRequests: number;
    totalSuccesses: number;
    totalFailures: number;
    blockedRequests: number;
    consecutiveFailures: number;
    lastFailureTime?: number;
    lastSuccessTime?: number;
    lastFailureError?: Error;
    stateChangeTime: number;
    uptime: number;
    successRate: number;
}

/**
 * Configuration options for a {@link CircuitBreaker} instance.
 *
 * All fields are optional; unspecified values fall back to the global defaults
 * (`DEFAULT_CONFIG`).
 */
export interface CircuitBreakerConfig {
    /** Number of consecutive failures before the breaker opens. Default: 5. */
    failureThreshold?: number;
    /** Consecutive successes required (in half-open) to close the breaker. Default: 2. */
    successThreshold?: number;
    /** Milliseconds to wait in open state before moving to half-open. Default: 60 000. */
    timeout?: number;
    /** Maximum concurrent requests allowed in half-open state. Default: 1. */
    halfOpenLimit?: number;
    /**
     * Custom predicate that decides whether a thrown error should count as a
     * circuit-breaking failure.  Return `true` to count the error as a failure
     * (default behaviour) or `false` to let it propagate without affecting the
     * counter (e.g. for 4xx / validation errors).
     */
    failurePredicate?: (error: Error) => boolean;
    /**
     * Maximum number of entries retained in {@link CircuitBreaker.eventHistory}.
     * Older entries are evicted when the limit is exceeded.
     * Set to `0` to disable history entirely. Default: 100.
     */
    maxEventHistory?: number;
}

/** Payload carried by every circuit-breaker event. */
export interface CircuitBreakerEvent {
    type: 'open' | 'closed' | 'half-open' | 'success' | 'failure';
    timestamp: number;
    metrics: CircuitBreakerMetrics;
    error?: Error;
    context?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

/**
 * Thrown by {@link CircuitBreaker.execute} when the breaker is **open** and a
 * request would have been forwarded to the failing service.
 *
 * Callers can detect this error to serve cached data or degrade gracefully:
 *
 * ```typescript
 * try {
 *   const data = await breaker.execute(fetchUsers);
 * } catch (err) {
 *   if (err instanceof CircuitBreakerError) return getCachedUsers();
 *   throw err;
 * }
 * ```
 */
export class CircuitBreakerError extends Error {
    public readonly breakerName: string;
    public readonly metrics: CircuitBreakerMetrics;

    constructor(breakerName: string, metrics: CircuitBreakerMetrics) {
        super(`Circuit breaker '${breakerName}' is open`);
        this.name = 'CircuitBreakerError';
        this.breakerName = breakerName;
        this.metrics = metrics;
    }
}

/**
 * Thrown when an invalid state transition is attempted (e.g. calling an
 * internal transition method out of sequence).
 */
export class CircuitBreakerStateError extends Error {
    public readonly from: CircuitBreakerState;
    public readonly to: CircuitBreakerState;

    constructor(from: CircuitBreakerState, to: CircuitBreakerState) {
        super(`Invalid state transition: ${from} → ${to}`);
        this.name = 'CircuitBreakerStateError';
        this.from = from;
        this.to = to;
    }
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<Omit<CircuitBreakerConfig, 'failurePredicate'>> = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60_000,
    halfOpenLimit: 1,
    maxEventHistory: 100,
};

/**
 * Default failure predicate.  Returns `false` (does not count as a failure)
 * for `ValidationError` instances and errors with a 4xx HTTP status code.
 * All other errors return `true` and will count toward the failure threshold.
 */
function defaultFailurePredicate(error: Error): boolean {
    // Never trip the breaker for validation / client errors
    if (error.name === 'ValidationError') return false;
    const status = (error as unknown as Record<string, unknown>).status;
    if (typeof status === 'number' && status >= 400 && status < 500) return false;
    return true;
}

// ---------------------------------------------------------------------------
// CircuitBreaker
// ---------------------------------------------------------------------------

type EventListener<T extends unknown[]> = (...args: T) => void;

type EventMap = {
    open: [metrics: CircuitBreakerMetrics];
    closed: [metrics: CircuitBreakerMetrics];
    'half-open': [metrics: CircuitBreakerMetrics];
    success: [result: unknown, metrics: CircuitBreakerMetrics, context?: Record<string, unknown>];
    failure: [error: Error, metrics: CircuitBreakerMetrics, context?: Record<string, unknown>];
};

/**
 * Circuit Breaker implementation.
 *
 * ## State machine
 *
 * ```
 * CLOSED ──(failures >= threshold)──► OPEN
 *   ▲                                   │
 *   │                               (timeout)
 *   │                                   ▼
 *   └────(successes >= threshold)── HALF-OPEN
 *                                       │
 *                                 (failure)
 *                                       │
 *                                       ▼
 *                                     OPEN  (timeout restarts)
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * const breaker = new CircuitBreaker('my-service', {
 *   failureThreshold: 3,
 *   timeout: 30_000,
 * });
 *
 * breaker.on('open', (metrics) => Logger.warn('Service unavailable', metrics));
 *
 * const data = await breaker.execute(() => fetch('https://my-service/api'));
 * ```
 */
export class CircuitBreaker {
    private readonly name: string;
    private readonly config: Required<Omit<CircuitBreakerConfig, 'failurePredicate'>> & { failurePredicate: (error: Error) => boolean };

    private state: CircuitBreakerState = 'closed';
    private consecutiveFailures = 0;
    private consecutiveSuccesses = 0;
    private halfOpenRequests = 0;

    private totalRequests = 0;
    private totalSuccesses = 0;
    private totalFailures = 0;
    private blockedRequests = 0;
    private lastFailureTime?: number;
    private lastSuccessTime?: number;
    private lastFailureError?: Error;
    private stateChangeTime: number = Date.now();

    private openedAt?: number;

    private readonly listeners: {
        [K in keyof EventMap]?: Array<EventListener<EventMap[K]>>;
    } = {};

    /** History of recent events (capped by `config.maxEventHistory`). Useful for testing and debugging. */
    public readonly eventHistory: CircuitBreakerEvent[] = [];

    /**
     * @param name   Unique identifier for this breaker (e.g. an endpoint URL
     *               or service name). Used in log messages and error objects.
     * @param config Optional configuration overrides.
     */
    constructor(name: string, config: CircuitBreakerConfig = {}) {
        this.name = name;
        this.config = {
            failureThreshold: config.failureThreshold ?? DEFAULT_CONFIG.failureThreshold,
            successThreshold: config.successThreshold ?? DEFAULT_CONFIG.successThreshold,
            timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
            halfOpenLimit: config.halfOpenLimit ?? DEFAULT_CONFIG.halfOpenLimit,
            maxEventHistory: config.maxEventHistory ?? DEFAULT_CONFIG.maxEventHistory,
            failurePredicate: config.failurePredicate ?? defaultFailurePredicate,
        };
    }

    // -------------------------------------------------------------------------
    // Public API – state queries
    // -------------------------------------------------------------------------

    /**
     * Returns the current state of the circuit breaker.
     *
     * Before returning, the method checks whether an **open** breaker's timeout
     * has elapsed and, if so, automatically transitions to **half-open**.
     */
    getState(): CircuitBreakerState {
        this.checkTimeout();
        return this.state;
    }

    /** Returns a snapshot of the current operational metrics. */
    getMetrics(): CircuitBreakerMetrics {
        const now = Date.now();
        return {
            totalRequests: this.totalRequests,
            totalSuccesses: this.totalSuccesses,
            totalFailures: this.totalFailures,
            blockedRequests: this.blockedRequests,
            consecutiveFailures: this.consecutiveFailures,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            lastFailureError: this.lastFailureError,
            stateChangeTime: this.stateChangeTime,
            uptime: now - this.stateChangeTime,
            successRate: this.totalRequests === 0 ? 1 : this.totalSuccesses / this.totalRequests,
        };
    }

    // -------------------------------------------------------------------------
    // Public API – manual control
    // -------------------------------------------------------------------------

    /**
     * Resets all counters and forces the breaker back to **closed**.
     * Primarily intended for testing and administrative operations.
     */
    reset(): void {
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
        this.halfOpenRequests = 0;
        this.totalRequests = 0;
        this.totalSuccesses = 0;
        this.totalFailures = 0;
        this.blockedRequests = 0;
        this.lastFailureTime = undefined;
        this.lastSuccessTime = undefined;
        this.lastFailureError = undefined;
        this.openedAt = undefined;
        this.transitionTo('closed');
    }

    /**
     * Manually forces the breaker into **closed** state without resetting
     * the accumulated metrics counters.
     */
    close(): void {
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
        this.halfOpenRequests = 0;
        this.openedAt = undefined;
        this.transitionTo('closed');
    }

    /**
     * Manually forces the breaker into **open** state.
     * The timeout countdown begins immediately.
     */
    open(): void {
        this.openedAt = Date.now();
        this.halfOpenRequests = 0;
        this.transitionTo('open');
    }

    // -------------------------------------------------------------------------
    // Public API – execution
    // -------------------------------------------------------------------------

    /**
     * Executes `fn` with circuit-breaker protection.
     *
     * - **Closed**: Runs `fn` normally; tracks success / failure.
     * - **Open**: Rejects immediately with {@link CircuitBreakerError}.
     * - **Half-open**: Runs `fn` up to `halfOpenLimit` concurrent requests;
     *   a success closes the breaker, a failure reopens it.
     *
     * @param fn      Async function to protect.
     * @param context Optional metadata attached to emitted events.
     * @returns       The resolved value of `fn`.
     * @throws        {@link CircuitBreakerError} if the breaker is open.
     * @throws        The original error from `fn` if it fails.
     */
    async execute<T>(fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
        this.checkTimeout();

        if (this.state === 'open') {
            this.blockedRequests++;
            throw new CircuitBreakerError(this.name, this.getMetrics());
        }

        if (this.state === 'half-open' && this.halfOpenRequests >= this.config.halfOpenLimit) {
            this.blockedRequests++;
            throw new CircuitBreakerError(this.name, this.getMetrics());
        }

        const isHalfOpen = this.state === 'half-open';
        // The check and increment are synchronous (no await between them) so
        // there is no concurrency window in the single-threaded JS runtime.
        if (isHalfOpen) {
            this.halfOpenRequests++;
        }

        this.totalRequests++;

        try {
            const result = await fn();
            this.onSuccess(result, context);
            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.onFailure(err, context);
            throw err;
        } finally {
            if (isHalfOpen) {
                this.halfOpenRequests = Math.max(0, this.halfOpenRequests - 1);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Event system
    // -------------------------------------------------------------------------

    /**
     * Registers a listener for the given event type.
     *
     * ```typescript
     * breaker.on('open', (metrics) => Logger.warn('Circuit opened', metrics));
     * breaker.on('success', (result, metrics) => { ... });
     * breaker.on('failure', (error, metrics) => { ... });
     * ```
     */
    on<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): this {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        (this.listeners[event] as Array<EventListener<EventMap[K]>>).push(listener);
        return this;
    }

    /**
     * Removes a previously registered listener.  If no listener is provided,
     * all listeners for that event type are removed.
     */
    off<K extends keyof EventMap>(event: K, listener?: EventListener<EventMap[K]>): this {
        if (!listener) {
            delete this.listeners[event];
            return this;
        }
        const list = this.listeners[event] as Array<EventListener<EventMap[K]>> | undefined;
        if (list) {
            this.listeners[event] = list.filter(l => l !== listener) as typeof list;
        }
        return this;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private checkTimeout(): void {
        if (this.state === 'open' && this.openedAt !== undefined) {
            const elapsed = Date.now() - this.openedAt;
            if (elapsed >= this.config.timeout) {
                this.halfOpenRequests = 0;
                this.consecutiveSuccesses = 0;
                this.transitionTo('half-open');
            }
        }
    }

    private onSuccess(result: unknown, context?: Record<string, unknown>): void {
        this.totalSuccesses++;
        this.lastSuccessTime = Date.now();
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses++;

        if (this.state === 'half-open' && this.consecutiveSuccesses >= this.config.successThreshold) {
            this.close();
        }

        const metrics = this.getMetrics();
        this.emit('success', result, metrics, context);
        this.recordEvent('success', metrics, context);

        Logger.debug(`[CircuitBreaker:${this.name}] success`, { state: this.state, context });
    }

    private onFailure(error: Error, context?: Record<string, unknown>): void {
        if (!this.config.failurePredicate(error)) {
            // This error type does not count as a circuit-breaking failure
            return;
        }

        this.totalFailures++;
        this.lastFailureTime = Date.now();
        this.lastFailureError = error;
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;

        const metrics = this.getMetrics();
        this.emit('failure', error, metrics, context);
        this.recordEvent('failure', metrics, context, error);

        Logger.warn(`[CircuitBreaker:${this.name}] failure`, {
            consecutiveFailures: this.consecutiveFailures,
            error: error.message,
            context,
        });

        if (this.state === 'half-open' || this.consecutiveFailures >= this.config.failureThreshold) {
            this.open();
        }
    }

    private transitionTo(newState: CircuitBreakerState): void {
        if (this.state === newState) return;

        const prevState = this.state;
        this.state = newState;
        this.stateChangeTime = Date.now();

        const metrics = this.getMetrics();

        if (newState === 'open') {
            this.emit('open', metrics);
            this.recordEvent('open', metrics);
            Logger.warn(`[CircuitBreaker:${this.name}] state: ${prevState} → open`, {
                consecutiveFailures: this.consecutiveFailures,
            });
        } else if (newState === 'closed') {
            this.emit('closed', metrics);
            this.recordEvent('closed', metrics);
            Logger.info(`[CircuitBreaker:${this.name}] state: ${prevState} → closed`);
        } else if (newState === 'half-open') {
            this.emit('half-open', metrics);
            this.recordEvent('half-open', metrics);
            Logger.info(`[CircuitBreaker:${this.name}] state: ${prevState} → half-open`);
        }
    }

    private emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): void {
        const list = this.listeners[event] as Array<EventListener<EventMap[K]>> | undefined;
        if (list) {
            for (const listener of list) {
                try {
                    listener(...args);
                } catch (err) {
                    Logger.error(`[CircuitBreaker:${this.name}] listener error for '${event}'`, {
                        error: String(err),
                    });
                }
            }
        }
    }

    private recordEvent(
        type: CircuitBreakerEvent['type'],
        metrics: CircuitBreakerMetrics,
        context?: Record<string, unknown>,
        error?: Error,
    ): void {
        if (this.config.maxEventHistory === 0) return;
        this.eventHistory.push({ type, timestamp: Date.now(), metrics, error, context });
        if (this.eventHistory.length > this.config.maxEventHistory) {
            this.eventHistory.shift();
        }
    }
}

// ---------------------------------------------------------------------------
// CircuitBreakerFactory
// ---------------------------------------------------------------------------

/**
 * Factory for creating and caching {@link CircuitBreaker} instances per
 * endpoint / service name.
 *
 * ## Usage
 *
 * ```typescript
 * const breaker = CircuitBreakerFactory.get('user-service', {
 *   failureThreshold: 3,
 * });
 *
 * // Retrieve the same instance later
 * const same = CircuitBreakerFactory.get('user-service');
 *
 * // Remove a specific breaker
 * CircuitBreakerFactory.clear('user-service');
 *
 * // Remove all breakers
 * CircuitBreakerFactory.clearAll();
 * ```
 */
export class CircuitBreakerFactory {
    private static readonly breakers = new Map<string, CircuitBreaker>();

    /**
     * Returns an existing {@link CircuitBreaker} for `name`, or creates a new
     * one with the supplied `config`.  Config is only applied when a new
     * instance is created; subsequent calls with the same `name` return the
     * cached instance regardless of `config`.
     */
    static get(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
        if (!CircuitBreakerFactory.breakers.has(name)) {
            CircuitBreakerFactory.breakers.set(name, new CircuitBreaker(name, config));
        }
        return CircuitBreakerFactory.breakers.get(name)!;
    }

    /**
     * Removes the cached breaker for `name`.  The next call to
     * {@link CircuitBreakerFactory.get} with the same name will create a fresh
     * instance.
     */
    static clear(name: string): void {
        CircuitBreakerFactory.breakers.delete(name);
    }

    /** Removes **all** cached circuit breakers. */
    static clearAll(): void {
        CircuitBreakerFactory.breakers.clear();
    }

    /**
     * Returns a map of all currently cached breaker instances, keyed by name.
     * Useful for monitoring dashboards and health-check endpoints.
     */
    static getAll(): Map<string, CircuitBreaker> {
        return new Map(CircuitBreakerFactory.breakers);
    }
}
