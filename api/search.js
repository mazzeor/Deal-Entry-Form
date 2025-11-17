// This runs on Vercel's server (not in the browser)
// It safely connects to HubSpot with your API key

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the search type and query from the request
  const { type, query } = req.body;

  // Your HubSpot API key (we'll add this in a moment)
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

  if (!HUBSPOT_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    let hubspotUrl;

    // Determine which HubSpot endpoint to search
    if (type === 'company') {
      hubspotUrl = `https://api.hubapi.com/crm/v3/objects/companies/search`;
    } else if (type === 'contact') {
      hubspotUrl = `https://api.hubapi.com/crm/v3/objects/contacts/search`;
    } else if (type === 'owner') {
      hubspotUrl = `https://api.hubapi.com/crm/v3/owners`;
    } else {
      return res.status(400).json({ error: 'Invalid search type' });
    }

    // Search HubSpot
    const response = await fetch(hubspotUrl, {
      method: type === 'owner' ? 'GET' : 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: type === 'owner' ? undefined : JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: type === 'company' ? 'name' : 'email',
            operator: 'CONTAINS_TOKEN',
            value: query
          }]
        }],
        properties: type === 'company' 
          ? ['name', 'domain'] 
          : ['firstname', 'lastname', 'email'],
        limit: 10
      })
    });

    const data = await response.json();

    // Return results to the form
    return res.status(200).json(data);

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
}