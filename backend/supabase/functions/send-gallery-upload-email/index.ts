import { Resend } from "resend";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SERVICE_ROLE_KEY") ?? ""
)

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {

    const { email, name, URL, sessionDate, coverPhotoUrl, personalizedMessage } = await req.json();

    if (!email || !URL) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and URL" }),
        { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const coverPhotoBlock = coverPhotoUrl
      ? `<img
    src="${coverPhotoUrl}"
    alt="preview from your photoshoot"
    style="width: 100%;
    max-width:560px;
    height: auto;
    border-radius: 8px;
    display: block;
    margin: 0 auto 24px auto;"
    />`
      : "";

    const messageBlock = personalizedMessage
      ? `<div style =" 
    background-color: #f9f6f2;
    border-left: 3px solid #c8a97e;
    padding: 16px 20px;
    margin-bottom: 24px;
    border-radius: 0 6px 6px 0;
    ">
    <p style="
    margin: 0;
    font-size: 15px; color: #4a4a4a; 
    line-height: 1.6; 
    font-style: italic;">
    ${personalizedMessage}
    </p>
    </div>`
      : "";

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Georgia, serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
    <td align="center">
    <table width="600px" cellpadding="0" cellspacing="0" style="
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
    Your Gallery Is Ready!
    </h1>
    </td>
    </tr>
    <tr>
    <td style="padding: 40px 40px 32px 40px;">
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #2c2c2c;">
    Hi <strong>${name}</strong>,
    </p>
    <p style="margin: 0 0 28px 0; font-size: 16px; color: #4a4a4a; line-height: 1.7;">
    Your photos from <strong>${sessionDate}</strong> are now available. 
    I hope you love them as much as I loved capturing them!
    </p>
    ${coverPhotoBlock}
    ${messageBlock}
    <div style="text-align: center; margin: 32px;">
    <a href="${URL}" style="
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
    mso-padding-alt: 0;
    ">
    View My Gallery
    </a>
    </div>
    <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.6;">
    If you have any questions or need assistance, feel free to send me an email found below. I'm here to help!
    </p>
    </td>
    </tr>
    <tr>
    <td style="background-color:#446780; padding: 24px 40px; text-align: center;">
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
      subject: "Your Photos Are Ready!",
      html,
    });

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    // log successful email send to user_email_log table
    await supabase.from("user_email_log").insert({
      email_address: email,
      email_type: "user_gallery_upload_email",
      status: "Sent",
      sent_at: new Date().toISOString(),
      error_message: null,
    });

    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});