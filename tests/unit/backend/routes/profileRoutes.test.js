import profileRoutes from "../../../../backend/routes/profileRoutes.js";

function createProfileSupabase({ listResult, singleResult, updateResult } = {}) {
  return {
    from: jest.fn(() => ({
      select: jest.fn((query) => {
        if (query.includes("UserRole")) {
          return {
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue(singleResult ?? { data: null, error: null }),
            })),
          };
        }

        return Promise.resolve(listResult ?? { data: [], error: null });
      }),
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue(updateResult ?? { error: null }),
      })),
    })),
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function getRouteHandler(router, method, path) {
  return router.stack.find(
    (layer) => layer.route?.path === path && layer.route.methods[method]
  ).route.stack[0].handle;
}

describe("profileRoutes", () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test("returns all users", async () => {
    const router = profileRoutes(
      createProfileSupabase({
        listResult: {
          data: [{ id: "user-1", email: "one@example.com" }],
          error: null,
        },
      })
    );
    const handler = getRouteHandler(router, "get", "");
    const res = createResponse();

    await handler({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: "user-1", email: "one@example.com" }]);
  });

  test("returns a normalized user profile with role name", async () => {
    const router = profileRoutes(
      createProfileSupabase({
        singleResult: {
          data: {
            id: "user-2",
            email: "two@example.com",
            first_name: "Two",
            last_name: "User",
            phone: "555-0102",
            UserRole: { Role: { name: "Admin" } },
          },
          error: null,
        },
      })
    );
    const handler = getRouteHandler(router, "get", "/:user_id");
    const res = createResponse();

    await handler({ params: { user_id: "user-2" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      id: "user-2",
      email: "two@example.com",
      first_name: "Two",
      last_name: "User",
      phone: "555-0102",
      role_name: "Admin",
    });
  });

  test("returns null when a specific user is missing", async () => {
    const router = profileRoutes(
      createProfileSupabase({
        singleResult: { data: null, error: null },
      })
    );
    const handler = getRouteHandler(router, "get", "/:user_id");
    const res = createResponse();

    await handler({ params: { user_id: "missing" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ role_name: null });
  });

  test("updates a user profile", async () => {
    const router = profileRoutes(
      createProfileSupabase({
        updateResult: { error: null },
      })
    );
    const handler = getRouteHandler(router, "patch", "/:user_id");
    const res = createResponse();

    await handler(
      { params: { user_id: "user-3" }, body: { first_name: "Updated" } },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  test("handles list, single, and update failures", async () => {
    const listHandler = getRouteHandler(
      profileRoutes(
        createProfileSupabase({
          listResult: { data: null, error: { message: "boom" } },
        })
      ),
      "get",
      ""
    );
    const singleHandler = getRouteHandler(
      profileRoutes(
        createProfileSupabase({
          singleResult: { data: null, error: new Error("single failed") },
        })
      ),
      "get",
      "/:user_id"
    );
    const updateHandler = getRouteHandler(
      profileRoutes(
        createProfileSupabase({
          updateResult: { error: new Error("update failed") },
        })
      ),
      "patch",
      "/:user_id"
    );
    const listRes = createResponse();
    const singleRes = createResponse();
    const updateRes = createResponse();

    await listHandler({}, listRes);
    await singleHandler({ params: { user_id: "user-4" } }, singleRes);
    await updateHandler(
      { params: { user_id: "user-4" }, body: { phone: "555-0104" } },
      updateRes
    );

    expect(listRes.statusCode).toBe(500);
    expect(singleRes.statusCode).toBe(500);
    expect(updateRes.statusCode).toBe(500);
    expect(errorSpy).toHaveBeenCalled();
  });
});
