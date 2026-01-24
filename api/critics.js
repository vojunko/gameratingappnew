import fetch from "node-fetch";
import { getAccessToken } from "./_igdb.js";

const CLIENT_ID = process.env.IGDB_CLIENT_ID;

export default async function handler(req, res) {
  try {
    const idsParam = req.query.ids;
    if (!idsParam) return res.status(200).json([]);

    const ids = idsParam
      .split(",")
      .map(s => parseInt(s, 10))
      .filter(Boolean);

    if (!ids.length) return res.status(200).json([]);

    const token = await getAccessToken();

    const body = `where id = (${ids.join(",")}); fields id,aggregated_rating; limit ${ids.length};`;

    const igdbRes = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": CLIENT_ID,
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "Content-Type": "text/plain",
      },
      body,
    });

    if (!igdbRes.ok) {
      const text = await igdbRes.text();
      return res.status(500).json({ error: "IGDB API error", text });
    }

    const data = await igdbRes.json();

    const result = data.map(g => ({
      id: g.id,
      critic: typeof g.aggregated_rating === 'number'
        ? Math.round(g.aggregated_rating)
        : null
    }));

    res.status(200).json(result);

  } catch (e) {
    console.error("Critics error:", e);
    res.status(500).json({ error: e.message });
  }
}
