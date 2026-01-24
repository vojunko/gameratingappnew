import fetch from "node-fetch";
import { getAccessToken } from "./_igdb.js";

const CLIENT_ID = process.env.IGDB_CLIENT_ID;

export default async function handler(req, res) {
  const query = req.query.query;
  if (!query) return res.status(200).json([]);

  try {
    const token = await getAccessToken();

    const igdbRes = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": CLIENT_ID,
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "Content-Type": "text/plain",
      },
      body: `search "${query}"; fields name,cover.image_id,first_release_date,aggregated_rating; limit 10;`,
    });

    if (!igdbRes.ok) {
      const text = await igdbRes.text();
      return res.status(500).json({ error: "IGDB API error", text });
    }

    const games = await igdbRes.json();

    const formatted = games.map(g => ({
      id: g.id,
      name: g.name,
      year: g.first_release_date
        ? new Date(g.first_release_date * 1000).getFullYear()
        : '',
      cover: g.cover
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
        : '',
      critic: typeof g.aggregated_rating === 'number'
        ? Math.round(g.aggregated_rating)
        : null,
    }));

    res.status(200).json(formatted);

  } catch (e) {
    console.error("Search error:", e);
    res.status(500).json({ error: e.message });
  }
}
