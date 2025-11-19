// api/search.js

// Get a fresh HubSpot access token using the refresh token
async function getHubSpotAccessToken() {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  const refreshToken = process.env.HUBSPOT_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("Missing HubSpot OAuth env vars");
    throw new Error("HubSpot OAuth is not configured");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Failed to refresh HubSpot token:", text);
    throw new Error("Failed to refresh HubSpot token");
  }

  const data = await res.json();
  return data.access_token;
}

// Helper for HubSpot CRM search using full-text "query"
async function hubspotSearch(objectType, query, properties) {
  const accessToken = await getHubSpotAccessToken();

  const url = `https://api.hubapi.com/crm/v3/objects/${objectType}/search`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: query || "",
      properties,
      limit: 10,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `HubSpot ${objectType} search error:`,
      res.status,
      text
    );
    throw new Error(`HubSpot ${objectType} search error`);
  }

  return res.json();
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, query } = req.body || {};

  if (!action) {
    return res.status(400).json({ error: "Missing action" });
  }

  try {
    // ================= COMPANIES =================
    if (action === "search_companies") {
      const data = await hubspotSearch("companies", query, [
        "name",
        "domain",
        "city",
        "state",
      ]);

      const results = (data.results || []).map((company) => ({
        id: company.id,
        name: company.properties?.name || "",
        domain: company.properties?.domain || "",
        location: [
          company.properties?.city || "",
          company.properties?.state || "",
        ]
          .filter(Boolean)
          .join(", "),
      }));

      return res.status(200).json({ results });
    }

    // ================= CONTACTS =================
    if (action === "search_contacts") {
      const data = await hubspotSearch("contacts", query, [
        "firstname",
        "lastname",
        "email",
      ]);

      const results = (data.results || []).map((contact) => ({
        id: contact.id,
        firstname: contact.properties?.firstname || "",
        lastname: contact.properties?.lastname || "",
        email: contact.properties?.email || "",
      }));

      return res.status(200).json({ results });
    }

    // ================= OWNERS =================
    if (action === "search_owners") {
      const accessToken = await getHubSpotAccessToken();

      const url = "https://api.hubapi.com/crm/v3/owners?limit=100";

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("HubSpot owners API error:", response.status, text);
        return res.status(response.status).json({
          error: "HubSpot API error",
          details: text,
          status: response.status,
        });
      }

      const data = await response.json();
      const q = (query || "").toLowerCase();

      const results = (data.results || [])
        .filter((owner) => {
          const fullName = `${owner.firstName || ""} ${
            owner.lastName || ""
          }`.toLowerCase();
          const email = (owner.email || "").toLowerCase();
          return q ? `${fullName} ${email}`.includes(q) : true;
        })
        .slice(0, 10)
        .map((owner) => ({
          id: owner.id,
          firstname: owner.firstName || "",
          lastname: owner.lastName || "",
          email: owner.email || "",
        }));

      return res.status(200).json({ results });
    }

    // Unknown action
    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({
      error: "Search failed",
      message: err.message || "Unknown error",
    });
  }
}