import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover",
    });

   const { plan, userId, email } = req.body || {};

const priceMap = {
  starter: process.env.ICONYX_PRICE_STARTER,
  pro: process.env.ICONYX_PRICE_PRO,
  studio: process.env.ICONYX_PRICE_STUDIO
};

const priceId = priceMap[String(plan || "").toLowerCase()];

if (!priceId) {
  return res.status(400).json({
    error: "Invalid plan. Use starter, pro, or studio."
  });
}


