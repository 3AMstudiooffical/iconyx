import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false, // IMPORTANT: Stripe needs raw body for signature verification
  },
};

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sig = req.headers["stripe-signature"];
    if (!sig) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    const rawBody = await buffer(req);

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verify failed:", err?.message || err);
      return res.status(400).send(`Webhook Error: ${err?.message || "Bad signature"}`);
    }

    // Only handle successful payments
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const userId = session?.metadata?.user_id;
      const plan = session?.metadata?.plan;

      if (!userId || !plan) {
        console.error("Missing metadata:", { userId, plan });
        return res.status(200).json({ received: true });
      }

      const creditsByPlan = {
        starter: 50,
        pro: 150,
        studio: 400,
      };

      const addCredits = creditsByPlan[String(plan).toLowerCase()] || 0;
      if (!addCredits) {
        console.error("Unknown plan:", plan);
        return res.status(200).json({ received: true });
      }

      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Update credits atomically (uses SQL increment)
      const { data, error } = await supabase.rpc("add_credits", {
        p_user_id: userId,
        p_amount: addCredits,
      });

      if (error) {
        console.error("Supabase add_credits failed:", error);
        return res.status(500).json({ error: "Credits update failed" });
      }

      console.log("Credits added:", { userId, plan, addCredits, data });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
