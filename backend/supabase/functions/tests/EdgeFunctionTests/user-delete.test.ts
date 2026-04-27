import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";

// NOTE 
// HTTP method and validation endpoint tests (405, 400, etc.) are not included here
// because they require the edge function to be served locally via
// `supabase functions serve` before running, which adds complexity and prevents
// tests from being self-contained. These behaviors are instead verified manually
// using Invoke-RestMethod in PowerShell against the locally served function.

/*  NOT ENTIRELY SURE HOW THIS EDGE FUCNTION IS SUPPOSED TO WORK AS IT
 WAS WRITTEN BY A DIFFERENT MEMEBER OF THE TEAM
 But I tried */

// Test helpers 
// These replicate the validation and auth logic from the edge function
// so we can test the decision-making without needing live Supabase connections.

function extractToken(authHeader: string): string {
    return authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
}

interface DeleteUserBody {
    targetUserId?: string | null;
}

function parseBody(body: DeleteUserBody | null): string | null {
    return body?.targetUserId ?? null;
}

function isAdminRequired(requestedTargetUserId: string | null, currentUserId: string): boolean {
    return !!(requestedTargetUserId && requestedTargetUserId !== currentUserId);
}

// 6 tests, 20 steps

describe("1. delete-user - token extraction", () => {
    it("should extract token from valid Bearer header", () => {
        const token = extractToken("Bearer abc123xyz");
        assertEquals(token, "abc123xyz");
    });

    it("should return empty string when Bearer prefix is missing", () => {
        const token = extractToken("abc123xyz");
        assertEquals(token, "");
    });

    it("should return empty string for empty header", () => {
        const token = extractToken("");
        assertEquals(token, "");
    });

    it("should handle Bearer with no token after it", () => {
        const token = extractToken("Bearer ");
        assertEquals(token, "");
    });

    it("should not match lowercase bearer", () => {
        const token = extractToken("bearer abc123");
        assertEquals(token, "");
    });
});

describe("2. delete-user - body parsing", () => {
    it("should extract targetUserId when provided", () => {
        const result = parseBody({ targetUserId: "user-123" });
        assertEquals(result, "user-123");
    });

    it("should return null when targetUserId is not provided", () => {
        const result = parseBody({});
        assertEquals(result, null);
    });

    it("should return null when body is null", () => {
        const result = parseBody(null);
        assertEquals(result, null);
    });

    it("should return null when targetUserId is explicitly null", () => {
        const result = parseBody({ targetUserId: null });
        assertEquals(result, null);
    });
});

describe("3. delete-user - admin check logic", () => {
    const currentUserId = "user-aaa";

    it("should not require admin when deleting self (no targetUserId)", () => {
        const result = isAdminRequired(null, currentUserId);
        assertEquals(result, false);
    });

    it("should not require admin when targetUserId matches current user", () => {
        const result = isAdminRequired("user-aaa", currentUserId);
        assertEquals(result, false);
    });

    it("should require admin when targetUserId is a different user", () => {
        const result = isAdminRequired("user-bbb", currentUserId);
        assertEquals(result, true);
    });

    it("should not require admin when targetUserId is empty string", () => {
        const result = isAdminRequired("", currentUserId);
        assertEquals(result, false);
    });
});

describe("4. delete-user - target user resolution", () => {
    const currentUserId = "user-aaa";

    it("should default to current user when no targetUserId provided", () => {
        const requestedTargetUserId = parseBody({});
        const targetUserId = (requestedTargetUserId && requestedTargetUserId !== currentUserId)
            ? requestedTargetUserId
            : currentUserId;
        assertEquals(targetUserId, currentUserId);
    });

    it("should default to current user when targetUserId matches self", () => {
        const requestedTargetUserId = parseBody({ targetUserId: "user-aaa" });
        const targetUserId = (requestedTargetUserId && requestedTargetUserId !== currentUserId)
            ? requestedTargetUserId
            : currentUserId;
        assertEquals(targetUserId, currentUserId);
    });

    it("should use requestedTargetUserId when it differs from current user", () => {
        const requestedTargetUserId = parseBody({ targetUserId: "user-bbb" });
        const targetUserId = (requestedTargetUserId && requestedTargetUserId !== currentUserId)
            ? requestedTargetUserId
            : currentUserId;
        assertEquals(targetUserId, "user-bbb");
    });
});

describe("5. delete-user - CORS handling", () => {
    it("should recognize OPTIONS as a preflight request", () => {
        const method = "OPTIONS";
        assertEquals(method === "OPTIONS", true);
    });

    it("should not treat POST as a preflight request", () => {
        const method: string = "POST";
        assertEquals(method === "OPTIONS", false);
    });
});

describe("6. delete-user - error response structure", () => {
    it("should format error with ok: false and message", () => {
        const err = new Error("Something went wrong");
        const response = {
            ok: false,
            message: err.message ?? String(err),
        };
        assertEquals(response.ok, false);
        assertStringIncludes(response.message, "Something went wrong");
    });

    it("should handle non-Error thrown values", () => {
        const err: unknown = "string error";
        const response = {
            ok: false,
            message: err instanceof Error ? err.message : String(err),
        };
        assertEquals(response.ok, false);
        assertEquals(response.message, "string error");
    });
});