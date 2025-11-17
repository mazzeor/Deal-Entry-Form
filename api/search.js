export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, query } = req.body;
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

  // Check API key exists
  if (!HUBSPOT_API_KEY) {
    console.error('HUBSPOT_API_KEY not found');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    let hubspotUrl;
    let searchBody;

    // Company search
    if (action === 'search_companies') {
      hubspotUrl = 'https://api.hubapi.com/crm/v3/objects/companies/search';
      searchBody = {
        filterGroups: [{
          filters: [{
            propertyName: 'name',
            operator: 'CONTAINS_TOKEN',
            value: query
          }]
        }],
        properties: ['name', 'domain', 'city', 'state'],
        limit: 10
      };
    } 
    // Contact search
    else if (action === 'search_contacts') {
      hubspotUrl = 'https://api.hubapi.com/crm/v3/objects/contacts/search';
      searchBody = {
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'CONTAINS_TOKEN',
            value: query
          }]
        }],
        properties: ['firstname', 'lastname', 'email'],
        limit: 10
      };
    }
    // Owner search
    else if (action === 'search_owners') {
      hubspotUrl = `https://api.hubapi.com/crm/v3/owners?limit=100`;
      searchBody = null; // Owners use GET, no body
    }
    else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Make request to HubSpot
    const response = await fetch(hubspotUrl, {
      method: action === 'search_owners' ? 'GET' : 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: searchBody ? JSON.stringify(searchBody) : undefined
    });

    // Check if request was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HubSpot API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'HubSpot API error',
        details: errorText 
      });
    }

    const data = await response.json();

    // Return results
    return res.status(200).json(data);

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
}