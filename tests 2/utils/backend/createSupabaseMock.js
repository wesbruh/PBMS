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

export function createSupabaseMock(tableResults = {}) {
  return {
    from: jest.fn((tableName) => createQueryBuilder(tableResults[tableName])),
  };
}
