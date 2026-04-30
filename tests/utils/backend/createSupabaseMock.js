let callCounters = {};

function createQueryBuilder(tableResult = {}, tableName = null) {
  let result;

  if (Object.hasOwn(callCounters, tableName)) {
    result = tableResult[callCounters[tableName]];
    callCounters[tableName] = callCounters[tableName] + 1;
  } else {
    result = tableResult;
  }

  const builder = {
    _selectCalled: false,
    _deleteCalled: false,
    select: jest.fn(() => {
      builder._selectCalled = true;
      return builder;
    }),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
    delete: jest.fn(() => {
      builder._deleteCalled = true;
      return builder;
    }),
    is: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    lte: jest.fn(() => builder),
    order: jest.fn(() => builder),
    single: jest.fn(() => builder),
    maybeSingle: jest.fn(() => builder),
    neq: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    lt: jest.fn(() => builder),

    then: (resolve) => {
      const resolvePayload = { error: result.error ?? null }

      if (builder._deleteCalled === true) {
        resolvePayload.status = result.status ?? null;
      }

      if (builder._selectCalled === true) {
        resolvePayload.data = result.data ?? null;
      }

      return resolve(resolvePayload);
    }
  };

  return builder;
}

function createStorageQueryBuilder(result = {}) {
  const builder = {
    _uploadCalled: false,
    _pubURLCalled: false,
    upload: jest.fn(() => {
      builder._uploadCalled = true;
      return builder;
    }),
    getPublicUrl: jest.fn(() => {
      builder._pubURLCalled = true;
      return builder;
    }),

    then: (resolve) => {
      if (builder._uploadCalled === true) {
        return resolve({
          data: result.uploadData ?? null,
          error: result.uploadError ?? null
        });
      }

      if (builder._pubURLCalled === true) {
        return resolve({
          data: result.urlData ?? null,
          error: result.urlError ?? null
        });
      }

      return resolve({ error: result.uploadError ?? result.urlError ?? null })
    }
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

export function createSupabaseMock(tableResults = {}, authConfig = {}, allowMultiple = false) {
  callCounters = {};

  return {
    from: jest.fn((tableName) => {
      if (allowMultiple)
        callCounters[tableName] = callCounters[tableName] ?? 0;

      return createQueryBuilder(tableResults[tableName], tableName);
    }),
    storage: {
      from: jest.fn((tableName) =>
        createStorageQueryBuilder(tableResults[tableName])
      )
    },
    auth: createAuthBuilder(authConfig),
  };
}