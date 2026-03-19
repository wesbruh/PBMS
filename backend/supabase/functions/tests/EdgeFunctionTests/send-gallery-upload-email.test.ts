import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FUNCTION_URL = "http://localhost:54321/functions/v1/send-gallery-upload-email";
const SUPABASE_URL = Deno.env.get("URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const validPaylod = {
    email: "dev.codeblooded@gmail.com",
    name: "Test User",
    URL: "https://localhost:5173/login",
    sessionDate: "February 21, 2026"
};

/* TEST 1: Wrong HTTP Method */
Deno.test("returns 405 if method is NOT POST", async () => {
    const response = await fetch(FUNCTION_URL, {
        method: "GET"
    });
    assertEquals(response.status, 405);
    await response.body?.cancel();
    console.log("PASSED");
});

/* TEST 2: Missing email field */
Deno.test("returns 400 if email is missing", async () => {
    const response = await fetch (FUNCTION_URL, {
        method: "POST",
        headers : { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: undefined,
            name: "test user",
            URL: "https://localhost:5173/login",
            sessionDate: "February 21, 2026"
        }),
    });
    assertEquals(response.status, 400);
    await response.body?.cancel();
    console.log ("PASSED");
});

/* TEST 3: Missing URL field */
Deno.test("returns 400 if URL is missing", async () => {
    const response = await fetch (FUNCTION_URL, {
        method: "POST",
        headers : { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: "dev.codeblooded@gmail.com",
            name: "test user",
            URL: undefined,
            sessionDate: "February 21, 2026"
        }),
    });
    assertEquals(response.status, 400);
    await response.body?.cancel();
    console.log ("PASSED");
});

/* TEST 4: Valid request sends email successfully */
Deno.test("returns 200 if URL is present", async () => {
    const response = await fetch (FUNCTION_URL, {
        method: "POST",
        headers : { "Content-Type": "application/json" },
        body: JSON.stringify(validPaylod),
    });
    assertEquals(response.status, 200);
    await response.body?.cancel();
    console.log ("PASSED");
});

/* TEST 5: Email log record is created after send */
Deno.test("returns 200 and success true with the valid payload", async () => {
    const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPaylod),
    });

    const body = await response.json();
    assertEquals(response.status, 200);
    assertEquals(body.success, true);
    console.log("PASSED: success=", body.success, "| Resend ID:", body.data?.id);
        });