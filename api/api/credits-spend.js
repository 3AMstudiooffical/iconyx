export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !ANON_KEY) {
    return res.status(500).json({ ok: false, error: "Server env missing" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing token" });
  }

  try {
    const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/spend_credit`, {
      method: "POST",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    const text = await rpcResp.text();

    if (!rpcResp.ok) {
      return res.status(400).json({ ok: false, error: text });
    }

    const newCredits = JSON.parse(text);

    return res.status(200).json({ ok: true, credits: newCredits });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
