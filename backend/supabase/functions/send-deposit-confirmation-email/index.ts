// NOT USED as of 4/26/26

// import { Resend } from "resend";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
// const supabase = createClient(
//     Deno.env.get("SUPABASE_URL") ?? "",
//     Deno.env.get("SERVICE_ROLE_KEY") ?? ""
// )

// Deno.serve(async (req: Request) => {
//     if (req.method !== "POST") {
//         return new Response("method not allowed", { status: 405 })
//     }

//     try {
//         const { email, firstName, sessionType, depositPaid, paymentDate, checkoutID } = await req.json();

//         if (!email) {
//             return new Response(
//                 JSON.stringify({ error: "Missing required fields: adminEmail" }),
//                 { status: 400, headers: { "Content-Type": "application/json" } });
//         }

//         const html = `
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//         <meta charset="UTF-8" />
//         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//         </head>
//         <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Georgia, serif;">
//         <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
//         <tr>
//         <td align="center">
//         <table width="600" cellpadding="0" cellspacing="0" style="
//         background-color: #ffffff;
//         border-radius: 10px;
//         overflow: hidden;
//         max-width: 600px;
//         width: 100%;
//         ">
//         <tr>
//         <td style="background-color: #446780; padding: 32px 40px; text-align: center;">
//         <p style="margin: 0 0 4px 0; color: #c8a97e; font-size: 14px; letter-spacing: 3px; text-transform: uppercase;">
//         Your Roots Photography
//         </p>
//         <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: normal; letter-spacing: 1px;">
//         Deposit For Session Received
//         </h1>
//         </td>
//         </tr>
//         <tr>
//         <td style="padding: 40px 40px 32px 40px;">
//         <p style="margin: 0 0 24px 0; font-size: 16px; color: #2c2c2c;">
//         Hi <strong>${firstName}</strong>,
//         </p>
//         <p style="margin: 0 0 28px 0; font-size: 15px; color: #4a4a4a; line-height: 1.7;">
//         Thank you for your deposit. This email serves as your official receipt
//         confirmation of your deposit for your <strong>Your Roots Photography</strong> session.
//         </p>
//         <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e5e7eb; margin-bottom: 28px;">
//         <tr>
//         <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
//         <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Session Type</span><br/>
//         <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${sessionType ?? 'N/A'}</span>
//         </td>
//         </tr>
//         <tr>
//         <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
//         <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Deposit Paid</span><br/>
//         <span style="font-size: 20px; color: #2c2c2c; font-weight: bold; margin-top: 4px; display: block;">$${depositPaid ?? '0.00'}</span>
//         </td>
//         </tr>
//         <tr>
//         <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
//         <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Payment Date</span><br/>
//         <span style="font-size: 15px; color: #2c2c2c; margin-top: 4px; display: block;">${paymentDate ?? 'N/A'}</span>
//         </td>
//         </tr>
//         <tr>
//         <td style="padding: 12px 0;">
//         <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Checkout ID</span><br/>
//         <span style="font-size: 13px; color: #6b7280; margin-top: 4px; display: block; word-break: break-all;">${checkoutID ?? 'N/A'}</span>
//         </td>
//         </tr>
//         </table>
//         <div style="
//         display: inline-block;
//         background-color: #f9f6f2;
//         border-left: 3px solid #c8a97e;
//         padding: 8px 14px;
//         font-size: 14px;
//         color: #4a4a4a;
//         font-style: italic;
//         margin-bottom: 28px;
//         ">
//         Deposit Confirmed
//         </div>
//         <div style="text-align: center; margin: 32px 0;">
//         <a href="${Deno.env.get("CLIENT_BASE_URL")}/dashboard" style="
//         display: inline-block;
//         background-color: #446780;
//         color: #ffffff;
//         text-decoration: none;
//         padding: 14px 36px;
//         border-radius: 4px;
//         font-size: 14px;
//         letter-spacing: 2px;
//         text-transform: uppercase;
//         font-family: Georgia, serif;
//         ">
//         View My Dashboard
//         </a>
//         </div>
//         <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.6;">
//         Please keep this email for your records. If you have any questions
//         about this deposit, feel free to reach out below.
//         </p>
//         </td>
//         </tr>
//         <tr>
//         <td style="background-color: #446780; padding: 24px 40px; text-align: center;">
//         <p style="margin: 0 0 4px 0; color: #c8a97e; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">
//         Your Roots Photography
//         </p>
//         <p style="margin: 0; color: #a9b4ca; font-size: 12px;">
//         Questions? Contact me at
//         <span style="color: #a9b4ca; text-decoration: none;">your.rootsphotography@gmail.com</span>
//         </p>
//         </td>
//         </tr>
//         </table>
//         </td>
//         </tr>
//         </table>
//         </body>
//         </html>
//         `;
        
//         const { data, error } = await resend.emails.send({
//             from: "Your Roots Photography <noreply@yourrootsphotography.space>",
//             to: email,
//             subject: `Deposit Confirmed`,
//             html,
//         });

//         if (error) {
//             return new Response(JSON.stringify({ error }), { status: 500 });
//         }

//         // log successful email send to the user_email_log table
//         await supabase.from("user_email_log").insert({
//             email_address: email,
//             email_type: "client_session_deposit_confirmation",
//             status: "Sent",
//             sent_at: new Date().toISOString(),
//             error_message: null,
//         });

//         return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });

//     } catch (err) {
//         return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
//     }
// });