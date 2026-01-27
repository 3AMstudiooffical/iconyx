export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    return res.status(500).json({ ok: false, error: "Server env missing" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing token" });
  }

  try {
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    const user = await userResp.json();

    if (!userResp.ok || !user?.id) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const profResp = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=credits`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    const prof = await profResp.json();

    if (!profResp.ok) {
      return res.status(500).json({ ok: false, error: prof });
    }

    return res.status(200).json({
      ok: true,
      user: { id: user.id, email: user.email },
      credits: prof?.[0]?.credits ?? 0,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
