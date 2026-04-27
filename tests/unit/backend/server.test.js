describe("backend/server.js", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    delete process.env.PORT;
    process.env.NODE_ENV = "test";
  });

  test("builds the app, resolves the port, and starts listening", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const { buildServerApp, getServerPort, startServer } = await import(
      "../../../backend/server.js"
    );
    const listen = jest.fn((port, callback) => callback());
    const app = { listen };

    expect(buildServerApp()).toBeDefined();
    expect(getServerPort()).toBe(5001);
    expect(getServerPort({ PORT: "6123" })).toBe("6123");
    expect(getServerPort({})).toBe(5001);

    startServer({ app, port: "6123" });

    expect(listen).toHaveBeenCalledWith("6123", expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith("HTTP Server running on 6123.");
  });
});
