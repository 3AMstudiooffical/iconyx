import Stripe from "stripe";

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
    }

    const stripe = new Stripe(stripeKey);

    const { plan, userId, email } = req.body || {};

    const priceMap = {
      starter: process.env.ICONYX_PRICE_STARTER,
      pro: process.env.ICONYX_PRICE_PRO,
      studio: process.env.ICONYX_PRICE_STUDIO,
    };

    const planKey = String(plan || "").toLowerCase();
    const priceId = priceMap[planKey];

    if (!priceId) {
      return res.status(400).json({
        error: "Invalid plan. Use starter, pro, or studio.",
        got: plan,
      });
    }

    // Stripe price IDs must start with "price_"
    if (!String(priceId).startsWith("price_")) {
      return res.status(500).json({
        error: "Invalid price id in env var (must start with price_)",
        plan: planKey,
        priceId,
      });
    }

    const siteUrl = process.env.SITE_URL || "https://iconyx.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/?success=1`,
      cancel_url: `${siteUrl}/?canceled=1`,
      metadata: {
        user_id: userId || "",
        plan: planKey,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);

    return res.status(500).json({
      error: err?.raw?.message || err?.message || "Stripe checkout failed",
      type: err?.type || null,
      code: err?.code || null,
    });
  }
}
