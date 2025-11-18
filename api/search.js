// api/search.js

// Helper to get a fresh HubSpot access token using OAuth refresh token
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
  // CORS — you technically don't need this when frontend + API are same origin,
  // but leaving it in does not hurt.
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

    // ========= COMPANY SEARCH =========
    if (action === "search_companies") {
      // Legacy v2 companies endpoint, but using OAuth Bearer token
      hubspotUrl =
        "https://api.hubapi.com/companies/v2/companies/paged" +
        "?properties=name&properties=domain&properties=city&properties=state&limit=100";

      response = await fetch(hubspotUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HubSpot companies API error:", response.status, errorText);
        return res.status(response.status).json({
          error: "HubSpot API error",
          details: errorText,
          status: response.status,
        });
      }

      const data = await response.json();

      const filteredCompanies = (data.companies || [])
        .filter((company) => {
          const name = company.properties?.name?.value || "";
          return query
            ? name.toLowerCase().includes(query.toLowerCase())
            : true;
        })
        .slice(0, 10)
        .map((company) => ({
          id: company.companyId,
          name: company.properties?.name?.value || "",
          domain: company.properties?.domain?.value || "",
          location: [
            company.properties?.city?.value || "",
            company.properties?.state?.value || "",
          ]
            .filter(Boolean)
            .join(", "),
        }));

      return res.status(200).json({ results: filteredCompanies });
    }

    // ========= CONTACT SEARCH =========
    if (action === "search_contacts") {
      // Legacy v1 contacts endpoint with OAuth
      hubspotUrl =
        "https://api.hubapi.com/contacts/v1/lists/all/contacts/all" +
        "?property=firstname&property=lastname&property=email&count=100";

      response = await fetch(hubspotUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HubSpot contacts API error:", response.status, errorText);
        return res.status(response.status).json({
          error: "HubSpot API error",
          details: errorText,
          status: response.status,
        });
      }

      const data = await response.json();

      const filteredContacts = (data.contacts || [])
        .filter((contact) => {
          const email = contact.properties?.email?.value || "";
          const firstname = contact.properties?.firstname?.value || "";
          const lastname = contact.properties?.lastname?.value || "";
          const searchText = `${firstname} ${lastname} ${email}`.toLowerCase();
          return query ? searchText.includes(query.toLowerCase()) : true;
        })
        .slice(0, 10)
        .map((contact) => ({
          id: contact.vid,
          firstname: contact.properties?.firstname?.value || "",
          lastname: contact.properties?.lastname?.value || "",
          email: contact.properties?.email?.value || "",
        }));

      return res.status(200).json({ results: filteredContacts });
    }

    // ========= OWNER SEARCH =========
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
        console.error("HubSpot owners API error:", response.status, errorText);
        return res.status(response.status).json({
          error: "HubSpot API error",
          details: errorText,
          status: response.status,
        });
      }

      const data = await response.json();

      const filteredOwners = (data.results || [])
        .filter((owner) => {
          const fullName = `${owner.firstName || ""} ${
            owner.lastName || ""
          }`.toLowerCase();
          return query ? fullName.includes(query.toLowerCase()) : true;
        })
        .slice(0, 10)
        .map((owner) => ({
          id: owner.id,
          firstname: owner.firstName || "",
          lastname: owner.lastName || "",
          email: owner.email || "",
        }));

      return res.status(200).json({ results: filteredOwners });
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