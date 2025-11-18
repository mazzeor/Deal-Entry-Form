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
    let response;

    // Company search - using v2 API
    if (action === 'search_companies') {
      hubspotUrl = `https://api.hubapi.com/companies/v2/companies/paged?hapikey=${HUBSPOT_API_KEY}&properties=name&properties=domain&properties=city&properties=state&limit=100`;
      
      response = await fetch(hubspotUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HubSpot API error:', response.status, errorText);
        return res.status(response.status).json({ 
          error: 'HubSpot API error',
          details: errorText,
          status: response.status
        });
      }

      const data = await response.json();
      
      // Filter companies by query on the server side
      const filteredCompanies = data.companies
        .filter(company => {
          const name = company.properties.name?.value || '';
          return name.toLowerCase().includes(query.toLowerCase());
        })
        .slice(0, 10)
        .map(company => ({
          id: company.companyId,
          properties: {
            name: company.properties.name?.value || '',
            domain: company.properties.domain?.value || '',
            city: company.properties.city?.value || '',
            state: company.properties.state?.value || ''
          }
        }));

      return res.status(200).json({ 
        results: filteredCompanies 
      });
    } 
    
    // Contact search - using v1 API
    else if (action === 'search_contacts') {
      hubspotUrl = `https://api.hubapi.com/contacts/v1/lists/all/contacts/all?hapikey=${HUBSPOT_API_KEY}&property=firstname&property=lastname&property=email&count=100`;
      
      response = await fetch(hubspotUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HubSpot API error:', response.status, errorText);
        return res.status(response.status).json({ 
          error: 'HubSpot API error',
          details: errorText,
          status: response.status
        });
      }

      const data = await response.json();
      
      // Filter contacts by query
      const filteredContacts = data.contacts
        .filter(contact => {
          const email = contact.properties.email?.value || '';
          const firstname = contact.properties.firstname?.value || '';
          const lastname = contact.properties.lastname?.value || '';
          const searchText = `${firstname} ${lastname} ${email}`.toLowerCase();
          return searchText.includes(query.toLowerCase());
        })
        .slice(0, 10)
        .map(contact => ({
          id: contact.vid,
          properties: {
            firstname: contact.properties.firstname?.value || '',
            lastname: contact.properties.lastname?.value || '',
            email: contact.properties.email?.value || ''
          }
        }));

      return res.status(200).json({ 
        results: filteredContacts 
      });
    }
    
    // Owner search
    else if (action === 'search_owners') {
      hubspotUrl = `https://api.hubapi.com/crm/v3/owners?hapikey=${HUBSPOT_API_KEY}&limit=100`;
      
      response = await fetch(hubspotUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HubSpot API error:', response.status, errorText);
        return res.status(response.status).json({ 
          error: 'HubSpot API error',
          details: errorText,
          status: response.status
        });
      }

      const data = await response.json();
      
      // Filter owners by query
      const filteredOwners = data.results
        .filter(owner => {
          const name = `${owner.firstName || ''} ${owner.lastName || ''}`.toLowerCase();
          return name.includes(query.toLowerCase());
        })
        .slice(0, 10);

      return res.status(200).json({ 
        results: filteredOwners 
      });
    }
    else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
}