export interface FixedWindowRateLimitOptions {
  windowMs: number;
  maximumRequests: number;
  maximumEntries: number;
  cleanupIntervalMs?: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  resetAt: number;
  retryAfterSeconds: number;
}

export interface RateLimitSubject {
  key: string;
  limiter: InMemoryFixedWindowRateLimiter;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class InMemoryFixedWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();
  private readonly cleanupIntervalMs: number;
  private nextCleanupAt = 0;

  constructor(
    private readonly options: FixedWindowRateLimitOptions,
  ) {
    assertPositiveInteger(options.windowMs, "windowMs");
    assertPositiveInteger(
      options.maximumRequests,
      "maximumRequests",
    );
    assertPositiveInteger(
      options.maximumEntries,
      "maximumEntries",
    );

    const cleanupIntervalMs =
      options.cleanupIntervalMs ??
      Math.min(options.windowMs, 60_000);

    assertPositiveInteger(
      cleanupIntervalMs,
      "cleanupIntervalMs",
    );

    this.cleanupIntervalMs = cleanupIntervalMs;
  }

  inspect(
    key: string,
    now = Date.now(),
  ): RateLimitDecision {
    this.maybeCleanup(now);

    const current = this.entries.get(key);

    if (current && current.resetAt <= now) {
      this.entries.delete(key);
    }

    const activeEntry = this.entries.get(key);

    if (!activeEntry) {
      if (this.entries.size >= this.options.maximumEntries) {
        this.cleanupExpired(now);
      }

      if (this.entries.size >= this.options.maximumEntries) {
        return createBlockedDecision(
          this.findEarliestResetAt(now),
          now,
        );
      }

      return createAllowedDecision(
        now + this.options.windowMs,
      );
    }

    if (activeEntry.count >= this.options.maximumRequests) {
      return createBlockedDecision(activeEntry.resetAt, now);
    }

    return createAllowedDecision(activeEntry.resetAt);
  }

  recordAllowedRequest(key: string, now = Date.now()) {
    const current = this.entries.get(key);

    if (!current || current.resetAt <= now) {
      this.entries.set(key, {
        count: 1,
        resetAt: now + this.options.windowMs,
      });
      return;
    }

    current.count += 1;
  }

  consume(
    key: string,
    now = Date.now(),
  ): RateLimitDecision {
    const decision = this.inspect(key, now);

    if (decision.allowed) {
      this.recordAllowedRequest(key, now);
    }

    return decision;
  }

  cleanupExpired(now = Date.now()) {
    let removedEntries = 0;

    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key);
        removedEntries += 1;
      }
    }

    this.nextCleanupAt = now + this.cleanupIntervalMs;
    return removedEntries;
  }

  clear() {
    this.entries.clear();
    this.nextCleanupAt = 0;
  }

  get size() {
    return this.entries.size;
  }

  private maybeCleanup(now: number) {
    if (now >= this.nextCleanupAt) {
      this.cleanupExpired(now);
    }
  }

  private findEarliestResetAt(now: number) {
    let earliestResetAt = Number.POSITIVE_INFINITY;

    for (const entry of this.entries.values()) {
      earliestResetAt = Math.min(
        earliestResetAt,
        entry.resetAt,
      );
    }

    return Number.isFinite(earliestResetAt)
      ? earliestResetAt
      : now + this.cleanupIntervalMs;
  }
}

export function consumeRateLimits(
  subjects: RateLimitSubject[],
  now = Date.now(),
): RateLimitDecision {
  const decisions = subjects.map(({ key, limiter }) => ({
    decision: limiter.inspect(key, now),
    key,
    limiter,
  }));

  const blockedDecisions = decisions.filter(
    ({ decision }) => !decision.allowed,
  );

  if (blockedDecisions.length > 0) {
    return blockedDecisions.reduce(
      (mostRestrictive, current) =>
        current.decision.retryAfterSeconds >
        mostRestrictive.decision.retryAfterSeconds
          ? current
          : mostRestrictive,
    ).decision;
  }

  for (const { key, limiter } of decisions) {
    limiter.recordAllowedRequest(key, now);
  }

  const latestResetAt = decisions.reduce(
    (resetAt, current) =>
      Math.max(resetAt, current.decision.resetAt),
    now,
  );

  return createAllowedDecision(latestResetAt);
}

function createAllowedDecision(
  resetAt: number,
): RateLimitDecision {
  return {
    allowed: true,
    resetAt,
    retryAfterSeconds: 0,
  };
}

function createBlockedDecision(
  resetAt: number,
  now: number,
): RateLimitDecision {
  return {
    allowed: false,
    resetAt,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((resetAt - now) / 1_000),
    ),
  };
}

function assertPositiveInteger(
  value: number,
  name: string,
) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} deve ser um inteiro positivo.`);
  }
}
