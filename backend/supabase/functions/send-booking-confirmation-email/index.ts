import { Resend } from "resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SERVICE_ROLE_KEY") ?? ""
)

const TZ = "America/Los_Angeles";

function parseTimestamp(isoString: string): Date {
  // normalize "+00" to "+00:00" so Date() can parse it
  const normalized = isoString.replace(/([+-]\d{2})$/, "$1:00");
  return new Date(normalized);
}
function formatDate(isoString: string): string {
    const date = parseTimestamp(isoString);
    return date.toLocaleDateString("en-US", {
        timeZone: TZ,
        month: "long",
        day: "2-digit",
        year: "numeric",
    });
}

function formatTime(isoString: string): string {
    const time = parseTimestamp(isoString);
    return time.toLocaleTimeString("en-US", {
        timeZone: TZ,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

Deno.serve(async (req: Request) => {
    if(req.method !== "POST") {
        return new Response("method not allowed", {status: 405})
    }
    let email = "";
    try {
        const body = await req.json();
        const { name, startAt, endAt, location, sessionType, status, notes} = body;
        // console.log("RAW VALUES:", JSON.stringify({ startAt, endAt }));
        
        email = body.email ?? "";

        // validate required fields
        const missingFields: string[] = [];
       if(!email) {
        missingFields.push("email");
       }
       if(!name) {
        missingFields.push("name");
       }
       if(!startAt) {
        missingFields.push("startAt");
       }
       if(!endAt) {
        missingFields.push("endAt");
       }
       if(!sessionType) {
        missingFields.push("sessionType");
       }
       if(missingFields.length > 0) {
        return new Response(
            JSON.stringify({ error: `Missing required fields: ${missingFields.join(", ")}`}),
            {status: 400, headers: {"Content-Type": "application/json" }}
        );
       }

       // format date and time from raw time stamp values
       const sessionDate = formatDate(startAt);
       const sessionTime = `${formatTime(startAt)} - ${formatTime(endAt)}`;
       
            const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta name="color-scheme" content="light only" />
            <meta name="supported-color-schemes" content="light only" />
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Georgia, serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
            <tr>
            <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            max-width: 600px;
            width: 100%;
            ">
            <tr>
            <td style="background-color: #446780; padding: 32px 40px; text-align: center;">
            <p style="margin: 0 0 4px 0; color: #c8a97e; font-size: 14px; letter-spacing: 3px; text-transform: uppercase;">
            Your Roots Photography
            </p>
            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: normal; letter-spacing: 1px;">
            Booking Request Received!
            </h1>
            </td>
            </tr>
            <tr>
            <td style="padding: 40px 40px 32px 40px;">
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #2c2c2c;">
            Hi <strong><span style="color: #2c2c2c; text-decoration: none;">${name}</span></strong>,
            </p>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #4a4a4a; line-height: 1.7;">
            Thank you for submitting your session booking request with Your Roots Photography.
            Here is a summary of your request. Bailey will be in touch shortly to confirm session details! You will not be charged until Bailey confirms your session details and your session is officially booked. 
            Once confirmed, you'll receive a follow-up email with remaining payment details and final session information.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb;">
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Session Type</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${sessionType}</span>
            </td>
            </tr>
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Location</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${location ?? "Not Provided"}</span>
            </td>
            </tr>
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Date</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${sessionDate}</span>
            </td>
            </tr>
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Time</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${sessionTime}</span>
            </td>
            </tr>
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Special Requests / Notes</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${notes || "None"}</span>
            </td>
            </tr>
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Status</span><br/>
            <div style="display: inline-block; margin-top: 6px; background-color: #f9f6f2; border-left: 3px solid #c8a97e; 
            padding: 8px 14px; font-size: 14px; color: #4a4a4a; font-style: italic;">${status ?? "Pending Admin Approval"}
            </div>
            </td>
            </tr>
            </table>
            <p style="text-align: center; margin-top: 24px; font-size: 14px; color: #446780; text-transform: uppercase; letter-spacing: 2px;">
            What Happens Next
            </p>
            <p style="text-align: center; margin-bottom: 1px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
            Bailey will review your request and reach out within 2-4 business days to confirm your session details. <br/>
            <strong>Reminder: Your deposit will not be charged until Bailey confirms your session details.</strong>
            </p>
            </td>
            </tr>
            <tr>
            <td style="background-color: #446780; padding: 24px 40px; text-align: center;">
            <p style="margin: 0 0 4px 0; color: #c8a97e; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">
            Your Roots Photography
            </p>
            <p style="margin: 0; color: #a9b4ca; font-size: 12px;">
            Questions? Contact me at your.rootsphotography@gmail.com
            </p>
            </td>
            </tr>
            </table>
            </td>
            </tr>
            </table>
            </body>
            </html>
            `;
            const { data, error } = await resend.emails.send({
                from: "Your Roots Photography <info@yourrootsphotography.space>",
                to: email,
                subject: "Booking Request Received! - Your Roots Photography",
                html,
            });

            // now logs FAILED emails sent to client in the user_email_log table
            if (error) {
            await supabase.from("user_email_log").insert({
                email_address: email,
                email_type: "user_booking_request_received_email",
                status: "Failed",
                sent_at: new Date().toISOString(),
                error_message: JSON.stringify(error),
            });
            return new Response(JSON.stringify({ error }), { status: 500, headers:{ "Content-Type": "application/json" }});
        }

            // log SUCCESSFUL email send to the user_email_log table
            await supabase.from("user_email_log").insert({
                email_address: email, 
                email_type: "user_booking_request_received_email",
                status: "Sent",
                sent_at: new Date().toISOString(),
                error_message: null,
            });

            return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (err) {
        // now logs unexpected failure if we have an email address to log against
        if(email) {
            await supabase.from("user_email_log").insert({
                email_address: email,
                email_type: "admin_new_booking_request",
                status: "Failed",
                sent_at: new Date().toISOString(),
                error_message: err instanceof Error ? err.message : "Unknown Error",
            });
        }
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});