export async function onRequestPost({ request, env }) {
  if (!env.DISCORD_WEBHOOK_URL) {
    return new Response(
      JSON.stringify({ error: "Webhook not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const school = String(body.school || "").trim();
  const platform = String(body.platform || "").trim();
  const user = String(body.user || "").trim();
  const password = String(body.password || "").trim(); // instead of password

  const paymentMethod = String(body.paymentMethod || "").trim(); // Card/PayPal/Crypto/Cash
  const paymentPlan = String(body.paymentPlan || "").trim();     // Lifetime/One-time
  const runTime = String(body.runTime || "").trim();             // lifetime only (optional on backend)

  const loginType = body.loginType ? String(body.loginType).trim() : "—";

  if (!school || !platform || !user || !password || !paymentMethod || !paymentPlan) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const allowedPayment = new Set(["Card", "PayPal", "Crypto", "Cash"]);
  const allowedPlan = new Set(["Lifetime", "One-time"]);
  if (!allowedPayment.has(paymentMethod) || !allowedPlan.has(paymentPlan)) {
    return new Response(
      JSON.stringify({ error: "Invalid payment fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const amountText = paymentPlan === "Lifetime" ? "$5" : "$1";
  const paymentLabel =
    paymentMethod === "Cash"
      ? "Cash (IRL only — message me on Snap)"
      : paymentMethod;

  const fields = [
    { name: "School", value: school, inline: true },
    { name: "Platform", value: platform, inline: true },
    { name: "Login Type", value: loginType, inline: true },

    { name: "Plan", value: `${paymentPlan} (${amountText})`, inline: true },
    { name: "Payment Method", value: paymentLabel, inline: true },

    { name: "Day & Time", value: runTime || "—", inline: false },

    { name: "Username / Email", value: user, inline: false },
    { name: "password", value: password, inline: false },
  ];

  const payload = {
    content: "@everyone",
    allowed_mentions: { parse: ["everyone"] },
    username: "Requests",
    embeds: [
      {
        title: "New Request",
        color: 0xff4da6,
        fields,
        timestamp: new Date().toISOString(),
      }
    ],
  };

  const discordRes = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!discordRes.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to send to Discord" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { headers: { "Content-Type": "application/json" } }
  );
}
