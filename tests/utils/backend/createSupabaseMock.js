function createQueryBuilder(result = {}) {
  const builder = {
    data: result.data ?? null,
    error: result.error ?? null,
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    lte: jest.fn(() => builder),
    single: jest.fn(() => builder),
    maybeSingle: jest.fn(() => builder),
  };

  return builder;
}

function createAuthBuilder({ session = null, claims = null, signup = null, error = null } = {}) {
  return {
    signInWithPassword: jest.fn().mockResolvedValue({
      data: {
        user: session?.user ?? null,
        session: session ?? null,
      },
      error: error ?? null
    }),

    getSession: jest.fn().mockResolvedValue({
      data: { session },
      error: error ?? null,
    }),

    getClaims: jest.fn().mockResolvedValue({
      data: (claims) ? { claims } : null,
      error: error ?? null,
    }),

    signUp: jest.fn().mockResolvedValue({
      data: (signup) ? { user: signup.User, session: null } : null,
      error: error ?? null,
    }),
  };
}

export function createSupabaseMock(tableResults = {}, authConfig = {}) {
  return {
    from: jest.fn((tableName) =>
      createQueryBuilder(tableResults[tableName])
    ),
    auth: createAuthBuilder(authConfig),
  };
}