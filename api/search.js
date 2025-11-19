// api/search.js

// Helper: get a fresh HubSpot access token using the refresh token
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
    const accessToken = await getHubSpotAccessToken();
    let hubspotUrl;
    let response;

    // ========= COMPANY SEARCH (v3, token match) =========
    if (action === "search_companies") {
      hubspotUrl = "https://api.hubapi.com/crm/v3/objects/companies/search";

      // use first word as token
      const raw = (query || "").trim();
      const parts = raw.split(/\s+/);
      const searchValue = parts[0] || raw;

      response = await fetch(hubspotUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "name",
                  operator: "CONTAINS_TOKEN", // valid operator
                  value: searchValue,
                },
              ],
            },
          ],
          properties: ["name", "domain", "city", "state"],
          limit: 10,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "HubSpot companies search error:",
          response.status,
          errorText
        );
        return res.status(response.status).json({
          error: "HubSpot API error",
          details: errorText,
          status: response.status,
        });
      }

      const data = await response.json();

      const results =
        (data.results || []).map((company) => ({
          id: company.id,
          name: company.properties?.name || "",
          domain: company.properties?.domain || "",
          location: [
            company.properties?.city || "",
            company.properties?.state || "",
          ]
            .filter(Boolean)
            .join(", "),
        })) || [];

      return res.status(200).json({ results });
    }

    // ========= CONTACT SEARCH (v3, name + email, first word) =========
    if (action === "search_contacts") {
      hubspotUrl = "https://api.hubapi.com/crm/v3/objects/contacts/search";

      // take the FIRST word so "Jason Bla" still searches "Jason"
      const raw = (query || "").trim();
      const parts = raw.split(/\s+/);
      const searchValue = parts[0] || raw;

      response = await fetch(hubspotUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              // firstname == token
              filters: [
                {
                  propertyName: "firstname",
                  operator: "CONTAINS_TOKEN",
                  value: searchValue,
                },
              ],
            },
            {
              // lastname == token
              filters: [
                {
                  propertyName: "lastname",
                  operator: "CONTAINS_TOKEN",
                  value: searchValue,
                },
              ],
            },
            {
              // email contains that token (e.g. "jason")
              filters: [
                {
                  propertyName: "email",
                  operator: "CONTAINS_TOKEN",
                  value: searchValue,
                },
              ],
            },
          ],
          properties: ["firstname", "lastname", "email"],
          limit: 10,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "HubSpot contacts search error:",
          response.status,
          errorText
        );
        return res.status(response.status).json({
          error: "HubSpot API error",
          details: errorText,
          status: response.status,
        });
      }

      const data = await response.json();

      const results =
        (data.results || []).map((contact) => ({
          id: contact.id,
          firstname: contact.properties?.firstname || "",
          lastname: contact.properties?.lastname || "",
          email: contact.properties?.email || "",
        })) || [];

      return res.status(200).json({ results });
    }

    // ========= OWNER SEARCH (filtered) =========
    if (action === "search_owners") {
      hubspotUrl = "https://api.hubapi.com/crm/v3/owners?limit=100";

      response = await fetch(hubspotUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "HubSpot owners API error:",
          response.status,
          errorText
        );
        return res.status(response.status).json({
          error: "HubSpot API error",
          details: errorText,
          status: response.status,
        });
      }

      const data = await response.json();

      const q = (query || "").toLowerCase();

      const results =
        (data.results || [])
          .filter((owner) => {
            const fullName = `${owner.firstName || ""} ${
              owner.lastName || ""
            }`.toLowerCase();
            const email = (owner.email || "").toLowerCase();
            const searchText = `${fullName} ${email}`;
            return q ? searchText.includes(q) : true;
          })
          .slice(0, 10)
          .map((owner) => ({
            id: owner.id,
            firstname: owner.firstName || "",
            lastname: owner.lastName || "",
            email: owner.email || "",
          })) || [];

      return res.status(200).json({ results });
    }

    // Unknown action
    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      error: "Search failed",
      message: error.message || "Unknown error",
    });
  }
}