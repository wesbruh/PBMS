import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { formatDate, formatTime, parseTimestamp } from "../../_shared/utils.ts";

/* NOTE
// HTTP method and validation endpoint tests (405, 400, etc.) are not included here
// because they require the edge function to be served locally via
// 'supabase functions serve' before running, which adds complexity and prevents
// tests from being self-contained. These behaviors are instead verified manually
// using Invoke-RestMethod in PowerShell against the locally served function.*/

/* EXAMPLE: if your on PowerShell, copy and paste this in the terminal but change to a REAL admin email and change to URL of an image
$body = @{
     adminEmail = "test@email.com"
     clientName = "testname"
     clientEmail = "test@example.com"
     clientPhone = "(707) 555-0100"
     startAt = "2026-04-26T17:00:00+00"
     endAt = "2026-04-26T19:00:00+00"
     sessionType = "Wedding"
     notes = "Testing admin booking email"
 } | ConvertTo-Json
 
 Invoke-RestMethod `
     -Uri "http://localhost:54321/functions/v1/send-admin-new-booking-email" `
     -Method POST `
     -Headers @{
         "Content-Type"  = "application/json"
         "Authorization" = "Bearer YOUR_ANON_KEY"
     } `
     -Body $body
*/

// helpers

function getValidBody() {
    return {
        adminEmail: "admin@example.com",
        clientName: "Jane Doe",
        clientEmail: "jane@example.com",
        clientPhone: "(707) 555-0100",
        startAt: "2026-04-03T17:00:00+00",
        endAt: "2026-04-03T19:00:00+00",
        location: "Sacramento, CA",
        sessionType: "Wedding",
        notes: "Test notes",
    };
}

function validateBody(body: Record<string, unknown>): string[] {
    const missingFields: string[] = [];
    if (!body.adminEmail) missingFields.push("adminEmail");
    if (!body.clientName) missingFields.push("clientName");
    if (!body.clientEmail) missingFields.push("clientEmail");
    if (!body.startAt) missingFields.push("startAt");
    if (!body.endAt) missingFields.push("endAt");
    if (!body.sessionType) missingFields.push("sessionType");
    return missingFields;
}

// 5 tests, 22 steps

describe("1. admin booking email - date formatting", () => {
    it("should format session date from startAt timestamp", () => {
        assertEquals(formatDate("2026-04-03T17:00:00+00"), "April 03, 2026");
    });

    it("should roll back date when UTC crosses midnight into previous Pacific day", () => {
        assertEquals(formatDate("2026-04-04T05:00:00+00"), "April 03, 2026");
    });

    it("should handle PST date (winter)", () => {
        assertEquals(formatDate("2026-01-15T18:00:00+00"), "January 15, 2026");
    });

    it("should handle PDT date (summer)", () => {
        assertEquals(formatDate("2026-07-15T17:00:00+00"), "July 15, 2026");
    });
});

describe("2. admin booking email - time formatting", () => {
    it("should format session time as start - end range", () => {
        const result = `${formatTime("2026-04-03T17:00:00+00")} - ${formatTime("2026-04-03T19:00:00+00")}`;
        assertEquals(result, "10:00 AM - 12:00 PM");
    });

    it("should handle AM to PM range", () => {
        const result = `${formatTime("2026-04-03T16:00:00+00")} - ${formatTime("2026-04-03T20:00:00+00")}`;
        assertEquals(result, "9:00 AM - 1:00 PM");
    });

    it("should handle PST time (winter, UTC-8)", () => {
        assertEquals(formatTime("2026-01-15T18:00:00+00"), "10:00 AM");
    });

    it("should handle PDT time (summer, UTC-7)", () => {
        assertEquals(formatTime("2026-07-15T17:00:00+00"), "10:00 AM");
    });
});

describe("3. admin booking email - parseTimestamp", () => {
    it("should normalize +00 offset", () => {
        const d = parseTimestamp("2026-04-03T17:00:00+00");
        assertEquals(isNaN(d.getTime()), false);
    });

    it("should handle Z suffix", () => {
        const d = parseTimestamp("2026-04-03T17:00:00Z");
        assertEquals(isNaN(d.getTime()), false);
    });

    it("should handle full +00:00 format", () => {
        const d = parseTimestamp("2026-04-03T17:00:00+00:00");
        assertEquals(isNaN(d.getTime()), false);
    });
});

describe("4. admin booking email - validation", () => {
    it("should pass with all required fields present", () => {
        const missing = validateBody(getValidBody());
        assertEquals(missing.length, 0);
    });

    it("should catch missing adminEmail", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).adminEmail;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "adminEmail");
    });

    it("should catch missing clientName", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).clientName;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "clientName");
    });

    it("should catch missing clientEmail", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).clientEmail;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "clientEmail");
    });

    it("should catch missing startAt", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).startAt;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "startAt");
    });

    it("should catch missing endAt", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).endAt;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "endAt");
    });

    it("should catch missing sessionType", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).sessionType;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "sessionType");
    });

    it("should catch multiple missing fields at once", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).adminEmail;
        delete (body as Record<string, unknown>).clientName;
        delete (body as Record<string, unknown>).startAt;
        const missing = validateBody(body);
        assertEquals(missing.length, 3);
    });
});

describe("5. admin booking email - optional fields", () => {
    it("should allow missing clientPhone", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).clientPhone;
        const missing = validateBody(body);
        assertEquals(missing.length, 0);
    });

    it("should allow missing location", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).location;
        const missing = validateBody(body);
        assertEquals(missing.length, 0);
    });

    it("should allow missing notes", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).notes;
        const missing = validateBody(body);
        assertEquals(missing.length, 0);
    });
});