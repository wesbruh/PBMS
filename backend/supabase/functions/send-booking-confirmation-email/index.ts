import { Resend } from "resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SERVICE_ROLE_KEY") ?? ""
)

Deno.serve(async (req: Request) => {
    if(req.method !== "POST") {
        return new Response("method not allowed", {status: 405})
    }

    try {
        const { email, name, sessionDate, sessionTime, location, sessionType, status } = await req.json();

        if(!email) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: email" }),
                { status: 400, headers: { "Content-Type": "application/json" } });
            }

            const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
            Booking Request Received
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
            Here is a summary of your request. We will be in touch shortly to confirm!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb;">
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Type</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${sessionType}</span>
            </td>
            </tr>
            <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Location</span><br/>
            <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${location}</span>
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
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Status</span><br/>
            <div style="display: inline-block; margin-top: 6px; background-color: #f9f6f2; border-left: 3px solid #c8a97e; 
            padding: 8px 14px;
            font-size: 14px;
            color: #4a4a4a;
            font-style: italic;
            ">
            ${status}
            
            </div>
            </td>
            </tr>
            </table>
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
                from: "Your Roots Photography <noreply@yourrootsphotography.space>",
                to: email,
                subject: "Booking Request Received!",
                html,
            });

            if (error) {
                return new Response(JSON.stringify({ error }), { status: 500 });
            }

            // log successful email send to the user_email_log table
            await supabase.from("user_email_log").insert({
                email_address: email, 
                email_type: "booking_request_confirmation_email",
                status: "Sent",
                sent_at: new Date().toISOString(),
                error_message: null,
            });

            return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json"} });

    } catch (err) {
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500});
    }
});