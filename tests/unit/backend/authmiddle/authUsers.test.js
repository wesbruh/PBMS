import { createSupabaseMock } from "../../../utils/backend/createSupabaseMock.js";
import { verifyToken } from "../../../../backend/authmiddle/authUsers.js";

// silence console.error during each test
let consoleSpy;
beforeEach(() => {
  consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => {
  consoleSpy.mockRestore();
});

const emptyMockSessions = [{ access_token: "" }, null, undefined];
const invalidMockSessions = [{ access_token: "12312" }, { access_token: "a" }];

const mockUser = {
  tableResults: { 
    User: {
      data: { UserRole: { Role: { name: "User" }}},
      error: null 
    }
  },
  authConfig: {
    session : { access_token: "123usertoken" },
    claims : { role: "authenticated", sub: "123userid" }
  }
}

const mockAdmin = {
  tableResults: { 
    User: {
      data: { UserRole: { Role: { name: "Admin" }}},
      error: null 
    }
  },  authConfig: {
    session : { access_token: "123admintoken" },
    claims : { role: "authenticated", sub: "123adminid" }
  }
}

const mockReq = (session) => {
  const req = {
    headers: { "authorization": `Bearer ${(session) ? session?.access_token : ""}` }
  };

  return req;
};

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("verifyToken", () => {
    test("verify that a JWT token could not be found", async () => {
    const supabaseClient = createSupabaseMock({}, {
      session: null,
      claims: null,
      error: null
    });

    const verify = verifyToken(supabaseClient);
    const { data: { session } }= await supabaseClient.auth.getSession();

    const mockedReq = mockReq(session);
    const mockedRes = mockRes();
    const mockedNext = jest.fn();

    await verify(mockedReq, mockedRes, mockedNext);
    expect(mockedRes.status).toHaveBeenCalledWith(401);
    expect(mockedRes.json).toHaveBeenCalledWith({
      message: "Access denied. No token provided.",
    });
    expect(mockedNext).not.toHaveBeenCalled();
  });

  test.each(emptyMockSessions)("verify that a JWT token is not passed in", async (session) => {
    const supabaseClient = createSupabaseMock({}, {
      claims: null
    });

    const verify = verifyToken(supabaseClient);
    const mockedReq = mockReq(session);
    const mockedRes = mockRes();
    const mockedNext = jest.fn();

    await verify(mockedReq, mockedRes, mockedNext);
    expect(mockedRes.status).toHaveBeenCalledWith(401);
    expect(mockedRes.json).toHaveBeenCalledWith({
      message: "Access denied. No token provided.",
    });
    expect(mockedNext).not.toHaveBeenCalled();
  });

  test.each(invalidMockSessions)("verify that an invalid JWT token is passed in", async (session) => {
    const supabaseClient = createSupabaseMock({}, {
      claims: null
    });

    const verify = verifyToken(supabaseClient);
    const mockedReq = mockReq(session);
    const mockedRes = mockRes();
    const mockedNext = jest.fn();

    await verify(mockedReq, mockedRes, mockedNext);
    expect(console.error).toHaveBeenCalled();

    expect(mockedRes.status).toHaveBeenCalledWith(403);
    expect(mockedRes.json).toHaveBeenCalledWith({
      message: "Invalid or expired token.",
    });
    expect(mockedNext).not.toHaveBeenCalled();
  });

  test.each(invalidMockSessions)("return on \"undefined\" access_token", async (session) => {
    const supabaseClient = createSupabaseMock({}, {
      claims: null
    });

    const verify = verifyToken(supabaseClient);
    const mockedReq = mockReq({ access_token: "undefined" });
    const mockedRes = mockRes();
    const mockedNext = jest.fn();

    await verify(mockedReq, mockedRes, mockedNext);

    expect(mockedRes.status).toHaveBeenCalledWith(403);
    expect(mockedRes.json).toHaveBeenCalledWith({
      message: "Invalid or expired token.",
    });
    expect(mockedNext).not.toHaveBeenCalled();
  });

  test("return on table select error", async () => {
    const supabaseClient = createSupabaseMock({
      User: {
        data: null,
        error: "Error"
      }
    }, {
      claims : { role: "authenticated", sub: "123userid" }
    });

    const verify = verifyToken(supabaseClient);
    const mockedReq = mockReq({ access_token: "123usertoken" });
    const mockedRes = mockRes();
    const mockedNext = jest.fn();

    await verify(mockedReq, mockedRes, mockedNext);
    expect(console.error).toHaveBeenCalled();

    expect(mockedRes.status).toHaveBeenCalledWith(403);
    expect(mockedRes.json).toHaveBeenCalledWith({
      message: "Invalid or expired token.",
    });
    expect(mockedNext).not.toHaveBeenCalled();
  });

  test("verify that an authenticated JWT token is passed in from a user", async () => {
    const supabaseClient = createSupabaseMock(mockUser.tableResults, mockUser.authConfig);
    
    const verify = verifyToken(supabaseClient);
    const { data: { session } }= await supabaseClient.auth.getSession();

    const mockedReq = mockReq(session);
    const mockedRes = mockRes();
    const mockedNext = jest.fn();

    await verify(mockedReq, mockedRes, mockedNext);

    expect(mockedReq.user).toEqual({
      id: mockUser.authConfig.claims.sub,
      role: { name: "User" }
    });
    expect(mockedNext).toHaveBeenCalled();
  });

  test("verify that an authenticated JWT token is passed in from an admin", async () => {
    const supabaseClient = createSupabaseMock(mockAdmin.tableResults, mockAdmin.authConfig);
    
    const verify = verifyToken(supabaseClient);
    const { data: { session } }= await supabaseClient.auth.getSession();

    const mockedReq = mockReq(session);
    const mockedRes = mockRes();
    const mockedNext = jest.fn();

    await verify(mockedReq, mockedRes, mockedNext);

    expect(mockedReq.user).toEqual({
      id: mockAdmin.authConfig.claims.sub,
      role: { name: "Admin" }
    });
    expect(mockedNext).toHaveBeenCalled();
  });
});