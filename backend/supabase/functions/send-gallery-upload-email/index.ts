import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    
    const { email, name, URL, sessionDate } = await req.json();

    if (!email || !URL) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and URL" }),
         { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { data, error } = await resend.emails.send({
      from: "Your Roots Photography <noreply@yourrootsphotography.space>",
      to: email,
      subject: "Your Photos Are Ready!",
      html: `
        <h1>Hi ${name}, your gallery is ready!</h1>
        <p>Your photos from <strong>${sessionDate}</strong> are now available.</p>
        <p>Log in to your dashboard to view your gallery.</p>
        <p>
          <a href="${URL}" style="
            background-color: #000;
            color: #fff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
          ">
            View My Gallery
          </a>
        </p>
      `,
    });

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});