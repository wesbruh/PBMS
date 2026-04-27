import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { formatDate, formatTime, parseTimestamp } from "../../_shared/utils.ts";

/* NOTE
// HTTP method and validation endpoint tests (405, 400, etc.) are not included here
// because they require the edge function to be served locally via
// 'supabase functions serve' before running, which adds complexity and prevents
// tests from being self-contained. These behaviors are instead verified manually
// using Invoke-RestMethod in PowerShell against the locally served function.*/

/* EXAMPLE: if your on PowerShell, copy and paste this in the terminal but change to a REAL email and change to URL of an image
$body = @{
     email = "test@email.com"
     name = "testname"
     startAt = "2026-04-03T17:00:00+00"
     URL = "http://localhost:5173/gallery/abc123"
     coverPhotoUrl = "https://testimage"
     personalizedMessage = "Test message"
 } | ConvertTo-Json
 
 Invoke-RestMethod `
     -Uri "http://localhost:54321/functions/v1/send-gallery-upload-email" `
     -Method POST `
     -Headers @{
         "Content-Type" = "application/json"
         "Authorization" = "Bearer YOUR_ANON_KEY"
     } `
     -Body $body
*/ 

// helpers
function getValidBody() {
    return {
        email: "test@example.com",
        name: "Test User",
        startAt: "2026-04-24T17:00:00+00",
        URL: "http://localhost:5173/gallery/abc123",
        coverPhotoUrl: "https://example.com/photo.jpg",
        personalizedMessage: "test message",
    };
}

function validateBody(body: Record<string, unknown>): string[] {
    const missingFields: string[] = [];
    if (!body.email) missingFields.push("email");
    if (!body.URL) missingFields.push("URL");
    if (!body.startAt) missingFields.push("startAt");
    return missingFields;
}

// 3 tests, 12 steps

describe("1. gallery email - date formatting", () => {
    it("should format session date from startAt timestamp", () => {
        const result = formatDate("2026-04-03T17:00:00+00");
        assertEquals(result, "April 03, 2026");
    });

    it("should handle winter PST date", () => {
        const result = formatDate("2026-01-15T18:00:00+00");
        assertEquals(result, "January 15, 2026");
    });

    it("should handle summer PDT date", () => {
        const result = formatDate("2026-07-15T17:00:00+00");
        assertEquals(result, "July 15, 2026");
    });

    it("should roll back date when UTC crosses midnight into previous Pacific day", () => {
        assertEquals(formatDate("2026-04-04T05:00:00+00"), "April 03, 2026");
    });
});

describe("2. gallery email - validation", () => {
    it("should pass with all required fields present", () => {
        const missing = validateBody(getValidBody());
        assertEquals(missing.length, 0);
    });

    it("should catch missing email", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).email;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "email");
    });

    it("should catch missing URL", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).URL;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "URL");
    });

    it("should catch missing startAt", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).startAt;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "startAt");
    });

    it("should catch multiple missing fields at once", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).email;
        delete (body as Record<string, unknown>).URL;
        delete (body as Record<string, unknown>).startAt;
        const missing = validateBody(body);
        assertEquals(missing.length, 3);
    });
});

describe("3. gallery email - optional fields", () => {
    it("should allow missing coverPhotoUrl", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).coverPhotoUrl;
        const missing = validateBody(body);
        assertEquals(missing.length, 0);
    });

    it("should allow missing personalizedMessage", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).personalizedMessage;
        const missing = validateBody(body);
        assertEquals(missing.length, 0);
    });

    it("should allow missing name (optional for validation)", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).name;
        const missing = validateBody(body);
        assertEquals(missing.length, 0);
    });


});

describe("4. gallery email - shared utils coverage", () => {
    it("should parse timestamp with +00 offset", () => {
        const d = parseTimestamp("2026-04-03T17:00:00+00");
        assertEquals(isNaN(d.getTime()), false);
    });

    it("should format time from timestamp", () => {
        assertEquals(formatTime("2026-04-03T17:00:00+00"), "10:00 AM");
    });
});
