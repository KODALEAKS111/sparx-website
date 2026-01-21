export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DISCORD_WEBHOOK_URL) {
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const platform = String(body.platform || "").trim();
  const user = String(body.user || "").trim();
  const loginType = body.loginType ? String(body.loginType).trim() : "—";
  const school = body.school ? String(body.school).trim() : "—";

  // NEW: payment preference (not processing)
  const paymentMethodRaw = String(body.paymentMethod || "").trim().toLowerCase();
  const paymentNote = body.paymentNote ? String(body.paymentNote).trim() : "";

  // Validate payment method
  const allowedMethods = new Set(["card", "crypto", "paypal"]);
  const paymentMethod = allowedMethods.has(paymentMethodRaw) ? paymentMethodRaw : "";

  // If you still need "password" for legitimate reasons, keep it.
  // If not required, remove it from required fields and embed for safety.
  const password = String(body.password || "").trim();

  if (!password || !platform || !user) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!paymentMethod) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid paymentMethod (card|crypto|paypal)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const embedFields = [
    { name: "Platform", value: platform, inline: true },
    { name: "Login Type", value: loginType, inline: true },
    { name: "Payment Method", value: paymentMethod.toUpperCase(), inline: true },
    { name: "User / Email", value: user, inline: false },
    { name: "Password", value: password, inline: false },
  ];

  // Optional extra note (e.g., “I can pay today” / “Need invoice”)
  if (paymentNote) {
    embedFields.push({ name: "Payment Note", value: paymentNote, inline: false });
  }

  // Only include school if Sparx group was used
  if (["sparx", "maths", "reading", "science"].includes(platform.toLowerCase())) {
    embedFields.push({
      name: "School",
      value: school || "—",
      inline: false,
    });
  }

  const payload = {
    username: "Homework Completer",
    embeds: [
      {
        title: "New Homework Request",
        color: 0xff4da6,
        fields: embedFields,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const discordRes = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!discordRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to send webhook" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
