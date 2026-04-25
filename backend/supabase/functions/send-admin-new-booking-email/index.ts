import { Resend } from "resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatDate, formatTime } from "../_shared/utils.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SERVICE_ROLE_KEY") ?? ""
)

Deno.serve(async (req: Request) => {
    if (req.method !== "POST") {
        return new Response("method not allowed", { status: 405 })
    }

    let adminEmail = "";
    try {
        const body = await req.json();
        const { clientName, clientEmail, clientPhone, startAt, endAt, location, sessionType, notes } = body;
        
        adminEmail = body.adminEmail ?? ""

        // validate rewuired fields
       const missingFields: string[] = [];
       if(!adminEmail) {
        missingFields.push("adminEmail");
       }
       if(!clientName) {
        missingFields.push("clientName");
       }
       if(!clientEmail) {
        missingFields.push("clientEmail");
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

        const adminBaseURL = Deno.env.get("CLIENT_BASE_URL") ?? "";
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
            New Booking Request
            </h1>
            </td>
            </tr>
            <tr>
            <td style="padding: 40px 40px 32px 40px;">
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #2c2c2c;">
            Hi <strong>Bailey</strong>,
            </p>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #4a4a4a; line-height: 1.7;">
            You have received a new session booking request. Here are the details below.
            </p>
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #446780; text-transform: uppercase; letter-spacing: 2px;">
            Client Information
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; margin-bottom: 28px;">
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Name</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${clientName}</span>
            </td>
            </tr>
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Email</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${clientEmail}</span>
            </td>
            </tr>
            <tr>
            <td style="padding: 12px 0;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Phone</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${clientPhone ?? "Not Provided"}</span>
            </td>
            </tr>
            </table>
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #446780; text-transform: uppercase; letter-spacing: 2px;">
            Session Details
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; margin-bottom: 28px;">
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Type</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${sessionType}</span>
            </td>
            </tr>
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Location</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${location ?? "Not provided"}</span>
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
            <td style="padding: 12px 0;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Status</span><br/>
            <div style="
            display: inline-block;
            margin-top: 6px;
            background-color: #f9f6f2;
            border-left: 3px solid #c8a97e;
            padding: 8px 14px;
            font-size: 14px;
            color: #4a4a4a;
            font-style: italic;
            ">
            Pending Your Approval
            </div>
            </td>
            </tr>
            </table>
            <div style="text-align: center; margin: 32px 0;">
            <a href="${adminBaseURL}/admin/sessions" style="
            display: inline-block;
            background-color: #446780;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 4px;
            font-size: 14px;
            letter-spacing: 2px;
            text-transform: uppercase;
            font-family: Georgia, serif;
            ">
            Review in Dashboard
            </a>
            </div>
            <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.6;">
            Log in to your admin dashboard to confirm or reschedule this session.
            </p>
            </td>
            </tr>
            <tr>
            <td style="background-color: #446780; padding: 24px 40px; text-align: center;">
            <p style="margin: 0 0 4px 0; color: #c8a97e; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">
            Your Roots Photography
            </p>
            <p style="margin: 0; color: #a9b4ca; font-size: 12px;">
            This is an automated notification from your booking system.
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
            from: "Your Roots Photography <noreply@yourrootsphotography.space>",
            to: adminEmail,
            subject: `New Booking Request - ${clientName} - ${sessionDate}`,
            html,
        });

        // now logs FAILED emails sent to admin in the user_email_log table
        if (error) {
            await supabase.from("user_email_log").insert({
                email_address: adminEmail,
                email_type: "admin_new_booking_request",
                status: "Failed",
                sent_at: new Date().toISOString(),
                error_message: JSON.stringify(error),
            });
            return new Response(JSON.stringify({ error }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        // log SUCCESSFUL email send to admin in the user_email_log table
        await supabase.from("user_email_log").insert({
            email_address: adminEmail,
            email_type: "admin_new_booking_request",
            status: "Sent",
            sent_at: new Date().toISOString(),
            error_message: null,
        });

        return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (err) {
        // now logs unexpected failure if we have an email address to log against
        console.error("Caught error:", err instanceof Error ? err.message : String(err));
        if(adminEmail) {
            await supabase.from("user_email_log").insert({
                email_address: adminEmail,
                email_type: "admin_new_booking_request",
                status: "Failed",
                sent_at: new Date().toISOString(),
                error_message: err instanceof Error ? err.message : "Unknown Error",
            });
        }
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});