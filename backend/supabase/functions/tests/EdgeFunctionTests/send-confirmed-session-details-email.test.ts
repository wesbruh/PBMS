import { assertEquals, assertStringIncludes} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { parseTimestamp, formatDate, formatTime } from "../../_shared/utils.ts";

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
     endAt = "2026-04-03T19:00:00+00"                     
     oldStartAt = "2026-04-03T15:00:00+00"              
     oldEndAt = "2026-04-03T17:00:00+00"         
     newLocation = "Sacramento, CA"
     oldLocation = "Davis, CA"
     sessionType = "Wedding"
     status = "Confirmed"                                             
     notes = "Testing notes"
     URL = "http://localhost:5173"
 } | ConvertTo-Json                          
                                                 
 Invoke-RestMethod `
     -Uri "http://localhost:54321/functions/v1/send-confirmed-session-details-email" `
     -Method POST `
     -Headers @{
         "Content-Type"  = "application/json"
         "Authorization" = "Bearer YOUR_ANON_KEY"
     } `
     -Body $body
*/ 

// test helpers

function getValidBody() {
    return {
        email: "test@example.com",
        name: "Test User",
        startAt: "2026-04-26T17:00:00+00",
        endAt: "2026-04-26T19:00:00+00",
        newLocation: "Sacramento, CA",
        sessionType: "Wedding",
        URL: "http://localhost:5173",
        oldStartAt: "2026-04-26T15:00:00+00",
        oldEndAt: "2026-04-26T17:00:00+00",
        oldLocation: "Davis, CA",
        status: "Confirmed",
        notes: "Test notes",
    };
}

function validateBody(body: Record<string, unknown>): string[] {
    const missingFields: string[] = [];
    if (!body.URL) missingFields.push("URL");
    if (!body.email) missingFields.push("email");
    if (!body.name) missingFields.push("name");
    if (!body.startAt) missingFields.push("startAt");
    if (!body.endAt) missingFields.push("endAt");
    if (!body.newLocation) missingFields.push("newLocation");
    if (!body.sessionType) missingFields.push("sessionType");
    return missingFields;
}

// 6 tests, 33 steps

describe("1. parseTimestamp", () => {
    it("should normalize +00 to +00:00 and return a valid Date", () => {
        const d = parseTimestamp("2026-04-03T17:00:00+00");
        assertEquals(d instanceof Date, true);
        assertEquals(isNaN(d.getTime()), false);
    });

    it("should handle full +00:00 format", () => {
        const d = parseTimestamp("2026-04-03T17:00:00+00:00");
        assertEquals(isNaN(d.getTime()), false);
    });

    it("should handle Z suffix", () => {
        const d = parseTimestamp("2026-04-03T17:00:00Z");
        assertEquals(isNaN(d.getTime()), false);
    });

    it("should handle positive offset +05", () => {
        const d = parseTimestamp("2026-04-03T17:00:00+05");
        assertEquals(isNaN(d.getTime()), false);
    });

    it("should handle negative offset -07", () => {
        const d = parseTimestamp("2026-04-03T10:00:00-07");
        assertEquals(isNaN(d.getTime()), false);
    });
});

describe("2. formatDate", () => {
    it("should convert UTC to Pacific date", () => {
        assertEquals(formatDate("2026-04-03T17:00:00+00"), "April 03, 2026");
    });

    it("should roll back date when UTC crosses midnight into previous Pacific day", () => {
        assertEquals(formatDate("2026-04-04T05:00:00+00"), "April 03, 2026");
    });

    it("should handle exactly midnight UTC", () => {
        assertEquals(formatDate("2026-04-04T00:00:00+00"), "April 03, 2026");
    });

    it("should handle year boundary rollback", () => {
        assertEquals(formatDate("2026-01-01T03:00:00+00"), "December 31, 2025");
    });

    it("should format PST date correctly (winter)", () => {
        assertEquals(formatDate("2026-01-15T18:00:00+00"), "January 15, 2026");
    });

    it("should format PDT date correctly (summer)", () => {
        assertEquals(formatDate("2026-07-15T17:00:00+00"), "July 15, 2026");
    });
});

describe("3. formatTime", () => {
    it("should convert UTC afternoon to Pacific morning", () => {
        assertEquals(formatTime("2026-04-03T17:00:00+00"), "10:00 AM");
    });

    it("should convert UTC evening to Pacific noon", () => {
        assertEquals(formatTime("2026-04-03T19:00:00+00"), "12:00 PM");
    });

    it("should convert UTC midnight to Pacific evening", () => {
        assertEquals(formatTime("2026-04-04T00:00:00+00"), "5:00 PM");
    });

    it("should convert UTC noon to Pacific early morning", () => {
        assertEquals(formatTime("2026-04-03T12:00:00+00"), "5:00 AM");
    });

    it("should handle midnight Pacific (12:00 AM)", () => {
        assertEquals(formatTime("2026-04-03T07:00:00+00"), "12:00 AM");
    });

    it("should use PST offset (UTC-8) in winter", () => {
        assertEquals(formatTime("2026-01-15T18:00:00+00"), "10:00 AM");
    });

    it("should use PDT offset (UTC-7) in summer", () => {
        assertEquals(formatTime("2026-07-15T17:00:00+00"), "10:00 AM");
    });
});

describe("4. time range formatting", () => {
    it("should format start and end times separated by a dash", () => {
        const result = `${formatTime("2026-04-03T17:00:00+00")} - ${formatTime("2026-04-03T19:00:00+00")}`;
        assertEquals(result, "10:00 AM - 12:00 PM");
    });

    it("should handle AM to PM range", () => {
        const result = `${formatTime("2026-04-03T16:00:00+00")} - ${formatTime("2026-04-03T20:00:00+00")}`;
        assertEquals(result, "9:00 AM - 1:00 PM");
    });
});

describe("5. change detection", () => {
    it("should detect when time has changed", () => {
        const newSessionTime = `${formatTime("2026-04-03T17:00:00+00")} - ${formatTime("2026-04-03T19:00:00+00")}`;
        const oldSessionTime = `${formatTime("2026-04-03T15:00:00+00")} - ${formatTime("2026-04-03T17:00:00+00")}`;

        assertEquals(newSessionTime, "10:00 AM - 12:00 PM");
        assertEquals(oldSessionTime, "8:00 AM - 10:00 AM");
        assertEquals(oldSessionTime !== newSessionTime, true);
    });

    it("should detect no change when times match", () => {
        const start = "2026-04-03T17:00:00+00";
        const end = "2026-04-03T19:00:00+00";
        const newSessionTime = `${formatTime(start)} - ${formatTime(end)}`;
        const oldSessionTime = `${formatTime(start)} - ${formatTime(end)}`;

        assertEquals(oldSessionTime === newSessionTime, true);
    });

    it("should detect when location has changed", () => {
        const oldLocation: string = "Davis, CA";
        const newLocation: string = "Sacramento, CA";
        assertEquals(oldLocation !== newLocation, true);
    });

    it("should detect no change when locations match", () => {
        const oldLocation: string = "Sacramento, CA";
        const newLocation: string = "Sacramento, CA";
        assertEquals(oldLocation === newLocation, true);
    });

    it("should treat null old values as no change", () => {
        const oldStartAt = null;
        const oldEndAt = null;
        const oldSessionTime = oldStartAt && oldEndAt
            ? `${formatTime(oldStartAt)} - ${formatTime(oldEndAt)}`
            : null;

        assertEquals(oldSessionTime, null);

        const timeChanged = oldSessionTime && oldSessionTime !== "10:00 AM - 12:00 PM";
        assertEquals(!!timeChanged, false);
    });
});

describe("6. validation", () => {
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

    it("should catch missing URL", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).URL;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "URL");
    });

    it("should catch missing sessionType", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).sessionType;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "sessionType");
    });

    it("should catch missing newLocation", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).newLocation;
        const missing = validateBody(body);
        assertStringIncludes(missing.join(", "), "newLocation");
    });

    it("should catch multiple missing fields at once", () => {
        const body = { ...getValidBody() };
        delete (body as Record<string, unknown>).email;
        delete (body as Record<string, unknown>).name;
        delete (body as Record<string, unknown>).startAt;
        const missing = validateBody(body);
        assertEquals(missing.length, 3);
    });
});