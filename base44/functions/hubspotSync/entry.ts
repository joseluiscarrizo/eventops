import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, client_id } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("hubspot");

    // Sync a single client to HubSpot (create or update contact + company)
    if (action === 'sync_client') {
      const client = await base44.entities.Client.get(client_id);
      if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

      // Search for existing company by name
      const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: 'name', operator: 'EQ', value: client.name }] }],
          properties: ['name', 'phone', 'description']
        })
      });
      const searchData = await searchRes.json();

      const companyProps = {
        name: client.name,
        phone: client.phone_1 || '',
        description: client.notes || '',
      };

      let companyId;
      if (searchData.results && searchData.results.length > 0) {
        companyId = searchData.results[0].id;
        await fetch(`https://api.hubapi.com/crm/v3/objects/companies/${companyId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: companyProps })
        });
      } else {
        const createRes = await fetch('https://api.hubapi.com/crm/v3/objects/companies', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: companyProps })
        });
        const createData = await createRes.json();
        companyId = createData.id;
      }

      // Sync contact 1
      if (client.email_1 || client.contact_person_1) {
        const contactProps = {
          firstname: client.contact_person_1 || client.name,
          email: client.email_1 || '',
          phone: client.phone_1 || '',
        };
        const contactSearch = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: client.email_1 || '' }] }],
            properties: ['firstname', 'email']
          })
        });
        const contactData = await contactSearch.json();
        let contactId;
        if (contactData.results && contactData.results.length > 0) {
          contactId = contactData.results[0].id;
          await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ properties: contactProps })
          });
        } else {
          const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ properties: contactProps })
          });
          const d = await r.json();
          contactId = d.id;
        }
        // Associate contact with company
        if (contactId && companyId) {
          await fetch(`https://api.hubapi.com/crm/v3/associations/contacts/companies/batch/create`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputs: [{ from: { id: contactId }, to: { id: companyId }, type: 'contact_to_company' }]
            })
          });
        }
      }

      // Save hubspot_company_id on client
      await base44.entities.Client.update(client_id, { hubspot_company_id: companyId });

      return Response.json({ success: true, hubspot_company_id: companyId });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});