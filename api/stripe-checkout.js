import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover",
    });

    const { priceId, userId, email } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ error: "Missing priceId or userId" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.SITE_URL}/?success=1`,
      cancel_url: `${process.env.SITE_URL}/?canceled=1`,
      metadata: {
        user_id: userId,
      },
    });

    return res.json({ url: session.url });
 } catch (err) {
  console.error("Stripe checkout error:", err);

  const message =
    err?.raw?.message ||
    err?.message ||
    "Stripe checkout failed";

  return res.status(500).json({
    error: message,
    type: err?.type || null,
    code: err?.code || null
  });
}

