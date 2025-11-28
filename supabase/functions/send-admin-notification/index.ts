import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
      });
    }

    const SENDGRID_KEY = Deno.env.get("SENDGRID_KEY");

    if (!SENDGRID_KEY) {
      return new Response(JSON.stringify({ error: "Missing SENDGRID_KEY" }), {
        status: 500,
      });
    }

    const subject = "Admin Notification";
    const html = `
      <h2>Hello!</h2>
      <p>The admin has sent you a new notification.</p>
      <p>This is a test email sent from PBMS.</p>
    `;

    // Send email through SendGrid
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: "admin@pbms.com" }, // MUST be verified in SendGrid
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ message: "Email sent!" }), {
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        details: err.message ?? "Unknown error",
      }),
      { status: 500 }
    );
  }
});
