const maximumTrackedIdentities = 10_000;

export const rateLimitPolicies = {
  auth: {
    login: {
      windowMs: 15 * 60 * 1_000,
      maximumRequests: 10,
      maximumEntries: maximumTrackedIdentities,
    },
    register: {
      windowMs: 60 * 60 * 1_000,
      maximumRequests: 5,
      maximumEntries: maximumTrackedIdentities,
    },
  },
  ai: {
    user: {
      windowMs: 5 * 60 * 1_000,
      maximumRequests: 8,
      maximumEntries: maximumTrackedIdentities,
    },
    ip: {
      windowMs: 5 * 60 * 1_000,
      maximumRequests: 12,
      maximumEntries: maximumTrackedIdentities,
    },
    global: {
      windowMs: 60 * 1_000,
      maximumRequests: 60,
      maximumEntries: 1,
    },
  },
} as const;
